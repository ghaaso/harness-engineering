//! kit-unit: several writers in one project: each unit of work in its own copy and branch, landed one at a time, in
//! the order called, through the project's own check; a landing whose check fails is undone. The check command and
//! the paths come from `<project>/.harness/kit.json` (the kit's `parallel/kit.example.json`).
//!
//!   kit-unit start <name>             [--project DIR]
//!   kit-unit land <name> [test file...] [--project DIR]
//!   kit-unit list                     [--project DIR] [--json]
//!   kit-unit report                   [--project DIR] [--json]
//!
//! The project is the main checkout of the repository the folder belongs to (default: the folder it is called from,
//! so a call from a unit's copy finds the same project).
//! start <name>: makes the branch <unit_prefix><name> from the tip of the landing branch and a copy of it (a git
//!   worktree) at <copies_dir>/<name>; prints the folder. Called again it prints the same folder. The landing branch
//!   is made from the project's HEAD when it does not exist yet (said).
//! land <name> [test file...]: one landing at a time (<project>/.harness/land.lock; a second land is refused, 64).
//!   (1) Re-check: a landing merge of kit-unit on the landing branch that has no line in landings.jsonl (a lander that
//!      ended between merge and line leaves one) runs its check first: pass, its line is written; no result, exit 5,
//!      nothing undone; fail, it is undone when it is the tip, its line, exit 4.
//!   (2) `git merge --no-ff` of the unit's branch in the landing copy (<copies_dir>/_landing, made when missing; never
//!      the project's own checkout). A textual conflict aborts the merge: a line naming the files, exit 2.
//!   (3) The check runs in the landing copy through the queue: check_all, or, when test files are named, each with
//!      check_one (shards as in kit.json), queue_slots of them at once.
//!   (4) Pass: the merge stays, one line, exit 0. Fail: the landing branch goes back to the commit before the merge,
//!      the line names what failed, exit 1. No result (timeout 124, no slot 75): undone too, exit 5. Nothing is pushed.
//! list: the units, each with its branch, its folder and whether it has landed.
//! report: from landings.jsonl: units landed, failed and undone, conflicts, and the seconds waited and run.
//! The line in <project>/.harness/landings.jsonl: {t, unit, branch, kind: land | recheck, merge, pre, tip, exit,
//!   result, check, waited_s, ran_s, undone, failing, conflicts, log}; the check's output is kept in
//!   .harness/landings/.
//! Exit: 0 done or landed; 1 check failed, merge undone; 2 textual conflict, merge aborted; 4 a merge with no line
//! failed its re-check; 5 no result, merge undone; 6 nothing to merge (the unit is already in the landing branch);
//! 64 usage or set-up, nothing changed; 70 internal error.

use kit_core::js;
use kit_queue::json::J;
use kit_queue::kit::{self, Config, KitError, KitResult};
use kit_queue::queue::Verdict;
use kit_queue::sys;
use serde_json::Value;
use std::collections::BTreeMap;
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::process::ExitCode;

const USAGE: &str = "usage: kit-unit start <name> | land <name> [test file...] | list | report   [--project DIR] [--json]";
/// The trailer that marks a landing merge of this program; `unit.mjs` is the one its JavaScript forerunner wrote.
const KIT_TRAILERS: [&str; 2] = ["kit-unit", "unit.mjs"];

fn say(s: &str) {
    sys::err(&format!("unit: {s}\n"));
}

fn main() -> ExitCode {
    let argv: Vec<String> = std::env::args_os()
        .skip(1)
        .map(|a| a.to_string_lossy().into_owned())
        .collect();
    match run(&argv) {
        Ok(code) => ExitCode::from(code),
        Err(e) => {
            say(&e.msg);
            ExitCode::from(e.code)
        }
    }
}

struct C {
    project: PathBuf,
    cfg: Config,
    h: PathBuf,
    landings: PathBuf,
    landing_copy: PathBuf,
    prefix: String,
    branch: String,
    unit: String,
    logs: Option<PathBuf>,
    lines: Vec<Value>,
}

fn setup(project_opt: Option<&str>) -> KitResult<C> {
    let project = kit::resolve_project(project_opt)?;
    let cfg = kit::load_config(&project)?;
    let h = kit::harness_dir(&project);
    Ok(C {
        landings: h.join("landings.jsonl"),
        landing_copy: cfg.copies_dir.join("_landing"),
        prefix: cfg.unit_prefix.clone(),
        branch: cfg.landing_branch.clone(),
        project,
        cfg,
        h,
        unit: String::new(),
        logs: None,
        lines: Vec::new(),
    })
}

fn unit_name_ok(name: &str) -> bool {
    let mut chars = name.chars();
    chars.next().is_some_and(|c| c.is_ascii_alphanumeric())
        && name.chars().count() <= 40
        && chars.all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-'))
}

fn unit_branch(c: &C, name: &str) -> String {
    format!("{}{name}", c.prefix)
}

fn has_branch(c: &C, b: &str) -> KitResult<bool> {
    kit::git_ok(
        &c.project,
        &[
            "rev-parse",
            "-q",
            "--verify",
            &format!("refs/heads/{b}^{{commit}}"),
        ],
    )
}

