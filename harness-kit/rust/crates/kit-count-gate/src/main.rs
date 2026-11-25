//! kit-count-gate: the port of `.claude/hooks/count-gate.mjs` (PreToolUse on Agent, Task and SendMessage).
//!
//! Counts the helpers running in a session from the app's own files (`<session>/subagents/agent-<id>.meta.json` and
//! `.jsonl`), helpers of helpers included, plus the starts admitted in the last 16.7 s that have not shown yet, and
//! refuses (exit 2, one line) a start or a revival that would pass the app's limit (20, or
//! `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`) or a width or hold declared in `research-tree/build/WIDTHS.md`
//! (`<project>/.harness/WIDTHS.md` with `--harness-kit`). A declaration that does not parse refuses every start.
//! An error while counting lets the start through and logs it; unreadable input passes. Log and lock:
//! `count-gate.jsonl` and `count-gate.lock` in the logs folder. By hand:
//! `kit-count-gate --end <agent id> <why>` and `kit-count-gate --status <session id or its first characters>`.
//! The reasoning behind every number is in the JavaScript hook's header.

mod count;
mod text;
mod widths;

use count::{APP_LIMIT, Clock, Count, Entry, Logbook, T_QUIET_MS};
use kit_core::context::Context;
use kit_core::input::{self, Input};
use kit_core::js;
use kit_core::log::Record;
use kit_core::outcome::Outcome;
use serde_json::Value;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::Instant;
use text::{W, clip, cut, glob, lossy, nf, norm, norm_agent, short, truthy, uf};
use widths::{Decl, Kind};

fn main() -> std::process::ExitCode {
    let ctx = Context::from_env();
    run(&ctx, input::read_stdin, js::now_ms()).finish()
}

/// The log's file name.
const LOG_FILE: &str = "count-gate.jsonl";

/// Where the gate reads and writes.
struct Places {
    /// The clone, or the project in kit mode (the JavaScript's `root`).
    root: PathBuf,
    /// The logs folder.
    logdir: PathBuf,
    /// `WIDTHS.md`.
    widths: PathBuf,
    /// `WIDTHS.md` as named in a refusal.
    widths_rel: &'static str,
    /// Kit mode: this program and the kit arguments, as the command that ends a helper by hand is written in a
    /// refusal (repair F2, 2026-11-26).
    kit_end: Option<KitEnd>,
}

/// The kit form of the command that ends a helper by hand, with this machine's paths.
struct KitEnd {
    /// `"<this program>"`.
    prog: String,
    /// ` --harness-kit "--clone=<clone>" "--project=<project>"`.
    args: String,
}

impl Places {
    fn of(ctx: &Context) -> Self {
        match &ctx.kit {
            Some(k) => Self {
                root: k.project.clone(),
                logdir: ctx.logs(),
                widths: k.state.join("WIDTHS.md"),
                widths_rel: ".harness/WIDTHS.md",
                kit_end: Some(KitEnd {
                    prog: format!(
                        "\"{}\"",
                        std::env::current_exe()
                            .map(|p| kit_core::paths::slashes(&p))
                            .unwrap_or_else(|_| "kit-count-gate".to_owned())
                    ),
                    args: format!(
                        " --harness-kit \"--clone={}\" \"--project={}\"",
                        kit_core::paths::slashes(&ctx.clone),
                        kit_core::paths::slashes(&k.project)
                    ),
                }),
            },
            None => Self {
                root: ctx.clone.clone(),
                logdir: ctx.logs(),
                widths: ctx
                    .clone
                    .join("research-tree")
                    .join("build")
                    .join("WIDTHS.md"),
                widths_rel: "research-tree/build/WIDTHS.md",
                kit_end: None,
            },
        }
    }

    fn log(&self) -> PathBuf {
        self.logdir.join(LOG_FILE)
    }

    fn lock(&self) -> PathBuf {
        self.logdir.join("count-gate.lock")
    }
}

/// The program's work: `--end`, `--status`, or the hook on the input `read` gives (read only in that mode), at
/// time `now` (ms).
fn run(ctx: &Context, read: impl FnOnce() -> Input, now: u64) -> Outcome {
    let places = Places::of(ctx);
    let clock = Clock::new(now);
    match ctx.args.first().map(String::as_str) {
        Some("--end") => end(ctx, &places, &clock),
        Some("--status") => status(ctx, &places, &clock),
        _ => hook(&read(), &places, &clock),
    }
}

