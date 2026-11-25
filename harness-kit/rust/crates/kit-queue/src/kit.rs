//! What `kit-check` and `kit-unit` share: the project, its config (`<project>/.harness/kit.json`), git, the list of
//! test files and the runs of each, and running commands through the project's queue (`<project>/.harness/lane`).

use crate::queue::{self, Job, Output, Queue, Ran};
use crate::sys;
use kit_core::regex::Regex;
use kit_core::{js, paths};
use serde_json::Value;
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Mutex, PoisonError};

/// The line shown once per project on the first run of `kit-unit` or `kit-check`.
pub const NOTICE: &str = "harness-kit: these steps (own copies, landings one at a time through the tests, files side by side through the queue) ran for real in the harness project's build through research-tree/tools/land.mjs; kit-unit and kit-check themselves have run only in their tests (toy repositories with node --test, on Windows). The pytest defaults and macOS were not run. (Shown once per project.)";

/// An error that ends the program with its code and its line.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct KitError {
    /// The exit code.
    pub code: u8,
    /// The line written after the program's name.
    pub msg: String,
}

impl KitError {
    /// An error with this code and line.
    #[must_use]
    pub fn new(code: u8, msg: impl Into<String>) -> Self {
        Self {
            code,
            msg: msg.into(),
        }
    }
}

impl From<std::io::Error> for KitError {
    fn from(e: std::io::Error) -> Self {
        Self::new(70, format!("internal error: {e}"))
    }
}

/// A result whose error ends the program.
pub type KitResult<T> = Result<T, KitError>;

/// `Math.round(x * 10) / 10`.
#[must_use]
pub fn r1(x: f64) -> f64 {
    js::round(x * 10.0) / 10.0
}

/// [`r1`] as JavaScript prints it.
#[must_use]
pub fn r1s(x: f64) -> String {
    js::number_to_string(r1(x))
}

/// The first ten characters of a commit name.
#[must_use]
pub fn short(h: &str) -> String {
    h.chars().take(10).collect()
}

/// `s.padEnd(n)` (UTF-16 units).
#[must_use]
pub fn pad_end(s: &str, n: usize) -> String {
    format!("{s}{}", " ".repeat(n.saturating_sub(js::len(s))))
}

/// `s.padStart(n)` (UTF-16 units).
#[must_use]
pub fn pad_start(s: &str, n: usize) -> String {
    format!("{}{s}", " ".repeat(n.saturating_sub(js::len(s))))
}

/// The time now as `toISOString` writes it.
#[must_use]
pub fn iso_now() -> String {
    js::iso_string(i64::try_from(js::now_ms()).unwrap_or(0)).unwrap_or_default()
}

/// The time now as `20261126T101010Z`.
#[must_use]
pub fn stamp() -> String {
    let s: String = iso_now()
        .chars()
        .filter(|c| *c != '-' && *c != ':')
        .collect();
    match s.rfind('.') {
        Some(dot) if s.ends_with('Z') => format!("{}Z", s.get(..dot).unwrap_or_default()),
        _ => s,
    }
}

/// A name safe for a file: every run of characters other than ASCII letters, digits, `_`, `.` and `-` becomes `_`;
/// at most 120 characters.
#[must_use]
pub fn safe(s: &str) -> String {
    let mut out = String::new();
    let mut in_run = false;
    for c in s.chars() {
        if c.is_ascii_alphanumeric() || matches!(c, '_' | '.' | '-') {
            out.push(c);
            in_run = false;
        } else if !in_run {
            out.push('_');
            in_run = true;
        }
    }
    out.chars().take(120).collect()
}

/// The last `n` lines of a file that are not blank, joined by `\n` (empty when it cannot be read).
#[must_use]
pub fn tail(file: &Path, n: usize) -> String {
    let Ok(bytes) = std::fs::read(file) else {
        return String::new();
    };
    let text = String::from_utf8_lossy(&bytes);
    let lines: Vec<&str> = text
        .split('\n')
        .map(|l| l.strip_suffix('\r').unwrap_or(l))
        .filter(|l| !js::trim(l).is_empty())
        .collect();
    let skip = lines.len().saturating_sub(n);
    lines.get(skip..).unwrap_or_default().join("\n")
}