/// branch -> folder of every worktree of the project
fn worktrees(c: &C) -> KitResult<BTreeMap<String, String>> {
    let mut map = BTreeMap::new();
    let mut cur: Option<String> = None;
    let out = kit::git(&c.project, &["worktree", "list", "--porcelain"], false)?;
    for l in out
        .stdout
        .split('\n')
        .map(|l| l.strip_suffix('\r').unwrap_or(l))
    {
        if let Some(w) = l.strip_prefix("worktree ") {
            cur = Some(w.to_owned());
        } else if let (Some(b), Some(w)) = (l.strip_prefix("branch "), cur.as_ref()) {
            map.insert(
                b.strip_prefix("refs/heads/").unwrap_or(b).to_owned(),
                w.clone(),
            );
        }
    }
    Ok(map)
}

fn ensure_landing_branch(c: &C) -> KitResult<()> {
    if has_branch(c, &c.branch)? {
        return Ok(());
    }
    kit::git(&c.project, &["branch", &c.branch, "HEAD"], false)?;
    say(&format!(
        "made the landing branch {} at the project's HEAD ({})",
        c.branch,
        kit::short(&kit::git_out(&c.project, &["rev-parse", "HEAD"])?)
    ));
    Ok(())
}

// ---- start ----------------------------------------------------------------------------------------------------------
fn start(c: &C, name: &str) -> KitResult<u8> {
    if !unit_name_ok(name) {
        return Err(KitError::new(
            64,
            format!("not a unit name (letters, digits, . _ -, at most 40): {name}"),
        ));
    }
    ensure_landing_branch(c)?;
    let b = unit_branch(c, name);
    let folder = c.cfg.copies_dir.join(name);
    let folder_s = folder.to_string_lossy().into_owned();
    if let Some(w) = worktrees(c)?.get(&b) {
        sys::out(&format!("{w}\n"));
        return Ok(0);
    }
    if folder.exists() {
        return Err(KitError::new(
            64,
            format!("{folder_s} exists and is not the copy of {b}; move it away first"),
        ));
    }
    std::fs::create_dir_all(&c.cfg.copies_dir)?;
    if has_branch(c, &b)? {
        kit::git(&c.project, &["worktree", "add", &folder_s, &b], false)?;
        say(&format!("the branch {b} existed; its copy is made again"));
    } else {
        kit::git(
            &c.project,
            &["worktree", "add", "-b", &b, &folder_s, &c.branch],
            false,
        )?;
    }
    sys::out(&format!("{folder_s}\n"));
    Ok(0)
}

// ---- the record -----------------------------------------------------------------------------------------------------
fn read_lines(file: &Path) -> KitResult<Vec<Value>> {
    let text = match std::fs::read(file) {
        Ok(b) => String::from_utf8_lossy(&b).into_owned(),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => String::new(),
        Err(e) => {
            return Err(KitError::new(
                64,
                format!("cannot read {}: {e}", file.display()),
            ));
        }
    };
    Ok(text
        .split('\n')
        .map(|s| s.strip_suffix('\r').unwrap_or(s))
        .filter(|s| !js::trim(s).is_empty())
        .filter_map(|s| serde_json::from_str::<Value>(s).ok())
        .filter(Value::is_object)
        .collect())
}

fn append_line(c: &mut C, o: &J) -> KitResult<()> {
    let line = o.compact();
    let mut lead = "";
    if let Ok(mut f) = std::fs::File::open(&c.landings) {
        let mut last = [0u8; 1];
        let ends_open =
            f.seek(SeekFrom::End(-1)).is_ok() && f.read_exact(&mut last).is_ok() && &last != b"\n";
        if ends_open {
            lead = "\n";
        }
    }
    let mut f = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&c.landings)?;
    f.write_all(format!("{lead}{line}\n").as_bytes())?;
    f.sync_all()?;
    if let Ok(v) = serde_json::from_str::<Value>(&line) {
        c.lines.push(v);
    }
    sys::out(&format!("{line}\n"));
    Ok(())
}

#[derive(Debug, Clone)]
enum Check {
    All,
    Files(Vec<String>),
}

impl Check {
    fn of(files: Option<&[String]>) -> Self {
        files.map_or(Self::All, |f| Self::Files(f.to_vec()))
    }
    fn json(&self) -> J {
        match self {
            Self::All => J::str("all"),
            Self::Files(f) => J::strs(f),
        }
    }
}

struct Base {
    unit: String,
    kind: &'static str,
    merge: Option<String>,
    pre: Option<String>,
    tip: Option<String>,
    check: Check,
}

struct Failing {
    what: String,
    result: Verdict,
    exit: i32,
    end: String,
}

struct CheckResult {
    result: Verdict,
    failing: Vec<Failing>,
    waited: f64,
    ran: f64,
}

