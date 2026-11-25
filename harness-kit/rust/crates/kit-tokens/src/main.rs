//! kit-tokens: what each helper of a session cost, so that limits get a basis
//! of one's own.
//!
//! ```text
//! kit-tokens [--project <folder>] [<session id or its first characters>]
//!     prints, for that session of the project (default: the newest), each helper with its description, model,
//!     messages and tokens, then the session's own figure and the sum.
//! kit-tokens [--project <folder>] --basis "<what was measured>" <agent id or its first characters>
//!     adds that helper's figure to <project>/.harness/basis.json as { id: "own-NNNN", status: "measured", date, claim }.
//! ```
//!
//! The project defaults to the current folder. Tokens are counted as the fan-out gate counts them: input + cache
//! creation + cache read + output, once per message id (a message seen in two files counts once). The transcripts are
//! `<config>/projects/<the project's path with every character other than a letter or digit made "-">/<session>.jsonl`
//! and `<session>/subagents/agent-<id>.jsonl` (with `.meta.json` beside), `<config>` being `$CLAUDE_CONFIG_DIR` or
//! `~/.claude`; the path as given and its real path are both tried. Any other argument starting with `--` (the test
//! switch passes `--clone=<folder>`) is passed over, as the JavaScript passes it over.

#[path = "../../kit-fanout-gate/src/jsadd.rs"]
mod jsadd;
mod ojson;

use jsadd::Prim;
use kit_core::js;
use kit_core::outcome::Outcome;
use kit_core::paths;
use ojson::J;
use serde_json::Value;
use std::cmp::Ordering;
use std::collections::{HashMap, HashSet};
use std::io::Write;
use std::num::FpCategory;
use std::path::{Path, PathBuf};
use std::process::ExitCode;
use std::time::{Duration, UNIX_EPOCH};

/// V8's longest string, in UTF-16 units (`'  '.repeat(n)` past it throws).
const MAX_STRING: f64 = 536_870_888.0;

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args_os()
        .skip(1)
        .map(|a| a.to_string_lossy().into_owned())
        .collect();
    let env = Env {
        cwd: paths::cwd(),
        config: std::env::var_os("CLAUDE_CONFIG_DIR")
            .map(|v| v.to_string_lossy().into_owned())
            .filter(|v| !v.is_empty()),
        home: homedir(),
    };
    match run(&args, &env) {
        Ok(out) => Outcome::Say(out).finish(),
        Err(Stop { out, why }) => {
            if !out.is_empty() {
                let mut stdout = std::io::stdout().lock();
                stdout
                    .write_all(out.as_bytes())
                    .and_then(|()| stdout.flush())
                    .unwrap_or_default();
            }
            Outcome::Fail(why).finish()
        }
    }
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

/// What the program reads besides its arguments.
struct Env {
    /// `process.cwd()`.
    cwd: PathBuf,
    /// `CLAUDE_CONFIG_DIR`, when set and not empty.
    config: Option<String>,
    /// `os.homedir()`.
    home: PathBuf,
}

/// An end with exit 1: what was printed before it, and the message for standard error.
#[derive(Debug)]
struct Stop {
    out: String,
    why: String,
}

impl Stop {
    /// `fail(m)`: `tokens: <m>`.
    fn fail(m: &str) -> Self {
        Self {
            out: String::new(),
            why: format!("tokens: {m}"),
        }
    }

    /// Where the JavaScript throws (Node prints the error with its stack).
    fn thrown(m: &str) -> Self {
        Self {
            out: String::new(),
            why: m.to_owned(),
        }
    }
}

/// A value as a JavaScript `Map` key compares it: primitives by value, an array or object by identity (each line's
/// parse makes new ones, so each gets its own number).
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
enum Key {
    Null,
    Bool(bool),
    Num(u64),
    Str(String),
    Obj(usize),
}

fn key_of(v: &Value, objs: &mut usize) -> Key {
    match v {
        Value::Null => Key::Null,
        Value::Bool(b) => Key::Bool(*b),
        Value::Number(n) => {
            let x = n.as_f64().unwrap_or(f64::NAN);
            Key::Num(if x.classify() == FpCategory::Zero {
                0
            } else {
                x.to_bits()
            })
        }
        Value::String(s) => Key::Str(s.clone()),
        Value::Array(_) | Value::Object(_) => {
            *objs = objs.saturating_add(1);
            Key::Obj(*objs)
        }
    }
}