/// The last `n` UTF-16 units of `s` (`s.slice(-n)`).
#[must_use]
pub fn last_units(s: &str, n: usize) -> String {
    let u = js::utf16(s);
    let skip = u.len().saturating_sub(n);
    String::from_utf16_lossy(u.get(skip..).unwrap_or_default())
}

/// `Number(text)` when it is a whole number not below 0 (`""` is 0, as in JavaScript); `None` otherwise.
#[must_use]
pub fn whole(text: &str) -> Option<u64> {
    let t = js::trim(text);
    if t.is_empty() {
        return Some(0);
    }
    let x: f64 = t.parse().ok()?;
    if !x.is_finite() || x.fract() != 0.0 || x < 0.0 {
        return None;
    }
    format!("{x}").parse().ok()
}

fn plain(p: PathBuf) -> PathBuf {
    let text = p.to_string_lossy();
    if let Some(rest) = text.strip_prefix(r"\\?\UNC\") {
        return PathBuf::from(format!(r"\\{rest}"));
    }
    if let Some(rest) = text.strip_prefix(r"\\?\") {
        return PathBuf::from(rest);
    }
    p
}

/// A path as one text for comparing: resolved, real when it exists, `/` between names, no trailing `/`, lower case on
/// Windows.
#[must_use]
pub fn canon(p: &Path) -> String {
    let r = paths::resolve(&paths::cwd(), &[&p.to_string_lossy()]);
    let real = std::fs::canonicalize(&r).map_or(r, plain);
    let mut t = paths::slashes(&real);
    while t.ends_with('/') {
        t.pop();
    }
    if cfg!(windows) { t.to_lowercase() } else { t }
}

/// True when `child` is `parent` or lies under it.
#[must_use]
pub fn inside(child: &Path, parent: &Path) -> bool {
    let c = canon(child);
    let p = canon(parent);
    c == p || c.starts_with(&format!("{p}/"))
}

/// A finished git call.
#[derive(Debug, Clone)]
pub struct GitOut {
    /// Exit 0.
    pub ok: bool,
    /// The exit code (`None` when ended by a signal).
    pub code: Option<i32>,
    /// Standard output.
    pub stdout: String,
    /// Standard error.
    pub stderr: String,
}

/// `git -c core.longpaths=true <args>` in `cwd`, never asking for input or an editor. A failure is an error (64)
/// unless `allow_fail`.
///
/// # Errors
/// When git cannot start, or fails and `allow_fail` is false.
pub fn git(cwd: &Path, args: &[&str], allow_fail: bool) -> KitResult<GitOut> {
    let out = Command::new("git")
        .arg("-c")
        .arg("core.longpaths=true")
        .args(args)
        .current_dir(cwd)
        .env("GIT_MERGE_AUTOEDIT", "no")
        .env("GIT_TERMINAL_PROMPT", "0")
        .env_remove("GIT_DIR")
        .env_remove("GIT_WORK_TREE")
        .env_remove("GIT_INDEX_FILE")
        .env_remove("GIT_COMMON_DIR")
        .stdin(Stdio::null())
        .output()
        .map_err(|e| KitError::new(64, format!("git {}: {e}", args.first().unwrap_or(&""))))?;
    let g = GitOut {
        ok: out.status.success(),
        code: out.status.code(),
        stdout: String::from_utf8_lossy(&out.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&out.stderr).into_owned(),
    };
    if !g.ok && !allow_fail {
        let text = if g.stderr.is_empty() {
            &g.stdout
        } else {
            &g.stderr
        };
        let first: Vec<&str> = js::trim(text).split('\n').take(6).collect();
        return Err(KitError::new(
            64,
            format!(
                "git {}: exit {}: {}",
                args.join(" "),
                g.code.map_or_else(|| "null".to_owned(), |c| c.to_string()),
                first.join(" | ")
            ),
        ));
    }
    Ok(g)
}

/// The trimmed output of a git call that must succeed.
///
/// # Errors
/// As [`git`].
pub fn git_out(cwd: &Path, args: &[&str]) -> KitResult<String> {
    Ok(js::trim(&git(cwd, args, false)?.stdout).to_owned())
}

/// Whether a git call succeeds.
///
/// # Errors
/// When git cannot start.
pub fn git_ok(cwd: &Path, args: &[&str]) -> KitResult<bool> {
    Ok(git(cwd, args, true)?.ok)
}