fn record(
    c: &mut C,
    base: &Base,
    exit: u8,
    r: Option<&CheckResult>,
    extra: Vec<(&str, J)>,
) -> KitResult<()> {
    let mut o = J::obj()
        .with("t", J::str(&kit::iso_now()))
        .with("unit", J::str(&base.unit))
        .with("branch", J::str(&c.branch))
        .with("kind", J::str(base.kind))
        .with("merge", base.merge.as_deref().map_or(J::Null, J::str));
    if let Some(p) = &base.pre {
        o = o.with("pre", J::str(p));
    }
    if let Some(t) = &base.tip {
        o = o.with("tip", J::str(t));
    }
    o = o
        .with("exit", J::int(i64::from(exit)))
        .with("result", J::str(r.map_or("not-run", |r| r.result.as_str())))
        .with("check", base.check.json())
        .with("waited_s", J::num(kit::r1(r.map_or(0.0, |r| r.waited))))
        .with("ran_s", J::num(kit::r1(r.map_or(0.0, |r| r.ran))));
    for (k, v) in extra {
        o = o.with(k, v);
    }
    if let Some(r) = r.filter(|r| !r.failing.is_empty()) {
        let list = r
            .failing
            .iter()
            .map(|f| {
                J::obj()
                    .with("what", J::str(&f.what))
                    .with("result", J::str(f.result.as_str()))
                    .with("exit", J::int(i64::from(f.exit)))
                    .with("end", J::str(&f.end))
            })
            .collect();
        o = o.with("failing", J::Arr(list));
    }
    if let Some(l) = &c.logs {
        let rel = l.strip_prefix(&c.h).unwrap_or(l);
        o = o.with("log", J::str(&kit_core::paths::slashes(rel)));
    }
    append_line(c, &o)
}

// ---- lock and landing copy ------------------------------------------------------------------------------------------
/// The landing lock, given back when dropped (only by the process that took it).
struct LandLock {
    dir: PathBuf,
}

impl Drop for LandLock {
    fn drop(&mut self) {
        let ours = std::fs::read_to_string(self.dir.join("owner.json"))
            .ok()
            .and_then(|t| serde_json::from_str::<Value>(&t).ok())
            .and_then(|o| o.get("pid").and_then(Value::as_u64))
            .is_some_and(|p| p == u64::from(std::process::id()));
        if ours {
            std::fs::remove_dir_all(&self.dir).unwrap_or_default();
        }
    }
}

fn lock(c: &C) -> KitResult<LandLock> {
    std::fs::create_dir_all(&c.h)?;
    let l = c.h.join("land.lock");
    let o = l.join("owner.json");
    let max_age_ms = 3600u64
        .saturating_mul(3)
        .max(c.cfg.check_all_timeout_s.saturating_add(3600))
        .saturating_mul(1000);
    for _ in 0..2 {
        match std::fs::create_dir(&l) {
            Ok(()) => {
                let guard = LandLock { dir: l };
                let own = J::obj()
                    .with("pid", J::Num(std::process::id().to_string()))
                    .with("unit", J::str(&c.unit))
                    .with("t", J::str(&kit::iso_now()));
                std::fs::write(&o, own.compact())?;
                return Ok(guard);
            }
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
                let owner = std::fs::read_to_string(&o)
                    .ok()
                    .and_then(|t| serde_json::from_str::<Value>(&t).ok())
                    .filter(Value::is_object);
                let (stale, who) = match owner {
                    Some(ow) => {
                        let who = format!(
                            " (unit {}, process {})",
                            js::display(ow.get("unit")),
                            js::display(ow.get("pid"))
                        );
                        let gone = !ow
                            .get("pid")
                            .and_then(Value::as_u64)
                            .is_some_and(sys::alive);
                        let now = i64::try_from(js::now_ms()).unwrap_or(i64::MAX);
                        let old = ow
                            .get("t")
                            .and_then(Value::as_str)
                            .and_then(js::date_parse)
                            .is_some_and(|t| {
                                now.saturating_sub(t)
                                    > i64::try_from(max_age_ms).unwrap_or(i64::MAX)
                            });
                        (gone || old, who)
                    }
                    None => {
                        let stale = std::fs::metadata(&l)
                            .and_then(|m| m.modified())
                            .ok()
                            .and_then(|t| t.elapsed().ok())
                            .is_none_or(|age| age.as_millis() > 15_000);
                        (stale, String::new())
                    }
                };
                if !stale {
                    return Err(KitError::new(
                        64,
                        format!(
                            "another landing is running{who}; one landing at a time: land again when it has ended"
                        ),
                    ));
                }
                std::fs::remove_dir_all(&l)?;
                say(
                    "broke a stale landing lock (its lander has ended); the re-check covers what it left",
                );
            }
            Err(e) => return Err(e.into()),
        }
    }
    Err(KitError::new(
        64,
        format!("cannot take the landing lock {}", l.display()),
    ))
}