/// A log line's first fields: `{ t: Date.now(), ev }` (the JavaScript's `append` puts `t` first).
fn line(clock: &Clock, ev: &str) -> Record {
    Record::new().int("t", clock.ms()).str("ev", ev)
}

/// The record appended to the log; the JavaScript's `append`, which can fail.
fn append(places: &Places, rec: &Record) -> std::io::Result<()> {
    let text = format!("{}\n", rec.to_json());
    std::fs::create_dir_all(&places.logdir)?;
    std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(places.log())?
        .write_all(text.as_bytes())
}

/// The JavaScript's `log`: `append` with every error ignored.
fn log(places: &Places, rec: &Record) {
    append(places, rec).unwrap_or_default();
}

// ---- --end ------------------------------------------------------------------------------------------------------

fn end(ctx: &Context, places: &Places, clock: &Clock) -> Outcome {
    let id = norm_agent(ctx.args.get(1).map_or("", String::as_str));
    let mut words: Vec<String> = ctx
        .args
        .get(2..)
        .map(<[String]>::to_vec)
        .unwrap_or_default();
    if ctx.kit.is_some() {
        // the kit's own arguments are not part of the reason
        let mut i = words.len();
        while i > 0 {
            i = i.saturating_sub(1);
            let next_exists = i.saturating_add(1) < words.len();
            if words.get(i).is_some_and(|w| w == "--project") && next_exists {
                words.drain(i..i.saturating_add(2));
            } else if words.get(i).is_some_and(|w| {
                w.starts_with("--harness-kit")
                    || w.starts_with("--no-usage-tool")
                    || w.starts_with("--project=")
            }) {
                words.remove(i);
            }
        }
    }
    let why = js::trim(&words.join(" ")).to_owned();
    if id.is_empty() || why.is_empty() {
        return Outcome::Fail(
            "usage: node .claude/hooks/count-gate.mjs --end <agent id> <why>".to_owned(),
        );
    }
    let rec = line(clock, "end")
        .str("agent", &id)
        .bool("manual", true)
        .cut("why", &why, 200);
    if let Err(e) = append(places, &rec) {
        let msg = short(&js::utf16(&e.to_string()));
        return Outcome::Fail(format!(
            "count gate: could not write {} ({})",
            places.log().to_string_lossy(),
            lossy(&msg)
        ));
    }
    Outcome::Say(format!(
        "count gate: {id} is counted as ended until it writes again ({})\n",
        lossy(&cut(&why, 80))
    ))
}

// ---- --status ---------------------------------------------------------------------------------------------------

/// `p.replace(/[^A-Za-z0-9]/g, '-')`: every UTF-16 unit that is not an ASCII letter or digit becomes `-`.
fn mangle(p: &Path) -> String {
    let mut out = String::new();
    for c in p.to_string_lossy().chars() {
        if c.is_ascii_alphanumeric() {
            out.push(c);
        } else {
            for _ in 0..c.len_utf16() {
                out.push('-');
            }
        }
    }
    out
}

/// Node's `os.homedir()`: `USERPROFILE` on Windows, `HOME` elsewhere, else the system's answer.
fn homedir() -> PathBuf {
    let var = if cfg!(windows) { "USERPROFILE" } else { "HOME" };
    std::env::var_os(var)
        .filter(|v| !v.is_empty())
        .map(PathBuf::from)
        .or_else(std::env::home_dir)
        .unwrap_or_default()
}