/// `take(flag)`: the argument after `flag` (`""` when there is none), both removed; `None` when `flag` is absent.
fn take(args: &mut Vec<String>, flag: &str) -> Option<String> {
    let i = args.iter().position(|a| a == flag)?;
    let v = args.get(i.saturating_add(1)).cloned().unwrap_or_default();
    args.remove(i);
    if i < args.len() {
        args.remove(i);
    }
    Some(v)
}

/// `s.slice(0, n)` as printed (a cut surrogate pair prints as U+FFFD, as Node writes it).
fn cut(s: &str, n: usize) -> String {
    let mut u = js::utf16(s);
    u.truncate(n);
    String::from_utf16_lossy(&u)
}

/// `String(v || '')`.
fn text_or_empty(v: Option<&Value>) -> String {
    v.filter(|x| js::truthy(x))
        .map(js::to_string)
        .unwrap_or_default()
}

/// `fmt(n)`: millions with two decimals from a million up, else thousands with one.
fn fmt(n: f64) -> String {
    if n >= 1e6 {
        format!("{} M", js::to_fixed(n / 1e6, 2))
    } else {
        format!("{} K", js::to_fixed(n / 1e3, 1))
    }
}

/// `n.toLocaleString('en-US')` for a number: the shortest digits, rounded half away from zero to three decimals,
/// the whole part grouped by commas.
fn locale_number(x: f64) -> String {
    if x.is_nan() {
        return "NaN".to_owned();
    }
    let sign = if x.is_sign_negative() { "-" } else { "" };
    if x.is_infinite() {
        return format!("{sign}\u{221e}");
    }
    let plain = format!("{}", x.abs());
    let (int, frac) = plain.split_once('.').unwrap_or((plain.as_str(), ""));
    let mut digits: Vec<u8> = int.bytes().chain(frac.bytes().take(3)).collect();
    let kept = frac.len().min(3);
    if frac.as_bytes().get(3).is_some_and(|&d| d >= b'5') {
        let mut carry = true;
        for d in digits.iter_mut().rev() {
            if *d == b'9' {
                *d = b'0';
            } else {
                *d = d.saturating_add(1);
                carry = false;
                break;
            }
        }
        if carry {
            digits.insert(0, b'1');
        }
    }
    let int_len = digits.len().saturating_sub(kept);
    let (whole, part) = digits
        .split_at_checked(int_len)
        .unwrap_or((digits.as_slice(), &[]));
    let part = String::from_utf8_lossy(part);
    let part = part.trim_end_matches('0');
    let whole = String::from_utf8_lossy(whole);
    let mut grouped = String::new();
    let n = whole.len();
    for (i, c) in whole.chars().enumerate() {
        let left = n.saturating_sub(i);
        if i > 0 && left.checked_rem(3) == Some(0) {
            grouped.push(',');
        }
        grouped.push(c);
    }
    if part.is_empty() {
        format!("{sign}{grouped}")
    } else {
        format!("{sign}{grouped}.{part}")
    }
}

/// `v.toLocaleString('en-US')` of a sum: a number grouped, a string as it is.
fn locale(p: &Prim) -> String {
    match p {
        Prim::Num(x) => locale_number(*x),
        other => other.text(),
    }
}

/// `slug(p)`: every UTF-16 unit other than an ASCII letter or digit made `-`.
fn slug(p: &str) -> String {
    let mut out = String::with_capacity(p.len());
    for c in p.chars() {
        if c.is_ascii_alphanumeric() {
            out.push(c);
        } else {
            out.push_str(&"-".repeat(c.len_utf16()));
        }
    }
    out
}

/// `projectDirs(project)`: `<config>/projects/<slug>` for each config folder and for the path as given and its real
/// path, each once.
fn project_dirs(project: &Path, env: &Env) -> Vec<PathBuf> {
    // realpathSync.native throws for a path that does not exist; the JavaScript then keeps the path as given.
    let real = if std::fs::metadata(project).is_ok() {
        paths::real_of(project)
    } else {
        project.to_path_buf()
    };
    let mut configs: Vec<PathBuf> = Vec::new();
    if let Some(c) = &env.config {
        configs.push(PathBuf::from(c));
    }
    configs.push(env.home.join(".claude"));
    let mut out: Vec<PathBuf> = Vec::new();
    for c in &configs {
        for p in [project, real.as_path()] {
            let d = paths::normalize(&c.join("projects").join(slug(&p.to_string_lossy())));
            if !out.contains(&d) {
                out.push(d);
            }
        }
    }
    out
}