fn ensure_landing_copy(c: &C) -> KitResult<()> {
    let d = &c.landing_copy;
    let ds = d.to_string_lossy().into_owned();
    if kit::canon(d).split('/').any(|n| n == ".claude") {
        return Err(KitError::new(
            64,
            format!("{ds} lies inside a .claude folder; the landing copy must not"),
        ));
    }
    if kit::inside(d, &c.project) {
        return Err(KitError::new(
            64,
            format!("{ds} lies inside the project; the landing copy must lie outside it"),
        ));
    }
    ensure_landing_branch(c)?;
    if !d.exists() {
        if let Some(w) = worktrees(c)?.get(&c.branch) {
            return Err(KitError::new(
                64,
                format!(
                    "the landing branch {} is checked out in {w}; landings happen in a copy of their own: switch that checkout to another branch, or set landing_branch in kit.json to a branch nobody works on",
                    c.branch
                ),
            ));
        }
        if let Some(up) = d.parent() {
            std::fs::create_dir_all(up)?;
        }
        kit::git(&c.project, &["worktree", "add", &ds, &c.branch], false)?;
        say(&format!("made the landing copy {ds} on {}", c.branch));
    }
    let top = kit::git_out(d, &["rev-parse", "--show-toplevel"])?;
    if kit::canon(Path::new(&top)) != kit::canon(d) {
        return Err(KitError::new(
            64,
            format!("{ds} is not the top of a copy (git says {top})"),
        ));
    }
    let common = |x: &Path| -> KitResult<String> {
        Ok(kit::canon(Path::new(&kit::git_out(
            x,
            &["rev-parse", "--path-format=absolute", "--git-common-dir"],
        )?)))
    };
    if common(d)? != common(&c.project)? {
        return Err(KitError::new(
            64,
            format!(
                "{ds} is not a copy of the repository at {}",
                c.project.display()
            ),
        ));
    }
    let head =
        js::trim(&kit::git(d, &["symbolic-ref", "-q", "--short", "HEAD"], true)?.stdout).to_owned();
    if head != c.branch {
        return Err(KitError::new(
            64,
            format!(
                "the landing copy is on {}, not {}",
                if head.is_empty() {
                    "a detached HEAD"
                } else {
                    &head
                },
                c.branch
            ),
        ));
    }
    if kit::git_ok(d, &["rev-parse", "-q", "--verify", "MERGE_HEAD"])? {
        return Err(KitError::new(
            64,
            format!(
                "a merge is in progress in {ds}; nothing done (git merge --abort there, then land again)"
            ),
        ));
    }
    let dirty = kit::git_out(d, &["status", "--porcelain", "--untracked-files=no"])?;
    if !dirty.is_empty() {
        let first: Vec<&str> = dirty.split('\n').take(5).collect();
        return Err(KitError::new(
            64,
            format!(
                "the landing copy has uncommitted changes; nothing done: {}",
                first.join("; ")
            ),
        ));
    }
    Ok(())
}

fn logs_dir(c: &mut C) -> KitResult<PathBuf> {
    if let Some(l) = &c.logs {
        return Ok(l.clone());
    }
    let l = c.h.join("landings").join(format!(
        "{}-{}-{}",
        kit::stamp(),
        c.unit,
        std::process::id()
    ));
    std::fs::create_dir_all(&l)?;
    c.logs = Some(l.clone());
    Ok(l)
}

// ---- the check ------------------------------------------------------------------------------------------------------
/// files None: check_all once; else each file with check_one, queue_slots at once.
fn run_check(c: &mut C, who: &str, files: Option<&[String]>) -> KitResult<CheckResult> {
    let logs = logs_dir(c)?;
    let q = kit::set_slots(&kit::queue_dir(&c.project, "lane"), c.cfg.queue_slots)?;
    let pid = std::process::id();
    let results: Vec<(String, kit_queue::queue::Ran, PathBuf)> = match files {
        None => {
            let log = logs.join("check_all.log");
            let r = kit::lane_run(
                &q,
                &format!("land-{who}-{pid}"),
                &kit::fill_all(&c.cfg),
                &c.landing_copy,
                c.cfg.check_all_timeout_s,
                &log,
            );
            vec![("check_all".to_owned(), r, log)]
        }
        Some(fs) => {
            let ms = kit::members_of(&c.cfg, fs);
            let at = usize::try_from(c.cfg.queue_slots).unwrap_or(1);
            let cfg = &c.cfg;
            let copy = &c.landing_copy;
            let rs = kit::pool(
                &ms,
                at,
                |m| {
                    let log = logs.join(format!("{}.log", kit::safe(&m.id)));
                    let label = format!("land-{who}-{}-{pid}", kit::safe(&m.id));
                    let r = kit::lane_run(&q, &label, &m.argv, copy, cfg.check_one_timeout_s, &log);
                    (r, log)
                },
                |_, _| {},
            );
            ms.into_iter()
                .zip(rs)
                .map(|(m, (r, log))| (m.id, r, log))
                .collect()
        }
    };
    let mut acc = CheckResult {
        result: Verdict::NoResult,
        failing: Vec::new(),
        waited: 0.0,
        ran: 0.0,
    };
    for (id, r, log) in &results {
        acc.waited += r.waited_s;
        acc.ran += r.ran_s;
        if r.verdict() != Verdict::Pass {
            acc.failing.push(Failing {
                what: id.clone(),
                result: r.verdict(),
                exit: r.exit,
                end: kit::last_units(&kit::tail(log, 8), 600),
            });
        }
    }
    acc.result = if results.iter().any(|(_, r, _)| r.verdict() == Verdict::Fail) {
        Verdict::Fail
    } else if results.iter().all(|(_, r, _)| r.verdict() == Verdict::Pass) {
        Verdict::Pass
    } else {
        Verdict::NoResult
    };
    Ok(acc)
}

fn fail_text(r: &CheckResult) -> String {
    let parts: Vec<String> = r
        .failing
        .iter()
        .map(|f| {
            if f.result == Verdict::NoResult {
                format!("{} (no result)", f.what)
            } else {
                format!("{} (exit {})", f.what, f.exit)
            }
        })
        .collect();
    parts.join(", ")
}