fn status(ctx: &Context, places: &Places, clock: &Clock) -> Outcome {
    let arg = js::trim(ctx.args.get(1).map_or("", String::as_str)).to_owned();
    let home_claude = homedir().join(".claude");
    let proj = home_claude.join("projects").join(mangle(&places.root));
    let projs: Vec<PathBuf> = if ctx.kit.is_some() {
        let config = std::env::var_os("CLAUDE_CONFIG_DIR")
            .filter(|v| !v.is_empty())
            .map(PathBuf::from);
        let mut v: Vec<PathBuf> = Vec::new();
        for p in [places.root.clone(), kit_core::paths::real_of(&places.root)] {
            for c in config.iter().chain(std::iter::once(&home_claude)) {
                let d = kit_core::paths::normalize(&c.join("projects").join(mangle(&p)));
                if !v.contains(&d) {
                    v.push(d);
                }
            }
        }
        v
    } else {
        vec![proj.clone()]
    };
    let mut dir: Option<PathBuf> = None;
    let mut sid = arg.clone();
    if !arg.is_empty() && Path::new(&arg).join("subagents").exists() {
        dir = Some(Path::new(&arg).join("subagents"));
    } else if !arg.is_empty() {
        for pr in &projs {
            let Ok(rd) = std::fs::read_dir(pr) else {
                continue;
            };
            let found = rd
                .filter_map(Result::ok)
                .map(|e| e.file_name().to_string_lossy().into_owned())
                .find(|n| n.starts_with(&arg) && !n.ends_with(".jsonl"));
            if let Some(d) = found {
                dir = Some(pr.join(&d).join("subagents"));
                sid = d;
                break;
            }
        }
    }
    let Some(dir) = dir else {
        return Outcome::Fail(format!(
            "usage: node .claude/hooks/count-gate.mjs --status <session id or prefix> (looked in {})",
            proj.to_string_lossy()
        ));
    };
    let now = uf(clock.ms());
    let t0 = Instant::now();
    let mut book = Logbook::new(places.log());
    let counted = book
        .manual_ends(now)
        .and_then(|ends| count::count(&dir, now, &ends, &sid, &mut book));
    let c = match counted {
        Ok(c) => c,
        Err(e) => return Outcome::Fail(format!("count gate: {e}")),
    };
    let ms = t0.elapsed().as_secs_f64() * 1000.0;
    let mut out = format!(
        "count gate: session {sid}: {} helpers running, {} pending, {} admitted and then refused; limit {} (counted in {} ms over {} meta files)\n",
        c.running.len(),
        c.pending.len(),
        c.refused,
        js::number_to_string(limit()),
        js::to_fixed(ms, 0),
        c.seen
    );
    for r in &c.running {
        let depth = r
            .depth
            .as_ref()
            .filter(|d| !d.is_null())
            .map_or_else(|| "?".to_owned(), js::to_string);
        out.push_str(&format!(
            "  {} depth {depth} silent {} min: {}\n",
            r.label(),
            js::to_fixed(r.silent / 60000.0, 1),
            r.desc
        ));
    }
    for p in &c.pending {
        out.push_str(&format!("  pending {}: {}\n", p.label(), p.desc));
    }
    match widths::declarations(&places.widths) {
        Ok(decl) => {
            for d in &decl {
                out.push_str(&format!("  {} (WIDTHS.md line {})\n", d.text, d.line));
            }
        }
        Err(e) => out.push_str(&format!("  BAD {}\n", lossy(&short(&e)))),
    }
    Outcome::Say(out)
}

// ---- the hook ---------------------------------------------------------------------------------------------------

/// `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` when it is a whole number of at least 1, else 20.
fn limit() -> f64 {
    let v = std::env::var_os("CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS")
        .map_or(f64::NAN, |s| text::str_to_number(&s.to_string_lossy()));
    if v.is_finite() && v.fract() == 0.0 && v >= 1.0 {
        v
    } else {
        uf(APP_LIMIT)
    }
}

/// The hook's `sessionDir`: `<project>/<session>/subagents` from the input's `transcript_path`.
fn session_dir(j: &Value) -> Option<PathBuf> {
    let tp = j
        .get("transcript_path")
        .and_then(Value::as_str)
        .map(js::trim)
        .unwrap_or("");
    let lower = tp.to_ascii_lowercase();
    if tp.is_empty() || !lower.ends_with(".jsonl") {
        return None;
    }
    let p = Path::new(tp);
    // /[\\/]subagents[\\/][^\\/]+\.jsonl$/i
    let seps: &[char] = &['\\', '/'];
    let parent_named_subagents = tp
        .rfind(seps)
        .and_then(|k| tp.get(..k))
        .and_then(|head| {
            head.rfind(seps)
                .and_then(|k| head.get(k.saturating_add(1)..))
        })
        .is_some_and(|name| name.eq_ignore_ascii_case("subagents"));
    let file = tp.rsplit(seps).next().unwrap_or("");
    let parent = p.parent().map(Path::to_path_buf).unwrap_or_default();
    if parent_named_subagents && file.len() > ".jsonl".len() {
        return Some(kit_core::paths::normalize(&parent));
    }
    let stem = file
        .get(..file.len().saturating_sub(".jsonl".len()))
        .unwrap_or("");
    Some(kit_core::paths::normalize(
        &parent.join(stem).join("subagents"),
    ))
}