/// `readdirSync(dir)`: the names, `None` where it throws. Node (libuv) sorts them by their bytes everywhere but on
/// Windows, where it keeps the file system's order.
fn list_names(dir: &Path) -> Option<Vec<String>> {
    let rd = std::fs::read_dir(dir).ok()?;
    let mut names: Vec<String> = rd
        .filter_map(Result::ok)
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .collect();
    if !cfg!(windows) {
        names.sort_by(|a, b| a.as_bytes().cmp(b.as_bytes()));
    }
    Some(names)
}

/// `readText(p)`: the file as text, `""` where it cannot be read. Invalid UTF-8 becomes U+FFFD, as Node decodes it.
fn read_text(p: &Path) -> String {
    std::fs::read(p)
        .map(|b| String::from_utf8_lossy(&b).into_owned())
        .unwrap_or_default()
}

/// A whole number as a double (correctly rounded, as JavaScript holds it).
fn f64_of(n: u64) -> f64 {
    n.to_string().parse::<f64>().unwrap_or(f64::NAN)
}

/// Milliseconds of a duration, with the fraction (`mtimeMs`).
fn ms(d: Duration) -> f64 {
    f64_of(d.as_secs()) * 1e3 + f64::from(d.subsec_nanos()) / 1e6
}

/// `statSync(p).mtimeMs`, `None` where it throws.
fn mtime_ms(p: &Path) -> Option<f64> {
    let t = std::fs::metadata(p).ok()?.modified().ok()?;
    Some(match t.duration_since(UNIX_EPOCH) {
        Ok(d) => ms(d),
        Err(e) => -ms(e.duration()),
    })
}

/// One transcript: each message id with the tokens of its last line, in the order ids first appear, and the model
/// used most (the first of equal counts); `None` when no line names a model.
struct Transcript {
    msgs: Vec<(Key, Prim)>,
    model: Option<Value>,
}

/// `readTranscript(path)`.
fn read_transcript(path: &Path, objs: &mut usize) -> Transcript {
    let mut msgs: Vec<(Key, Prim)> = Vec::new();
    let mut msg_at: HashMap<Key, usize> = HashMap::new();
    let mut models: Vec<(Value, u64)> = Vec::new();
    let mut model_at: HashMap<Key, usize> = HashMap::new();
    for l in read_text(path).split('\n') {
        if !l.starts_with('{') || !l.contains("\"assistant\"") {
            continue;
        }
        let Some(o) = kit_core::input::parse_text(l) else {
            continue;
        };
        if o.get("type").and_then(Value::as_str) != Some("assistant") {
            continue;
        }
        let Some(m) = o.get("message").filter(|m| js::truthy(m)) else {
            continue;
        };
        let (Some(u), Some(id)) = (
            m.get("usage").filter(|u| js::truthy(u)),
            m.get("id").filter(|i| js::truthy(i)),
        ) else {
            continue;
        };
        let k = key_of(id, objs);
        let v = jsadd::usage_sum(u);
        match msg_at.get(&k).and_then(|&i| msgs.get_mut(i)) {
            Some(slot) => slot.1 = v,
            None => {
                msg_at.insert(k.clone(), msgs.len());
                msgs.push((k, v));
            }
        }
        if let Some(model) = m.get("model").filter(|x| js::truthy(x))
            && model.as_str() != Some("<synthetic>")
        {
            let k = key_of(model, objs);
            match model_at.get(&k).and_then(|&i| models.get_mut(i)) {
                Some(slot) => slot.1 = slot.1.saturating_add(1),
                None => {
                    model_at.insert(k, models.len());
                    models.push((model.clone(), 1));
                }
            }
        }
    }
    let mut best: Option<&(Value, u64)> = None;
    for e in &models {
        if best.is_none_or(|b| e.1 > b.1) {
            best = Some(e);
        }
    }
    Transcript {
        msgs,
        model: best.map(|b| b.0.clone()),
    }
}