/// Options and the rest of a command line.
#[derive(Debug, Clone, Default)]
pub struct Args {
    opts: BTreeMap<String, Option<String>>,
    /// The positional arguments.
    pub pos: Vec<String>,
}

impl Args {
    /// The value of `--name value` or `--name=value`.
    #[must_use]
    pub fn value(&self, name: &str) -> Option<&str> {
        self.opts.get(name).and_then(|v| v.as_deref())
    }

    /// Whether the flag `--name` was given.
    #[must_use]
    pub fn flag(&self, name: &str) -> bool {
        matches!(self.opts.get(name), Some(None))
    }
}

/// `--name value` (or `--name=value`) for names in `values`, `--name` alone for names in `flags`; the rest are
/// positional.
///
/// # Errors
/// An unknown option, or a value option at the end with no value (64).
pub fn parse_args(argv: &[String], values: &[&str], flags: &[&str]) -> KitResult<Args> {
    let mut out = Args::default();
    let mut it = argv.iter();
    while let Some(a) = it.next() {
        let Some(rest) = a.strip_prefix("--") else {
            out.pos.push(a.clone());
            continue;
        };
        let (name, val) = match rest.split_once('=') {
            Some((n, v)) => (n, Some(v)),
            None => (rest, None),
        };
        if val.is_none() && flags.contains(&name) {
            out.opts.insert(name.to_owned(), None);
            continue;
        }
        if !values.contains(&name) {
            return Err(KitError::new(64, format!("unknown option: {a}")));
        }
        let v = match val {
            Some(v) => v.to_owned(),
            None => it
                .next()
                .cloned()
                .ok_or_else(|| KitError::new(64, format!("no value for {a}")))?,
        };
        out.opts.insert(name.to_owned(), Some(v));
    }
    Ok(out)
}

/// The project: the main checkout of the repository that holds `given` (or the folder this runs in). From a unit's
/// copy the project is still the checkout the copy was made from, where `.harness/` lives.
///
/// # Errors
/// No such folder, not in a git repository, or a repository with no main checkout (64).
pub fn resolve_project(given: Option<&str>) -> KitResult<PathBuf> {
    let from = paths::resolve(&paths::cwd(), &[given.unwrap_or("")]);
    if !from.exists() {
        return Err(KitError::new(64, format!("no folder {}", from.display())));
    }
    let r = git(
        &from,
        &["rev-parse", "--path-format=absolute", "--git-common-dir"],
        true,
    )?;
    if !r.ok {
        return Err(KitError::new(
            64,
            format!(
                "{} is not inside a git repository; give --project <folder>",
                from.display()
            ),
        ));
    }
    let common = PathBuf::from(js::trim(&r.stdout));
    let main = common
        .parent()
        .filter(|_| common.file_name().is_some_and(|n| n == ".git"));
    match main {
        Some(p) => Ok(paths::resolve(&paths::cwd(), &[&p.to_string_lossy()])),
        None => Err(KitError::new(
            64,
            format!(
                "the repository of {} has no main checkout ({}); give --project <folder>",
                from.display(),
                common.display()
            ),
        )),
    }
}

/// `<project>/.harness`.
#[must_use]
pub fn harness_dir(project: &Path) -> PathBuf {
    project.join(".harness")
}

/// A test file's path as the config and git write it: `/` between names, no leading `./`.
#[must_use]
pub fn norm_path(f: &str) -> String {
    let mut s = f.replace('\\', "/");
    while let Some(rest) = s.strip_prefix("./") {
        s = rest.to_owned();
    }
    s
}

/// The project's config.
#[derive(Debug, Clone)]
pub struct Config {
    /// The config file.
    pub file: PathBuf,
    /// The project.
    pub project: PathBuf,
    /// Patterns of test files.
    pub test_files: Vec<String>,
    /// The command for one file (`{file}`, `{args}`).
    pub check_one: Vec<String>,
    /// The command for everything.
    pub check_all: Vec<String>,
    /// Seconds one `check_one` run may take.
    pub check_one_timeout_s: u64,
    /// Seconds `check_all` may take.
    pub check_all_timeout_s: u64,
    /// The branch units land on.
    pub landing_branch: String,
    /// The start of every unit's branch name.
    pub unit_prefix: String,
    /// The folder of the units' copies.
    pub copies_dir: PathBuf,
    /// Commands the project's queue runs at once (never above the processor count).
    pub queue_slots: u64,
    /// A file's shards, each a list of extra words.
    pub shards: BTreeMap<String, Vec<Vec<String>>>,
}