/// The fields every log line of one input carries (`rec` of the JavaScript).
struct Rec {
    sess: String,
    by: Option<String>,
    tu: Option<String>,
    agent: Option<String>,
    desc: String,
}

impl Rec {
    fn onto(&self, r: Record) -> Record {
        let r = r
            .str("sess", &self.sess)
            .opt_str("by", self.by.as_deref())
            .opt_str("tu", self.tu.as_deref());
        let r = match &self.agent {
            Some(a) => r.str("agent", a),
            None => r,
        };
        r.cut("desc", &norm(&self.desc), 60)
    }
}

/// A why in UTF-16 units as a log field (`JSON.stringify` writes a lone surrogate as `\udxxx`).
fn why_field(r: Record, why: &[u16]) -> Record {
    r.raw("why", js::quote_utf16(why))
}

fn hook(input: &Input, places: &Places, clock: &Clock) -> Outcome {
    let Input::Json(j) = input else {
        return Outcome::Pass;
    };
    if !j.is_object() || j.get("hook_event_name").and_then(Value::as_str) != Some("PreToolUse") {
        return Outcome::Pass;
    }
    let tool = truthy(j.get("tool_name"))
        .map(js::to_string)
        .unwrap_or_default();
    let is_agent = tool == "Agent" || tool == "Task";
    let is_send = tool == "SendMessage";
    if !is_agent && !is_send {
        return Outcome::Pass;
    }
    let empty = Value::Object(serde_json::Map::new());
    let ti = j
        .get("tool_input")
        .filter(|v| v.is_object() || v.is_array())
        .unwrap_or(&empty);
    let sess = j
        .get("session_id")
        .and_then(Value::as_str)
        .map(str::to_owned);
    let by = truthy(j.get("agent_id")).map(|a| norm_agent(&js::to_string(a)));
    let tu = j
        .get("tool_use_id")
        .and_then(Value::as_str)
        .map(str::to_owned);
    let dir = session_dir(j);
    let (Some(dir), Some(sess)) = (dir, sess.clone()) else {
        let rec = line(clock, "error")
            .opt_str("sess", sess.as_deref())
            .opt_str("by", by.as_deref())
            .opt_str("tu", tu.as_deref())
            .str("why", "no transcript_path or session_id: not counted");
        log(places, &rec);
        return Outcome::Pass;
    };
    let mut book = Logbook::new(places.log());

    let mut revive: Option<String> = None;
    let desc = if is_agent {
        match ti.get("description") {
            None | Some(Value::Null) => String::new(),
            Some(v) => js::to_string(v),
        }
    } else {
        // SendMessage: to a helper of this session that has ended it revives it, which takes a slot.
        let to = ti
            .get("to")
            .and_then(Value::as_str)
            .map(|t| norm_agent(text::strip_bracket(t)))
            .unwrap_or_default();
        if !text::is_agent_id(&to) || !dir.join(format!("agent-{to}.meta.json")).exists() {
            return Outcome::Pass;
        }
        let now = uf(clock.ms());
        let counted = book
            .manual_ends(uf(clock.ms()))
            .and_then(|ends| count::count(&dir, now, &ends, &sess, &mut book));
        let Ok(c) = counted else {
            return Outcome::Pass;
        };
        if c.running
            .iter()
            .any(|r| r.id.as_deref() == Some(to.as_str()))
        {
            return Outcome::Pass; // a message to a running helper is only a message
        }
        let m = count::read_meta(&dir, &to);
        revive = Some(to);
        m.as_ref()
            .and_then(|m| truthy(m.get("description")))
            .map(js::to_string)
            .unwrap_or_default()
    };
    let rec = Rec {
        sess: sess.clone(),
        by,
        tu,
        agent: revive.clone(),
        desc: desc.clone(),
    };

    let decl = match widths::declarations(&places.widths) {
        Ok(d) => d,
        Err(e) => {
            let why = W::new()
                .s("count gate: ")
                .s(places.widths_rel)
                .s(" ")
                .u(&short(&e))
                .s("; every start waits until that line is fixed or removed (a width a plan declares is never silently off).")
                .0;
            log(places, &why_field(rec.onto(line(clock, "deny")), &why));
            return Outcome::Refuse(lossy(&why));
        }
    };

    let t0 = clock.ms();
    let lock_path = places.lock();
    if !count::lock(&places.logdir, &lock_path, clock) {
        let wait = clock.ms().saturating_sub(t0);
        let r = rec.onto(line(clock, "error")).int("wait", wait);
        log(places, &r.str("why", "lock not taken in time: not counted"));
        return Outcome::Pass;
    }
    let t_lock = clock.ms();
    let mut why: Option<Vec<u16>> = None;
    let now = uf(clock.ms());
    let counted = book
        .manual_ends(now)
        .and_then(|ends| count::count(&dir, now, &ends, &sess, &mut book));
    match counted {
        Ok(c) => {
            why = decide(
                &c,
                &decl,
                &desc,
                revive.as_deref(),
                &sess,
                places.kit_end.as_ref(),
            );
            let all = c.running.len().saturating_add(c.pending.len());
            let lim = limit();
            let timing = |r: Record| {
                r.int("n", u64::try_from(all).unwrap_or(u64::MAX))
                    .num("limit", lim)
                    .int("wait", t_lock.saturating_sub(t0))
                    .int("hold", clock.ms().saturating_sub(t_lock))
            };
            match &why {
                Some(w) => log(places, &why_field(timing(rec.onto(line(clock, "deny"))), w)),
                None => {
                    if let Err(e) = append(places, &timing(rec.onto(line(clock, "allow")))) {
                        let msg = W::new()
                            .s("count failed: ")
                            .u(&short(&js::utf16(&e.to_string())))
                            .0;
                        log(places, &why_field(rec.onto(line(clock, "error")), &msg));
                    }
                }
            }
        }
        Err(e) => {
            let msg = W::new()
                .s("count failed: ")
                .u(&short(&js::utf16(&e.to_string())))
                .0;
            log(places, &why_field(rec.onto(line(clock, "error")), &msg));
        }
    }
    count::unlock(&lock_path);
    match why {
        Some(w) => Outcome::Refuse(lossy(&w)),
        None => Outcome::Pass,
    }
}