/// `count(t)`: the tokens and messages of the ids not counted yet (`seen` is shared across the session's files).
fn count(t: &Transcript, seen: &mut HashSet<Key>) -> (Prim, u64) {
    let mut n = Prim::Num(0.0);
    let mut k: u64 = 0;
    for (id, v) in &t.msgs {
        if seen.insert(id.clone()) {
            n = n.add(v);
            k = k.saturating_add(1);
        }
    }
    (n, k)
}

/// A helper of a session.
struct Helper {
    id: String,
    description: String,
    model: Value,
    depth: Prim,
    tokens: Prim,
    messages: u64,
}

/// `session(dir, file)`.
struct Session {
    id: String,
    own_tokens: Prim,
    own_messages: u64,
    own_model: Value,
    helpers: Vec<Helper>,
    total: Prim,
}

/// True for a name `/^agent-.+\.jsonl$/` accepts (`.` stops at JavaScript's line terminators).
fn is_agent_file(n: &str) -> bool {
    n.strip_prefix("agent-")
        .and_then(|r| r.strip_suffix(".jsonl"))
        .is_some_and(|mid| {
            !mid.is_empty()
                && !mid
                    .chars()
                    .any(|c| matches!(c, '\n' | '\r' | '\u{2028}' | '\u{2029}'))
        })
}

/// The id in a helper's file name: `agent-` and `.jsonl` taken off.
fn agent_id(n: &str) -> String {
    let s = n.strip_prefix("agent-").unwrap_or(n);
    s.strip_suffix(".jsonl").unwrap_or(s).to_owned()
}

fn session(dir: &Path, file: &str, objs: &mut usize) -> Result<Session, Stop> {
    let mut seen: HashSet<Key> = HashSet::new();
    let own = read_transcript(&dir.join(file), objs);
    let (own_tokens, own_messages) = count(&own, &mut seen);
    let id = file.strip_suffix(".jsonl").unwrap_or(file).to_owned();
    let sub = dir.join(&id).join("subagents");
    let names: Vec<String> = list_names(&sub)
        .unwrap_or_default()
        .into_iter()
        .filter(|n| is_agent_file(n))
        .collect();
    let mut metas: Vec<(String, String, Value, f64)> = names
        .into_iter()
        .map(|n| {
            let hid = agent_id(&n);
            let text = read_text(&sub.join(format!("agent-{hid}.meta.json")));
            let text = if text.is_empty() { "{}" } else { text.as_str() };
            let meta = kit_core::input::parse_text(text)
                .unwrap_or_else(|| Value::Object(serde_json::Map::new()));
            let t = mtime_ms(&sub.join(&n)).unwrap_or(0.0);
            (hid, n, meta, t)
        })
        .collect();
    metas.sort_by(|a, b| a.3.partial_cmp(&b.3).unwrap_or(Ordering::Equal));
    let mut helpers = Vec::new();
    for (hid, n, meta, _) in metas {
        let tr = read_transcript(&sub.join(&n), objs);
        if meta.is_null() {
            return Err(Stop::thrown(
                "TypeError: Cannot read properties of null (reading 'description')",
            ));
        }
        let (tokens, messages) = count(&tr, &mut seen);
        helpers.push(Helper {
            id: hid,
            description: text_or_empty(meta.get("description")),
            model: tr
                .model
                .unwrap_or_else(|| Value::String(text_or_empty(meta.get("model")))),
            depth: match meta.get("spawnDepth").filter(|d| js::truthy(d)) {
                Some(d) => Prim::of(d),
                None => Prim::Num(1.0),
            },
            tokens,
            messages,
        });
    }
    let helpers_sum = helpers.iter().fold(Prim::Num(0.0), |a, h| a.add(&h.tokens));
    Ok(Session {
        id,
        total: own_tokens.add(&helpers_sum),
        own_tokens,
        own_messages,
        own_model: own.model.unwrap_or_else(|| Value::String(String::new())),
        helpers,
    })
}

/// A transcript file of the project: its folder, name and change time.
struct File {
    d: PathBuf,
    n: String,
    t: f64,
}