// ---- the steps ------------------------------------------------------------------------------------------------------
fn undo(c: &C, merge: &str, pre: &str) -> KitResult<()> {
    let now = kit::git_out(&c.landing_copy, &["rev-parse", "HEAD"])?;
    let copy = c.landing_copy.display();
    if now != merge {
        return Err(KitError::new(
            64,
            format!(
                "{} moved during the landing (at {}, not the merge {}); not undone, look at {copy} by hand",
                c.branch,
                kit::short(&now),
                kit::short(merge)
            ),
        ));
    }
    kit::git(&c.landing_copy, &["reset", "-q", "--hard", pre], false)?;
    if kit::git_out(&c.landing_copy, &["rev-parse", "HEAD"])? != pre {
        return Err(KitError::new(
            64,
            format!(
                "the undo did not bring {} back to {}; look at {copy} by hand",
                c.branch,
                kit::short(pre)
            ),
        ));
    }
    Ok(())
}

fn recorded_by(c: &C, sha: &str) -> bool {
    c.lines.iter().any(|l| {
        l.get("merge").and_then(Value::as_str) == Some(sha)
            && l.get("exit").and_then(Value::as_i64) != Some(5)
    })
}

/// The value of the first line `<key>: <value>` of a commit message whose value passes `ok` (spaces around it
/// dropped).
fn trailer<'a>(body: &'a str, key: &str, ok: impl Fn(&str) -> bool) -> Option<&'a str> {
    body.split('\n')
        .map(|l| l.strip_suffix('\r').unwrap_or(l))
        .filter_map(|l| l.strip_prefix(key))
        .map(|v| v.trim_matches(' '))
        .find(|v| ok(v))
}

struct Unrecorded {
    sha: String,
    pre: Option<String>,
    tip: Option<String>,
    unit: String,
    files: Option<Vec<String>>,
}

fn unrecorded(c: &C) -> KitResult<Vec<Unrecorded>> {
    let raw = kit::git(
        &c.landing_copy,
        &[
            "log",
            "--first-parent",
            "--merges",
            "-n",
            "200",
            "--format=%H%x1f%P%x1f%B%x1e",
            "HEAD",
        ],
        false,
    )?
    .stdout;
    let mut out = Vec::new();
    for rec in raw.split('\u{1e}') {
        let s = rec.trim_start_matches(['\r', '\n']);
        if js::trim(s).is_empty() {
            continue;
        }
        let mut parts = s.splitn(3, '\u{1f}');
        let sha = parts.next().unwrap_or_default().to_owned();
        let parents = parts.next().unwrap_or_default();
        let body = parts.next().unwrap_or_default();
        if trailer(body, "Land-Kit:", |v| KIT_TRAILERS.contains(&v)).is_none() {
            continue; // only merges this program (or its forerunner) made
        }
        let Some(unit) = trailer(body, "Land-Unit:", |v| {
            !v.is_empty() && !v.chars().any(js::is_space)
        }) else {
            continue;
        };
        if recorded_by(c, &sha) {
            continue;
        }
        let files = trailer(body, "Land-Check:", |v| {
            v.starts_with('[') && v.ends_with(']')
        })
        .and_then(|v| serde_json::from_str::<Value>(v).ok())
        .and_then(|v| v.as_array().cloned())
        .filter(|a| !a.is_empty())
        .map(|a| {
            a.iter()
                .map(|f| kit::norm_path(&js::to_string(f)))
                .collect()
        });
        let mut ps = js::trim(parents).split_whitespace().map(str::to_owned);
        out.push(Unrecorded {
            sha,
            pre: ps.next(),
            tip: ps.next(),
            unit: unit.to_owned(),
            files,
        });
    }
    out.reverse();
    Ok(out)
}

fn recheck(c: &mut C) -> KitResult<()> {
    for m in unrecorded(c)? {
        say(&format!(
            "merge {} of {} has no line in landings.jsonl; its check runs first",
            kit::short(&m.sha),
            m.unit
        ));
        let head = kit::git_out(&c.landing_copy, &["rev-parse", "HEAD"])?;
        let r = run_check(c, &format!("recheck-{}", m.unit), m.files.as_deref())?;
        let base = Base {
            unit: m.unit.clone(),
            kind: "recheck",
            merge: Some(m.sha.clone()),
            pre: m.pre.clone(),
            tip: m.tip.clone(),
            check: Check::of(m.files.as_deref()),
        };
        match r.result {
            Verdict::Pass => {
                record(c, &base, 0, Some(&r), vec![("undone", J::Bool(false))])?;
                continue;
            }
            Verdict::NoResult => {
                record(c, &base, 5, Some(&r), vec![("undone", J::Bool(false))])?;
                return Err(KitError::new(
                    5,
                    format!(
                        "the re-check of merge {} ({}) got no result; nothing undone, it is checked again at the next landing",
                        kit::short(&m.sha),
                        m.unit
                    ),
                ));
            }
            Verdict::Fail => {}
        }
        let pre = m.pre.clone().unwrap_or_default();
        let at_tip = head == m.sha;
        if at_tip {
            undo(c, &m.sha, &pre)?;
        }
        record(c, &base, 4, Some(&r), vec![("undone", J::Bool(at_tip))])?;
        let then = if at_tip {
            format!("undone, {} is back at {}", c.branch, kit::short(&pre))
        } else {
            format!(
                "later commits sit on it, so it stays: undo it with git revert -m 1 {}",
                m.sha
            )
        };
        return Err(KitError::new(
            4,
            format!(
                "the re-check of merge {} ({}) failed: {}; {then}",
                kit::short(&m.sha),
                m.unit,
                fail_text(&r)
            ),
        ));
    }
    Ok(())
}