/// The refusal, if any, for a start (or the revival of `revive`) with description `desc`, given the count.
fn decide(
    c: &Count,
    decl: &[Decl],
    desc: &str,
    revive: Option<&str>,
    sess: &str,
    kit_end: Option<&KitEnd>,
) -> Option<Vec<u16>> {
    let all: Vec<&Entry> = c.running.iter().chain(c.pending.iter()).collect();
    let lim = limit();
    let nested = c.running.iter().filter(|r| r.nested()).count();
    // No helper is named for --end: every one counted wrote within T_QUIET, so none is known dead.
    let stale = if c.running.is_empty() {
        W::new()
    } else if let Some(k) = kit_end {
        W::new()
            .s(&format!(
                " A helper that died without ending (an app restart) drops out after {} min silent; to end one at once: {} --end <helper id> \"<why>\"{} (ids and silences: {} --status ",
                js::number_to_string(T_QUIET_MS / 60000.0),
                k.prog,
                k.args,
                k.prog
            ))
            .u(&cut(sess, 8))
            .s(&format!("{}).", k.args))
    } else {
        W::new()
            .s(&format!(
                " A helper that died without ending (an app restart) drops out after {} min silent; to end one at once: node .claude/hooks/count-gate.mjs --end <id> \"<why>\" (ids and silences: --status ",
                js::number_to_string(T_QUIET_MS / 60000.0)
            ))
            .u(&cut(sess, 8))
            .s(").")
    };
    let verb = revive.map_or_else(|| "this start".to_owned(), |r| format!("reviving {r}"));
    let number = all.len().saturating_add(1);
    if nf(number) > lim {
        let just = if c.pending.is_empty() {
            String::new()
        } else {
            format!(" and {} were just admitted", c.pending.len())
        };
        return Some(
            W::new()
                .s(&format!(
                    "count gate: {} helpers run in this session now ({nested} of them started by helpers){just}; the app allows {} at once, helpers of helpers counted (t7-0603), so {verb} would be number {number}. Retry after the next finish notice, not by polling.",
                    c.running.len(),
                    js::number_to_string(lim)
                ))
                .u(&stale.0)
                .0,
        );
    }
    let d = js::utf16(&norm(desc));
    for h in decl {
        let a = js::utf16(&h.a);
        if !glob(&a, &d) {
            continue;
        }
        match &h.kind {
            Kind::Hold(b) => {
                let b16 = js::utf16(b);
                if let Some(hit) = all.iter().find(|r| glob(&b16, &js::utf16(&norm(&r.desc)))) {
                    return Some(
                        W::new()
                            .s(&format!(
                                "count gate: {verb} matches \"{}\", held while \"{b}\" runs (WIDTHS.md line {}: ",
                                h.a, h.line
                            ))
                            .u(&clip(&h.reason))
                            .s(&format!("); running: {} \"", hit.label()))
                            .u(&cut(&hit.desc, 50))
                            .s("\". Retry after its finish notice, not by polling.")
                            .u(&stale.0)
                            .0,
                    );
                }
            }
            Kind::Width(n) => {
                let busy: Vec<&&Entry> = all
                    .iter()
                    .filter(|r| glob(&a, &js::utf16(&norm(&r.desc))))
                    .collect();
                if nf(busy.len().saturating_add(1)) > f64::from(*n) {
                    let names: Vec<String> = busy.iter().take(4).map(|r| r.label()).collect();
                    return Some(
                        W::new()
                            .s(&format!(
                                "count gate: {verb} matches \"{}\", declared width {n} (WIDTHS.md line {}: ",
                                h.a, h.line
                            ))
                            .u(&clip(&h.reason))
                            .s(&format!(
                                "); {} run now ({}). Retry after a finish notice, not by polling.",
                                busy.len(),
                                names.join(", ")
                            ))
                            .u(&stale.0)
                            .0,
                    );
                }
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use kit_core::paths;

    fn ctx(dir: &Path, args: &[&str]) -> Context {
        let mut all = vec![format!("--clone={}", dir.display())];
        all.extend(args.iter().map(|a| (*a).to_owned()));
        Context::from_parts(all, None, &paths::cwd())
    }

    fn tmp(name: &str) -> PathBuf {
        let d =
            std::env::temp_dir().join(format!("kit-count-gate-main-{name}-{}", std::process::id()));
        std::fs::remove_dir_all(&d).unwrap_or_default();
        std::fs::create_dir_all(&d).unwrap_or_default();
        d
    }

    #[test]
    fn a_log_line_starts_with_its_time_and_event() {
        let r = line(&Clock::new(5), "deny").to_json();
        assert!(r.starts_with("{\"t\":5"), "{r}");
    }

    #[test]
    fn the_session_folder_comes_from_the_transcript_path() {
        let j = serde_json::json!({"transcript_path": "C:/p/s1.jsonl"});
        assert_eq!(
            session_dir(&j),
            Some(paths::normalize(Path::new("C:/p/s1/subagents")))
        );
        let j = serde_json::json!({"transcript_path": "C:/p/s1/SubAgents/agent-x.JSONL"});
        assert_eq!(
            session_dir(&j),
            Some(paths::normalize(Path::new("C:/p/s1/SubAgents")))
        );
        assert_eq!(
            session_dir(&serde_json::json!({"transcript_path": "x.txt"})),
            None
        );
    }

    #[test]
    fn end_needs_a_reason_and_writes_the_log_without_the_kit_arguments() {
        let d = tmp("end");
        let project = d.join("p");
        let c = ctx(
            &d,
            &[
                "--end",
                "agent-g",
                "dead",
                "--harness-kit",
                &format!("--project={}", project.display()),
            ],
        );
        let out = run(&c, || Input::Unreadable, 1000);
        let text = std::fs::read_to_string(project.join(".claude").join("logs").join(LOG_FILE))
            .unwrap_or_default();
        let none = run(&ctx(&d, &["--end", "g"]), || Input::Unreadable, 1000)
            .parts()
            .0;
        std::fs::remove_dir_all(&d).unwrap_or_default();
        assert_eq!(
            out.parts().1,
            "count gate: g is counted as ended until it writes again (dead)\n"
        );
        assert!(
            text.ends_with("\"ev\":\"end\",\"agent\":\"g\",\"manual\":true,\"why\":\"dead\"}\n"),
            "{text}"
        );
        assert_eq!(none, 1);
    }

    #[test]
    fn unreadable_input_and_other_tools_pass_without_a_log() {
        let d = tmp("odd");
        let c = ctx(&d, &[]);
        let a = run(&c, || Input::Unreadable, 1000);
        let b = run(
            &c,
            || {
                Input::Json(
                    serde_json::json!({"hook_event_name": "PreToolUse", "tool_name": "Bash"}),
                )
            },
            1000,
        );
        let logged = d.join(".claude").join("logs").join(LOG_FILE).exists();
        std::fs::remove_dir_all(&d).unwrap_or_default();
        assert_eq!((a, b, logged), (Outcome::Pass, Outcome::Pass, false));
    }
}