/// The program for these arguments: the text for standard output, or how it stops.
fn run(args: &[String], env: &Env) -> Result<String, Stop> {
    let mut args = args.to_vec();
    let proj_arg = take(&mut args, "--project");
    let basis_what = take(&mut args, "--basis");
    let want = js::trim(
        args.iter()
            .find(|a| !a.starts_with("--"))
            .map_or("", String::as_str),
    )
    .to_owned();
    let project = match proj_arg.as_deref() {
        Some(p) if !p.is_empty() => paths::resolve(&env.cwd, &[p]),
        _ => paths::resolve(&env.cwd, &[]),
    };
    let all_dirs = project_dirs(&project, env);
    let dirs: Vec<&PathBuf> = all_dirs.iter().filter(|d| d.exists()).collect();
    if dirs.is_empty() {
        let looked: Vec<String> = all_dirs
            .iter()
            .map(|d| d.to_string_lossy().into_owned())
            .collect();
        return Err(Stop::fail(&format!(
            "no transcripts for {}; looked in {}",
            project.display(),
            looked.join(" and ")
        )));
    }
    let mut files: Vec<File> = Vec::new();
    for d in dirs {
        let Some(names) = list_names(d) else {
            return Err(Stop::thrown(&format!(
                "Error: ENOTDIR: not a directory, scandir '{}'",
                d.display()
            )));
        };
        for n in names.into_iter().filter(|n| n.ends_with(".jsonl")) {
            let p = d.join(&n);
            let Some(t) = mtime_ms(&p) else {
                return Err(Stop::thrown(&format!(
                    "Error: ENOENT: no such file or directory, stat '{}'",
                    p.display()
                )));
            };
            files.push(File { d: d.clone(), n, t });
        }
    }
    let mut objs: usize = 0;
    if let Some(what) = basis_what {
        return basis(&what, &want, &project, &files, &mut objs);
    }
    list(&want, &project, &mut files, &mut objs)
}

/// The table of one session.
fn list(want: &str, project: &Path, files: &mut [File], objs: &mut usize) -> Result<String, Stop> {
    let pick: Vec<&File> = if want.is_empty() {
        files.sort_by(|a, b| b.t.partial_cmp(&a.t).unwrap_or(Ordering::Equal));
        files.iter().take(1).collect()
    } else {
        files.iter().filter(|f| f.n.starts_with(want)).collect()
    };
    let Some(first) = pick.first() else {
        return Err(Stop::fail(&format!(
            "no session {want} among the transcripts of {}",
            project.display()
        )));
    };
    if pick.len() > 1 {
        let names: Vec<String> = pick.iter().map(|f| cut(&f.n, 12)).collect();
        return Err(Stop::fail(&format!(
            "{want} names {} sessions ({}); give more characters",
            pick.len(),
            names.join(", ")
        )));
    }
    let s = session(&first.d, &first.n, objs)?;
    let mut out = format!("session {} ({})\n", s.id, project.display());
    let mut rows: Vec<[Value; 5]> = Vec::new();
    for h in &s.helpers {
        let indent = if h.depth.number() > 1.0 {
            let n = (h.depth.number() - 1.0).trunc();
            if !n.is_finite() {
                return Err(Stop {
                    out,
                    why: format!(
                        "RangeError: Invalid count value: {}",
                        js::number_to_string(n)
                    ),
                });
            }
            if n * 2.0 > MAX_STRING {
                return Err(Stop {
                    out,
                    why: "RangeError: Invalid string length".to_owned(),
                });
            }
            "  ".repeat(format!("{n}").parse::<usize>().unwrap_or(0))
        } else {
            String::new()
        };
        rows.push([
            Value::String(cut(&h.id, 17)),
            Value::String(format!("{indent}{}", cut(&h.description, 60))),
            h.model.clone(),
            Value::String(h.messages.to_string()),
            Value::String(fmt(h.tokens.number())),
        ]);
    }
    rows.push([
        Value::String("(the session)".to_owned()),
        Value::String("its own messages".to_owned()),
        s.own_model,
        Value::String(s.own_messages.to_string()),
        Value::String(fmt(s.own_tokens.number())),
    ]);
    rows.push([
        Value::String(String::new()),
        Value::String("sum".to_owned()),
        Value::String(String::new()),
        Value::String(String::new()),
        Value::String(fmt(s.total.number())),
    ]);
    let head = ["helper", "description", "model", "messages", "tokens"]
        .map(|h| Value::String(h.to_owned()));
    // `x.length`: a string's UTF-16 units, an array's items; anything else has none, and the width is then NaN
    // (no padding).
    let length = |v: &Value| match v {
        Value::String(s) => Some(js::len(s)),
        Value::Array(a) => Some(a.len()),
        _ => None,
    };
    let mut widths: [Option<usize>; 5] = [None; 5];
    for (i, w) in widths.iter_mut().enumerate() {
        let mut all = std::iter::once(&head)
            .chain(rows.iter())
            .map(|r| r.get(i).and_then(length));
        *w = all.try_fold(0usize, |m, l| l.map(|l| m.max(l)));
    }
    let line = |r: &[Value; 5]| -> Result<String, String> {
        let mut cells: Vec<String> = Vec::with_capacity(5);
        for (i, c) in r.iter().enumerate() {
            let Value::String(s) = c else {
                let f = if i >= 3 { "padStart" } else { "padEnd" };
                return Err(format!("TypeError: c.{f} is not a function"));
            };
            let pad = widths
                .get(i)
                .copied()
                .flatten()
                .map_or(0, |w| w.saturating_sub(js::len(s)));
            let fill = " ".repeat(pad);
            cells.push(if i >= 3 {
                format!("{fill}{s}")
            } else {
                format!("{s}{fill}")
            });
        }
        Ok(cells.join("  "))
    };
    for r in std::iter::once(&head).chain(rows.iter()) {
        match line(r) {
            Ok(l) => {
                out.push_str(&l);
                out.push('\n');
            }
            Err(why) => return Err(Stop { out, why }),
        }
    }
    out.push_str("Tokens: input + cache creation + cache read + output, once per message id (as the fan-out gate counts).\n");
    out.push_str("Add a helper as a basis of your own: harness-kit/rust/target/release/kit-tokens --basis \"<what it did>\" <helper id>\n");
    Ok(out)
}