fn land(c: &mut C, name: &str, files: Option<&[String]>) -> KitResult<u8> {
    if !unit_name_ok(name) {
        return Err(KitError::new(64, format!("not a unit name: {name}")));
    }
    c.unit = name.to_owned();
    let b = unit_branch(c, name);
    let _lock = lock(c)?;
    ensure_landing_copy(c)?;
    c.lines = read_lines(&c.landings)?;
    let copy = c.landing_copy.clone();
    let tip = js::trim(
        &kit::git(
            &copy,
            &[
                "rev-parse",
                "-q",
                "--verify",
                &format!("refs/heads/{b}^{{commit}}"),
            ],
            true,
        )?
        .stdout,
    )
    .to_owned();
    if tip.is_empty() {
        return Err(KitError::new(
            64,
            format!("there is no branch {b} (make it with: kit-unit start {name})"),
        ));
    }
    for f in files.unwrap_or_default() {
        if !kit::git_ok(&copy, &["cat-file", "-e", &format!("{tip}:{f}")])? {
            return Err(KitError::new(64, format!("{b} has no file {f}")));
        }
    }
    recheck(c)?;
    if kit::git_ok(&copy, &["merge-base", "--is-ancestor", &tip, "HEAD"])? {
        return Err(KitError::new(
            6,
            format!(
                "{b} ({}) is already in {}; nothing merged, no line written",
                kit::short(&tip),
                c.branch
            ),
        ));
    }
    let pre = kit::git_out(&copy, &["rev-parse", "HEAD"])?;
    let msg = logs_dir(c)?.join("merge-message.txt");
    let check_text = files.map_or_else(|| "all".to_owned(), |f| J::strs(f).compact());
    std::fs::write(
        &msg,
        format!(
            "land: merge {b} into {}\n\nLand-Unit: {name}\nLand-Check: {check_text}\nLand-Kit: kit-unit\n",
            c.branch
        ),
    )?;
    let msg_s = msg.to_string_lossy().into_owned();
    let mr = kit::git(
        &copy,
        &[
            "merge",
            "--no-ff",
            "--no-edit",
            "--no-log",
            "-F",
            &msg_s,
            &format!("refs/heads/{b}"),
        ],
        true,
    )?;
    let mut base = Base {
        unit: name.to_owned(),
        kind: "land",
        merge: None,
        pre: Some(pre.clone()),
        tip: Some(tip.clone()),
        check: Check::of(files),
    };
    if !mr.ok {
        let unmerged: Vec<String> =
            kit::git(&copy, &["diff", "--name-only", "--diff-filter=U"], true)?
                .stdout
                .split('\n')
                .map(|s| js::trim(s).to_owned())
                .filter(|s| !s.is_empty())
                .collect();
        if kit::git_ok(&copy, &["rev-parse", "-q", "--verify", "MERGE_HEAD"])? {
            kit::git(&copy, &["merge", "--abort"], false)?;
        }
        if kit::git_out(&copy, &["rev-parse", "HEAD"])? != pre
            || !kit::git_out(&copy, &["status", "--porcelain", "--untracked-files=no"])?.is_empty()
        {
            return Err(KitError::new(
                64,
                format!(
                    "git merge {b} failed and the landing copy is not back at {}; look at {} by hand",
                    kit::short(&pre),
                    copy.display()
                ),
            ));
        }
        if unmerged.is_empty() {
            let text = if mr.stderr.is_empty() {
                &mr.stdout
            } else {
                &mr.stderr
            };
            let first: Vec<&str> = js::trim(text).split('\n').take(4).collect();
            return Err(KitError::new(
                64,
                format!(
                    "git merge {b} failed without a conflict; nothing changed: {}",
                    first.join(" | ")
                ),
            ));
        }
        record(
            c,
            &base,
            2,
            None,
            vec![
                ("aborted", J::Bool(true)),
                ("conflicts", J::strs(&unmerged)),
            ],
        )?;
        return Err(KitError::new(
            2,
            format!(
                "textual conflict merging {b} ({}); the merge is aborted, {} unchanged at {}; the unit goes back to its builder (merge {} into {b} in its copy, then land again)",
                unmerged.join(", "),
                c.branch,
                kit::short(&pre),
                c.branch
            ),
        ));
    }
    let merge = kit::git_out(&copy, &["rev-parse", "HEAD"])?;
    let listed = kit::git_out(&copy, &["rev-list", "--parents", "-n", "1", &merge])?;
    let parents: Vec<&str> = listed.split_whitespace().skip(1).collect();
    if parents != [pre.as_str(), tip.as_str()] {
        return Err(KitError::new(
            70,
            format!(
                "the merge {} does not have the parents {} and {}; left for the next landing's re-check",
                kit::short(&merge),
                kit::short(&pre),
                kit::short(&tip)
            ),
        ));
    }
    say(&format!(
        "merged {b} ({}) into {} at {}; running the check ({})",
        kit::short(&tip),
        c.branch,
        kit::short(&merge),
        files.map_or_else(
            || "check_all".to_owned(),
            |f| format!("{} file(s)", f.len())
        )
    ));
    let r = run_check(c, name, files)?;
    base.merge = Some(merge.clone());
    if r.result == Verdict::Pass {
        let changed: Vec<String> = kit::git(
            &copy,
            &["status", "--porcelain", "--untracked-files=no"],
            false,
        )?
        .stdout
        .split('\n')
        .filter(|l| !js::trim(l).is_empty())
        .map(|l| l.chars().skip(3).collect())
        .collect();
        let mut extra = vec![("undone", J::Bool(false))];
        if !changed.is_empty() {
            kit::git(&copy, &["reset", "-q", "--hard", "HEAD"], false)?;
            say(&format!(
                "the check changed tracked files in the landing copy; put back: {}",
                changed.join(", ")
            ));
            extra.push(("dirtied", J::strs(&changed)));
        }
        record(c, &base, 0, Some(&r), extra)?;
        say(&format!(
            "{b} landed on {} at {} (pre {}); waited {} s, ran {} s",
            c.branch,
            kit::short(&merge),
            kit::short(&pre),
            kit::r1s(r.waited),
            kit::r1s(r.ran)
        ));
        return Ok(0);
    }
    undo(c, &merge, &pre)?; // undone before its line: a stop between the two leaves no failing merge on the branch
    let code: u8 = if r.result == Verdict::Fail { 1 } else { 5 };
    record(c, &base, code, Some(&r), vec![("undone", J::Bool(true))])?;
    let logs = c
        .logs
        .as_ref()
        .map(|l| l.display().to_string())
        .unwrap_or_default();
    Err(KitError::new(
        code,
        if code == 1 {
            format!(
                "{b} failed the check: {}; the merge is undone ({} back at {}); the unit goes back to its builder (logs: {logs})",
                fail_text(&r),
                c.branch,
                kit::short(&pre)
            )
        } else {
            format!(
                "no result for {b} (timeout, or no queue slot): {}; the merge is undone ({} back at {}); land it again later",
                fail_text(&r),
                c.branch,
                kit::short(&pre)
            )
        },
    ))
}