fn drop_notes(v: &Value) -> Value {
    match v {
        Value::Array(a) => Value::Array(a.iter().map(drop_notes).collect()),
        Value::Object(o) => Value::Object(
            o.iter()
                .filter(|(k, _)| !k.starts_with("//"))
                .map(|(k, x)| (k.clone(), drop_notes(x)))
                .collect(),
        ),
        other => other.clone(),
    }
}

fn re(pattern: &str) -> KitResult<Regex> {
    Regex::new(pattern).map_err(|e| KitError::new(70, format!("internal error: {e}")))
}

/// A command as a list of words (no shell); a string is split on white space, keeping "quoted words" whole.
///
/// # Errors
/// Anything else (64).
pub fn words(cmd: Option<&Value>, key: &str) -> KitResult<Vec<String>> {
    let bad = || {
        KitError::new(
            64,
            format!(
                "kit.json: {key} must be a list of words, e.g. [\"python3\", \"-m\", \"pytest\", \"{{file}}\"]"
            ),
        )
    };
    match cmd {
        Some(Value::Array(a)) if !a.is_empty() => a
            .iter()
            .map(|w| w.as_str().map(str::to_owned))
            .collect::<Option<Vec<String>>>()
            .ok_or_else(bad),
        Some(Value::String(s)) if !js::trim(s).is_empty() => {
            let split = re(r#""([^"]*)"|'([^']*)'|(\S+)"#)?;
            Ok(split
                .captures_iter(s)
                .filter_map(|c| c.get(1).or_else(|| c.get(2)).or_else(|| c.get(3)))
                .map(|m| m.as_str().to_owned())
                .collect())
        }
        _ => Err(bad()),
    }
}

fn int(v: Option<&Value>, lo: u32, hi: u32, key: &str) -> KitResult<u64> {
    v.and_then(Value::as_f64)
        .filter(|x| x.is_finite() && x.fract() == 0.0 && *x >= f64::from(lo) && *x <= f64::from(hi))
        .and_then(|x| format!("{x}").parse::<u64>().ok())
        .ok_or_else(|| {
            KitError::new(
                64,
                format!("kit.json: {key} must be a whole number from {lo} to {hi}"),
            )
        })
}

/// Reads and checks `<project>/.harness/kit.json`. Keys that start with `//` are notes and are ignored.
///
/// # Errors
/// A missing or wrong config (64).
pub fn load_config(project: &Path) -> KitResult<Config> {
    let file = harness_dir(project).join("kit.json");
    let raw = std::fs::read_to_string(&file).map_err(|_| {
        KitError::new(
            64,
            format!(
                "no config at {}; the set-up copies it there, or copy the kit's parallel/kit.example.json there and edit it",
                file.display()
            ),
        )
    })?;
    let parsed: Value = serde_json::from_str(&raw)
        .map_err(|e| KitError::new(64, format!("kit.json is not valid JSON: {e}")))?;
    let j = drop_notes(&parsed);
    let get = |k: &str| j.get(k);

    let test_files = match get("test_files") {
        Some(Value::Array(a))
            if !a.is_empty() && a.iter().all(|s| s.as_str().is_some_and(|s| !s.is_empty())) =>
        {
            a.iter()
                .filter_map(Value::as_str)
                .map(str::to_owned)
                .collect()
        }
        _ => {
            return Err(KitError::new(
                64,
                "kit.json: test_files must be a list of patterns, e.g. [\"**/test_*.py\"]",
            ));
        }
    };
    let check_one = words(get("check_one"), "check_one")?;
    if !check_one.iter().any(|w| w.contains("{file}")) {
        return Err(KitError::new(64, "kit.json: check_one must hold {file}"));
    }
    let check_all = words(get("check_all"), "check_all")?;
    let check_one_timeout_s = int(
        get("check_one_timeout_s"),
        5,
        604_800,
        "check_one_timeout_s",
    )?;
    let check_all_timeout_s = int(
        get("check_all_timeout_s"),
        5,
        604_800,
        "check_all_timeout_s",
    )?;

    let name_ok = re(r"^[A-Za-z0-9_][A-Za-z0-9_./-]*$")?;
    let name_bad = re(r"\.\.|//|\.lock$|/$")?;
    let lb = get("landing_branch");
    let landing_branch = lb
        .filter(|v| js::truthy(v))
        .map(js::to_string)
        .unwrap_or_default();
    if !name_ok.is_match(&landing_branch) || name_bad.is_match(&landing_branch) {
        return Err(KitError::new(
            64,
            format!(
                "kit.json: landing_branch is not a branch name: {}",
                js::display(lb)
            ),
        ));
    }
    let up = get("unit_prefix");
    let unit_prefix = up
        .and_then(Value::as_str)
        .map_or_else(|| "u/".to_owned(), str::to_owned);
    if !unit_prefix.is_empty() && !name_ok.is_match(&unit_prefix) {
        return Err(KitError::new(
            64,
            format!(
                "kit.json: unit_prefix is not a branch prefix: {}",
                js::display(up)
            ),
        ));
    }
    let copies = get("copies_dir")
        .and_then(Value::as_str)
        .filter(|s| !js::trim(s).is_empty())
        .ok_or_else(|| {
            KitError::new(
                64,
                "kit.json: copies_dir must name a folder, e.g. \"../{project}-units\"",
            )
        })?;
    let base = project
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();
    let copies_dir = paths::resolve(project, &[&copies.replace("{project}", &base)]);
    if inside(&copies_dir, project) {
        return Err(KitError::new(
            64,
            format!(
                "kit.json: copies_dir {} lies inside the project; it must lie outside it",
                copies_dir.display()
            ),
        ));
    }
    if canon(&copies_dir).split('/').any(|n| n == ".claude") {
        return Err(KitError::new(
            64,
            format!(
                "kit.json: copies_dir {} lies inside a .claude folder; it must not",
                copies_dir.display()
            ),
        ));
    }
    let queue_slots = int(get("queue_slots"), 1, 1024, "queue_slots")?.min(sys::cpus());

    let mut shards = BTreeMap::new();
    match get("shards") {
        Some(Value::Object(o)) => {
            for (f, list) in o {
                let parsed = list.as_array().filter(|l| !l.is_empty()).and_then(|l| {
                    l.iter()
                        .map(|shard| {
                            shard.as_array().and_then(|ws| {
                                ws.iter()
                                    .map(|w| w.as_str().map(str::to_owned))
                                    .collect::<Option<Vec<String>>>()
                            })
                        })
                        .collect::<Option<Vec<Vec<String>>>>()
                });
                let Some(p) = parsed else {
                    return Err(KitError::new(
                        64,
                        format!(
                            "kit.json: shards.{f} must be a list of shards, each a list of extra words"
                        ),
                    ));
                };
                shards.insert(norm_path(f), p);
            }
        }
        Some(v) if js::truthy(v) => {
            return Err(KitError::new(
                64,
                "kit.json: shards must map a file to a list of shards, each a list of extra words",
            ));
        }
        _ => {}
    }

    Ok(Config {
        file,
        project: project.to_path_buf(),
        test_files,
        check_one,
        check_all,
        check_one_timeout_s,
        check_all_timeout_s,
        landing_branch,
        unit_prefix,
        copies_dir,
        queue_slots,
        shards,
    })
}

/// The regular expression of a test-file pattern: `**/` any number of folders, `**` anything, `*` any part of one
/// name, `?` one character of a name.
#[must_use]
pub fn glob_re(g: &str) -> String {
    let s: Vec<char> = norm_path(g).chars().collect();
    let mut out = String::from("^");
    let mut i = 0usize;
    while let Some(&ch) = s.get(i) {
        let next = s.get(i.saturating_add(1)).copied();
        if ch == '*' && next == Some('*') {
            if s.get(i.saturating_add(2)) == Some(&'/') {
                out.push_str("(?:.*/)?");
                i = i.saturating_add(3);
            } else {
                out.push_str(".*");
                i = i.saturating_add(2);
            }
            continue;
        }
        match ch {
            '*' => out.push_str("[^/]*"),
            '?' => out.push_str("[^/]"),
            '.' | '+' | '^' | '$' | '{' | '}' | '(' | ')' | '|' | '[' | ']' | '\\' => {
                out.push('\\');
                out.push(ch);
            }
            _ => out.push(ch),
        }
        i = i.saturating_add(1);
    }
    out.push('$');
    out
}

/// The test files in `dir`: tracked files and new ones git does not ignore, matched against the patterns, sorted.
///
/// # Errors
/// A git failure or a pattern that is not a valid expression (64).
pub fn list_tests(dir: &Path, patterns: &[String]) -> KitResult<Vec<String>> {
    let res = patterns
        .iter()
        .map(|p| {
            Regex::new(&glob_re(p))
                .map_err(|e| KitError::new(64, format!("kit.json: test_files pattern {p}: {e}")))
        })
        .collect::<KitResult<Vec<Regex>>>()?;
    let out = git(
        dir,
        &[
            "ls-files",
            "-z",
            "--cached",
            "--others",
            "--exclude-standard",
        ],
        false,
    )?;
    let mut files: Vec<String> = out
        .stdout
        .split('\0')
        .filter(|f| !f.is_empty())
        .map(norm_path)
        .filter(|f| res.iter().any(|r| r.is_match(f)) && dir.join(f).exists())
        .collect();
    files.sort_by(|a, b| js::cmp_utf16(a, b));
    files.dedup();
    Ok(files)
}

/// One run of a check: a file, or one shard of it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Member {
    /// `file`, or `file#<shard>`.
    pub id: String,
    /// The test file.
    pub file: String,
    /// The shard's number from 1.
    pub shard: Option<usize>,
    /// The command.
    pub argv: Vec<String>,
}