/// The number in `own-NNNN`, four ASCII digits.
fn own_number(id: &str) -> Option<u32> {
    let digits = id.strip_prefix("own-")?;
    (digits.len() == 4 && digits.bytes().all(|b| b.is_ascii_digit()))
        .then(|| digits.parse::<u32>().ok())
        .flatten()
}

/// `new Date()`'s local date, `YYYY-MM-DD`, from the system's `date` (PowerShell's `Get-Date` on Windows); the date
/// in UTC if that cannot be run.
fn local_date() -> String {
    let out = if cfg!(windows) {
        std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "Get-Date -Format yyyy-MM-dd",
            ])
            .output()
    } else {
        std::process::Command::new("date").arg("+%Y-%m-%d").output()
    };
    let text = out
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_owned());
    let is_date = |t: &str| {
        t.len() == 10
            && t.bytes().enumerate().all(|(i, b)| {
                if i == 4 || i == 7 {
                    b == b'-'
                } else {
                    b.is_ascii_digit()
                }
            })
    };
    match text {
        Some(t) if is_date(&t) => t,
        _ => i64::try_from(js::now_ms())
            .ok()
            .and_then(js::iso_string)
            .and_then(|s| s.get(..10).map(str::to_owned))
            .unwrap_or_default(),
    }
}