// ---- list and report ------------------------------------------------------------------------------------------------
fn exit_is(l: &Value, n: i64) -> bool {
    l.get("exit").and_then(Value::as_i64) == Some(n)
}

fn list(c: &C, json: bool) -> KitResult<u8> {
    let wt = worktrees(c)?;
    let lines = read_lines(&c.landings)?;
    let refs = kit::git(
        &c.project,
        &[
            "for-each-ref",
            "--format=%(refname) %(objectname)",
            "refs/heads/",
        ],
        false,
    )?
    .stdout;
    let has_landing = has_branch(c, &c.branch)?;
    let mut rows: Vec<(String, String, Option<String>, bool, String)> = Vec::new();
    for l in refs.split('\n').filter(|l| !l.is_empty()) {
        let mut parts = js::trim(l).split(' ');
        let rf = parts.next().unwrap_or_default();
        let sha = parts.next().unwrap_or_default();
        let b = rf.strip_prefix("refs/heads/").unwrap_or(rf);
        let Some(name) = b.strip_prefix(c.prefix.as_str()).filter(|n| !n.is_empty()) else {
            continue;
        };
        if b == c.branch {
            continue;
        }
        let landed = has_landing
            && kit::git_ok(&c.project, &["merge-base", "--is-ancestor", sha, &c.branch])?;
        let last = lines.iter().rev().find(|x| {
            x.get("unit").and_then(Value::as_str) == Some(name)
                && x.get("kind").and_then(Value::as_str) == Some("land")
        });
        let state = if landed {
            "landed"
        } else {
            match last {
                None => "not landed",
                Some(x) if exit_is(x, 2) => "not landed (conflict)",
                Some(x) if exit_is(x, 1) => "not landed (check failed, undone)",
                Some(x) if exit_is(x, 5) => "not landed (no result, undone)",
                Some(_) => "not landed",
            }
        };
        rows.push((
            name.to_owned(),
            b.to_owned(),
            wt.get(b).cloned(),
            landed,
            state.to_owned(),
        ));
    }
    if json {
        let arr = rows
            .iter()
            .map(|(unit, branch, folder, landed, state)| {
                J::obj()
                    .with("unit", J::str(unit))
                    .with("branch", J::str(branch))
                    .with("folder", folder.as_deref().map_or(J::Null, J::str))
                    .with("landed", J::Bool(*landed))
                    .with("state", J::str(state))
            })
            .collect();
        sys::out(&format!("{}\n", J::Arr(arr).pretty(1)));
        return Ok(0);
    }
    if rows.is_empty() {
        sys::out(&format!("no units (branches {}*)\n", c.prefix));
        return Ok(0);
    }
    let w = rows.iter().map(|r| js::len(&r.0)).max().unwrap_or(0).max(4);
    let mut text = String::new();
    for (unit, branch, folder, _, state) in &rows {
        text.push_str(&format!(
            "{}  {}  {branch}  {}\n",
            kit::pad_end(unit, w),
            kit::pad_end(state, 34),
            folder.as_deref().unwrap_or("(no copy)")
        ));
    }
    sys::out(&text);
    Ok(0)
}