/// The runs of the files: one each, or one per shard for a file with shards.
#[must_use]
pub fn members_of(cfg: &Config, files: &[String]) -> Vec<Member> {
    let fill = |file: &str, extra: &[String]| {
        let mut out = Vec::new();
        let mut used = false;
        for w in &cfg.check_one {
            if w == "{args}" {
                out.extend(extra.iter().cloned());
                used = true;
            } else {
                out.push(w.replace("{file}", file));
            }
        }
        if !used {
            out.extend(extra.iter().cloned());
        }
        out
    };
    let mut ms = Vec::new();
    for f in files {
        match cfg.shards.get(&norm_path(f)) {
            Some(list) => {
                for (i, extra) in list.iter().enumerate() {
                    let n = i.saturating_add(1);
                    ms.push(Member {
                        id: format!("{f}#{n}"),
                        file: f.clone(),
                        shard: Some(n),
                        argv: fill(f, extra),
                    });
                }
            }
            None => ms.push(Member {
                id: f.clone(),
                file: f.clone(),
                shard: None,
                argv: fill(f, &[]),
            }),
        }
    }
    ms
}

/// `check_all` without `{args}`.
#[must_use]
pub fn fill_all(cfg: &Config) -> Vec<String> {
    cfg.check_all
        .iter()
        .filter(|w| *w != "{args}")
        .cloned()
        .collect()
}