/// `--basis`: the helper's figure added to `<project>/.harness/basis.json`.
fn basis(
    what: &str,
    want: &str,
    project: &Path,
    files: &[File],
    objs: &mut usize,
) -> Result<String, Stop> {
    if js::trim(what).is_empty() || want.is_empty() {
        return Err(Stop::fail(
            "usage: harness-kit/rust/target/release/kit-tokens [--project <folder>] --basis \"<what was measured>\" <agent id>",
        ));
    }
    let aid = want.strip_prefix("agent-").unwrap_or(want);
    let start = format!("agent-{aid}");
    let mut hits: Vec<(&File, String)> = Vec::new();
    for f in files {
        let s = f.n.strip_suffix(".jsonl").unwrap_or(&f.n);
        for x in list_names(&f.d.join(s).join("subagents")).unwrap_or_default() {
            if x.starts_with(&start) && x.ends_with(".jsonl") {
                hits.push((f, agent_id(&x)));
            }
        }
    }
    let [(hit, hit_id)] = hits.as_slice() else {
        let why = if hits.is_empty() {
            format!("no helper {aid} in the sessions of {}", project.display())
        } else {
            let ids: Vec<&str> = hits.iter().map(|h| h.1.as_str()).collect();
            format!(
                "{aid} names {} helpers ({}); give more characters",
                hits.len(),
                ids.join(", ")
            )
        };
        return Err(Stop::fail(&why));
    };
    let s = session(&hit.d, &hit.n, objs)?;
    let Some(h) = s.helpers.iter().find(|x| x.id == *hit_id) else {
        return Err(Stop::thrown(
            "TypeError: Cannot read properties of undefined (reading 'tokens')",
        ));
    };
    let file = project.join(".harness").join("basis.json");
    let shown = file.display();
    let mut list: Vec<J> = Vec::new();
    if file.exists() {
        match ojson::parse(&read_text(&file)) {
            Some(J::Arr(items)) => list = items,
            Some(_) => return Err(Stop::fail(&format!("{shown} does not hold a list"))),
            None => return Err(Stop::fail(&format!("{shown} is not JSON; fix it first"))),
        }
    }
    let top = list
        .iter()
        .filter(|e| e.truthy())
        .filter_map(|e| e.get("id").filter(|v| v.truthy()))
        .filter_map(|v| own_number(&v.to_js_string()))
        .max()
        .unwrap_or(0);
    let id = format!("own-{:04}", top.saturating_add(1));
    let model = if js::truthy(&h.model) {
        js::to_string(&h.model)
    } else {
        "an unknown model".to_owned()
    };
    let claim = format!(
        "{}: {} tokens ({}), {} messages on {model}; helper \"{}\", agent {}, session {}; counted as the fan-out gate counts",
        js::trim(what),
        locale(&h.tokens),
        fmt(h.tokens.number()),
        h.messages,
        h.description,
        h.id,
        cut(&s.id, 8)
    );
    list.push(J::Obj(vec![
        (js::utf16("id"), J::text(&id)),
        (js::utf16("status"), J::text("measured")),
        (js::utf16("date"), J::text(&local_date())),
        (js::utf16("claim"), J::text(&claim)),
    ]));
    let io = |e: std::io::Error| Stop::thrown(&format!("Error: {e}"));
    std::fs::create_dir_all(project.join(".harness")).map_err(io)?;
    let mut tmp = file.clone().into_os_string();
    tmp.push(".tmp");
    std::fs::write(&tmp, format!("{}\n", ojson::stringify(&J::Arr(list)))).map_err(io)?;
    std::fs::rename(&tmp, &file).map_err(io)?;
    let limit = (h.tokens.number() * 1.5 / 1e5).ceil() * 1e5;
    Ok(format!(
        "added {id} to {shown}:\n  {claim}\nA limit on similar work: token limit {} (expected about {}, basis {id})\n",
        fmt(limit),
        fmt(h.tokens.number())
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_figure_prints_as_en_us_prints_it() {
        let cases = [
            (1_200_000.0, "1,200,000"),
            (999.0, "999"),
            (1234.5678, "1,234.568"),
            (0.9995, "1"),
            (-0.0, "-0"),
            (1e21, "1,000,000,000,000,000,000,000"),
        ];
        for (x, want) in cases {
            assert_eq!(locale_number(x), want);
        }
    }

    #[test]
    fn fmt_is_millions_or_thousands() {
        assert_eq!(fmt(1_200_000.0), "1.20 M");
        assert_eq!(fmt(4000.0), "4.0 K");
    }

    #[test]
    fn a_slug_makes_every_other_unit_a_dash() {
        assert_eq!(slug("C:\\Users\\a b\u{1f600}"), "C--Users-a-b--");
    }

    #[test]
    fn take_removes_the_flag_and_its_value() {
        let mut a: Vec<String> = vec!["x".to_owned(), "--basis".to_owned()];
        assert_eq!(take(&mut a, "--basis"), Some(String::new()));
        assert_eq!(a, ["x"]);
        assert_eq!(take(&mut a, "--project"), None);
    }

    #[test]
    fn own_numbers_are_four_digits() {
        assert_eq!(own_number("own-0042"), Some(42));
        assert_eq!(own_number("own-42"), None);
        assert_eq!(own_number("own-00042"), None);
    }

    #[test]
    fn helper_file_names_are_those_the_pattern_takes() {
        assert!(is_agent_file("agent-a1.jsonl"));
        assert!(!is_agent_file("agent-.jsonl"));
        assert!(!is_agent_file("agent-a\n.jsonl"));
    }
}