fn report(c: &C, json: bool) -> KitResult<u8> {
    let lines = read_lines(&c.landings)?;
    let units = |f: &dyn Fn(&Value) -> bool| -> Vec<Value> {
        let mut seen: Vec<Value> = Vec::new();
        for l in lines.iter().filter(|l| f(l)) {
            let u = l.get("unit").cloned().unwrap_or(Value::Null);
            if !seen.contains(&u) {
                seen.push(u);
            }
        }
        seen
    };
    let undone = |l: &Value| l.get("undone").is_some_and(js::truthy);
    let landed = units(&|l| exit_is(l, 0));
    let failed_undone = units(&|l| (exit_is(l, 1) || exit_is(l, 4)) && undone(l));
    let failed_left = units(&|l| exit_is(l, 4) && !undone(l));
    let no_result_undone = units(&|l| exit_is(l, 5) && undone(l));
    let conflicts: Vec<(Value, Vec<Value>)> = lines
        .iter()
        .filter(|l| exit_is(l, 2))
        .map(|l| {
            let files = l
                .get("conflicts")
                .filter(|v| js::truthy(v))
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
            (l.get("unit").cloned().unwrap_or(Value::Null), files)
        })
        .collect();
    let rechecks = lines
        .iter()
        .filter(|l| l.get("kind").and_then(Value::as_str) == Some("recheck"))
        .count();
    let sum = |k: &str| -> f64 {
        lines
            .iter()
            .map(|l| {
                l.get(k)
                    .and_then(Value::as_f64)
                    .filter(|x| x.is_finite())
                    .unwrap_or(0.0)
            })
            .sum()
    };
    let waited_s = kit::r1(sum("waited_s"));
    let ran_s = kit::r1(sum("ran_s"));
    let n_lines = i64::try_from(lines.len()).unwrap_or(i64::MAX);
    if json {
        let arr = |v: &[Value]| J::Arr(v.iter().map(J::from_value).collect());
        let s = J::obj()
            .with("lines", J::int(n_lines))
            .with("landed", arr(&landed))
            .with("failed_undone", arr(&failed_undone))
            .with("failed_left", arr(&failed_left))
            .with("no_result_undone", arr(&no_result_undone))
            .with(
                "conflicts",
                J::Arr(
                    conflicts
                        .iter()
                        .map(|(u, f)| {
                            J::obj()
                                .with("unit", J::from_value(u))
                                .with("files", arr(f))
                        })
                        .collect(),
                ),
            )
            .with(
                "rechecks",
                J::int(i64::try_from(rechecks).unwrap_or(i64::MAX)),
            )
            .with("waited_s", J::num(waited_s))
            .with("ran_s", J::num(ran_s));
        sys::out(&format!("{}\n", s.pretty(1)));
        return Ok(0);
    }
    let names = |a: &[Value]| -> String {
        let t: Vec<String> = a.iter().map(js::to_string).collect();
        if t.is_empty() {
            "0".to_owned()
        } else {
            format!("{}: {}", t.len(), t.join(", "))
        }
    };
    let mut out = vec![
        format!(
            "landings recorded: {} ({})",
            lines.len(),
            c.landings.display()
        ),
        format!("landed: {}", names(&landed)),
        format!("check failed, undone: {}", names(&failed_undone)),
    ];
    if !failed_left.is_empty() {
        out.push(format!(
            "check failed, left in place (git revert -m 1): {}",
            names(&failed_left)
        ));
    }
    out.push(format!("no result, undone: {}", names(&no_result_undone)));
    let conflict_text = if conflicts.is_empty() {
        "0".to_owned()
    } else {
        let each: Vec<String> = conflicts
            .iter()
            .map(|(u, f)| {
                let fs: Vec<String> = f.iter().map(js::to_string).collect();
                format!("{} ({})", js::to_string(u), fs.join(", "))
            })
            .collect();
        format!("{}: {}", conflicts.len(), each.join("; "))
    };
    out.push(format!("conflicts (merge aborted): {conflict_text}"));
    out.push(format!("re-checks: {rechecks}"));
    out.push(format!(
        "seconds waited for the queue: {}; seconds the checks ran: {}",
        js::number_to_string(waited_s),
        js::number_to_string(ran_s)
    ));
    sys::out(&format!("{}\n", out.join("\n")));
    Ok(0)
}

fn run(argv: &[String]) -> KitResult<u8> {
    let a = kit::parse_args(argv, &["project"], &["json"])?;
    let verb = a.pos.first().map(String::as_str).unwrap_or_default();
    if !["start", "land", "list", "report"].contains(&verb) {
        return Err(KitError::new(64, USAGE));
    }
    let mut c = setup(a.value("project"))?;
    kit::notice_once(&c.project, "unit", kit::NOTICE);
    let name = a.pos.get(1).map(String::as_str).unwrap_or_default();
    match verb {
        "start" => {
            if a.pos.len() != 2 {
                return Err(KitError::new(64, USAGE));
            }
            start(&c, name)
        }
        "land" => {
            let mut files: Vec<String> = Vec::new();
            for f in a.pos.iter().skip(2).map(|f| kit::norm_path(f)) {
                if !files.contains(&f) {
                    files.push(f);
                }
            }
            for f in &files {
                if f.is_empty()
                    || f.starts_with('/')
                    || Path::new(f).is_absolute()
                    || f.split('/').any(|p| p == "..")
                {
                    return Err(KitError::new(
                        64,
                        format!(
                            "a test file is a path inside the project, relative to its top: {f}"
                        ),
                    ));
                }
            }
            let named = (!files.is_empty()).then_some(files.as_slice());
            land(&mut c, name, named)
        }
        _ => {
            if a.pos.len() != 1 {
                return Err(KitError::new(64, USAGE));
            }
            if verb == "list" {
                list(&c, a.flag("json"))
            } else {
                report(&c, a.flag("json"))
            }
        }
    }
}