/// `<project>/.harness/<name>`: the project's queue is `lane`.
#[must_use]
pub fn queue_dir(project: &Path, name: &str) -> PathBuf {
    harness_dir(project).join(name)
}

/// The queue in `dir` with `n` slots (at most the processor count).
///
/// # Errors
/// When the folder or the number cannot be written (64).
pub fn set_slots(dir: &Path, n: u64) -> KitResult<Queue> {
    let fail = |e: String| {
        KitError::new(
            64,
            format!("cannot set the queue's slots in {}: {e}", dir.display()),
        )
    };
    let q = Queue::open(dir, sys::cpus()).map_err(|e| fail(e.to_string()))?;
    q.set_capacity(n).map_err(fail)?;
    Ok(q)
}

/// One command through the queue with its output in `log`; a timeout above the queue's default ceiling raises the
/// ceiling for this command; it waits for a slot up to the queue's longest wait.
#[must_use]
pub fn lane_run(
    q: &Queue,
    label: &str,
    argv: &[String],
    cwd: &Path,
    timeout_s: u64,
    log: &Path,
) -> Ran {
    let mut job = Job::new(label, argv.to_vec());
    job.cwd = Some(cwd.to_path_buf());
    job.timeout_s = timeout_s;
    job.max_timeout_s = timeout_s.max(queue::MAX_TIMEOUT_S);
    job.wait_s = queue::WAIT_CEILING_S;
    job.output = Output::File(log.to_path_buf());
    // a check runs as a fresh process whoever started us: under a `node --test` parent, NODE_TEST_CONTEXT makes a
    // nested `node --test` report to that parent instead of running its files
    job.drop_env = vec!["NODE_TEST_CONTEXT".to_owned()];
    q.run(&job)
}

/// Runs `run` on every item with at most `at` at once; calls `done` as each ends; gives the results in the items'
/// order.
pub fn pool<T, R, F, D>(items: &[T], at: usize, run: F, done: D) -> Vec<R>
where
    T: Sync,
    R: Send,
    F: Fn(&T) -> R + Sync,
    D: Fn(&T, &R) + Sync,
{
    let next = AtomicUsize::new(0);
    let out: Mutex<Vec<(usize, R)>> = Mutex::new(Vec::with_capacity(items.len()));
    let workers = at.min(items.len()).max(1);
    std::thread::scope(|s| {
        for _ in 0..workers {
            s.spawn(|| {
                loop {
                    let i = next.fetch_add(1, Ordering::SeqCst);
                    let Some(item) = items.get(i) else { break };
                    let r = run(item);
                    done(item, &r);
                    out.lock()
                        .unwrap_or_else(PoisonError::into_inner)
                        .push((i, r));
                }
            });
        }
    });
    let mut v = out.into_inner().unwrap_or_else(PoisonError::into_inner);
    v.sort_by_key(|(i, _)| *i);
    v.into_iter().map(|(_, r)| r).collect()
}

/// On the first run in a project, writes `text` to standard error and remembers it in `.harness/notice-<name>.txt`.
pub fn notice_once(project: &Path, name: &str, text: &str) {
    let f = harness_dir(project).join(format!("notice-{name}.txt"));
    if f.exists() {
        return;
    }
    std::fs::create_dir_all(harness_dir(project))
        .and_then(|()| std::fs::write(&f, format!("{text}\n")))
        .unwrap_or_default();
    sys::err(&format!("{text}\n"));
}

#[cfg(test)]
mod tests {
    use super::*;

    fn matches(pattern: &str, file: &str) -> bool {
        Regex::new(&glob_re(pattern)).is_ok_and(|r| r.is_match(file))
    }

    #[test]
    fn a_double_star_and_slash_matches_any_number_of_folders() {
        assert_eq!(
            [
                matches("**/test_*.py", "test_a.py"),
                matches("**/test_*.py", "x/y/test_a.py"),
                matches("**/test_*.py", "x/test_a.pyc"),
                matches("t/*.mjs", "t/u/a.mjs"),
            ],
            [true, true, false, false]
        );
    }

    #[test]
    fn a_string_command_keeps_quoted_words_whole() -> KitResult<()> {
        let v = Value::String("python3 -k \"a or b\" 'c d'".to_owned());
        assert_eq!(words(Some(&v), "k")?, ["python3", "-k", "a or b", "c d"]);
        Ok(())
    }

    #[test]
    fn options_take_values_flags_stand_alone_and_unknown_ones_are_refused() -> KitResult<()> {
        let argv: Vec<String> = ["f", "--at", "3", "--measure", "--in=x"]
            .iter()
            .map(|s| (*s).to_owned())
            .collect();
        let a = parse_args(&argv, &["at", "in"], &["measure"])?;
        let bad = parse_args(&["--nope".to_owned()], &["at"], &[]).map(|_| ());
        assert_eq!(
            (
                a.value("at"),
                a.value("in"),
                a.flag("measure"),
                a.pos.len(),
                bad.map_err(|e| e.code)
            ),
            (Some("3"), Some("x"), true, 1, Err(64))
        );
        Ok(())
    }

    #[test]
    fn safe_names_and_stamps_have_the_javascript_shape() {
        let st = stamp();
        assert_eq!(
            (
                safe("t/x 1.test.mjs#2"),
                st.len(),
                st.ends_with('Z'),
                st.contains('.')
            ),
            ("t_x_1.test.mjs_2".to_owned(), 16, true, false)
        );
    }

    #[test]
    fn whole_reads_numbers_as_javascript_number_does() {
        assert_eq!(
            [
                whole("3"),
                whole(" 4.0 "),
                whole(""),
                whole("2.5"),
                whole("x")
            ],
            [Some(3), Some(4), Some(0), None, None]
        );
    }
}
