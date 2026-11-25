//! kit-window-ceiling: the port of `.claude/hooks/window-ceiling.mjs` (PreToolUse, matcher `*`).
//!
//! A session does not run on past its context line: from the warning line every call passes with a notice; at the
//! hard line only the calls that serve the hand-over pass, every other call is refused (exit 2, one line). Every
//! decision is logged to `window-ceiling.jsonl`; any error passes the call (logged). Modes: `--test <session> <scale>
//! <minutes> [agent]`, `--test-off`, `--show <transcript> [helper|coordinator]`. Environment: `WINDOW_CEILING_LOGDIR`,
//! `WINDOW_CEILING_BUILD`, `WINDOW_CEILING_SETTINGS`.

mod handover;
mod jsx;
mod limits;
mod reading;

use handover::{Patterns, Where};
use kit_core::context::Context;
use kit_core::input::{self, Input};
use kit_core::js;
use kit_core::log::{self, Record};
use kit_core::outcome::Outcome;
use kit_core::paths;
use limits::Kind;
use serde_json::Value;
use std::path::PathBuf;
use std::process::ExitCode;

/// The ruling of version 3 (a Fable transcript is held by the compaction cap only).
const FABLE_ID: &str = "r58-0001";
const LOG_FILE: &str = "window-ceiling.jsonl";

fn main() -> ExitCode {
    let ctx = Context::from_env();
    let env = Env::from_env();
    run(&ctx, &env, input::read_stdin, js::now_ms()).finish()
}

/// The environment variables the hook reads (an empty one counts as unset, as `||` does).
#[derive(Debug, Default)]
struct Env {
    logdir: Option<String>,
    build: Option<String>,
    settings: Option<String>,
    home: Option<PathBuf>,
}

impl Env {
    fn from_env() -> Self {
        let var = |k: &str| {
            std::env::var_os(k)
                .map(|v| v.to_string_lossy().into_owned())
                .filter(|v| !v.is_empty())
        };
        Self {
            logdir: var("WINDOW_CEILING_LOGDIR"),
            build: var("WINDOW_CEILING_BUILD"),
            settings: var("WINDOW_CEILING_SETTINGS"),
            home: var(if cfg!(windows) { "USERPROFILE" } else { "HOME" }).map(PathBuf::from),
        }
    }
}

/// The folders and files the hook uses.
struct Places {
    root: PathBuf,
    logdir: PathBuf,
    build: PathBuf,
    settings: Vec<PathBuf>,
}

impl Places {
    fn new(ctx: &Context, env: &Env) -> Self {
        let root = handover::root_of(ctx.kit.as_ref(), &ctx.clone);
        let logdir = env
            .logdir
            .as_ref()
            .map_or_else(|| root.join(".claude").join("logs"), PathBuf::from);
        let build = env.build.as_ref().map_or_else(
            || match &ctx.kit {
                Some(k) => k.state.clone(),
                None => root.join("research-tree").join("build"),
            },
            PathBuf::from,
        );
        let user = env.settings.as_ref().map_or_else(
            || {
                env.home
                    .clone()
                    .unwrap_or_default()
                    .join(".claude")
                    .join("settings.json")
            },
            PathBuf::from,
        );
        let settings = vec![
            user,
            root.join(".claude").join("settings.json"),
            root.join(".claude").join("settings.local.json"),
        ];
        Self {
            root,
            logdir,
            build,
            settings,
        }
    }

    fn log(&self, rec: &Record) {
        log::append(&self.logdir, LOG_FILE, rec);
    }

    fn test_file(&self) -> PathBuf {
        self.logdir.join("window-ceiling-test.json")
    }
}

/// The program: a mode named by the first argument, else the hook (stdin read only then).
fn run(ctx: &Context, env: &Env, stdin: impl FnOnce() -> Input, now: u64) -> Outcome {
    let places = Places::new(ctx, env);
    match ctx.args.first().map(String::as_str) {
        Some("--test") => test_on(ctx, &places, now),
        Some("--test-off") => {
            std::fs::remove_file(places.test_file()).unwrap_or_default();
            places.log(&Record::new().int("t", now).str("ev", "test-off"));
            Outcome::Say("window ceiling: test scale removed\n".to_owned())
        }
        Some("--show") => show(ctx, &places),
        _ => hook(ctx, &places, &stdin(), now),
    }
}

fn test_on(ctx: &Context, places: &Places, now: u64) -> Outcome {
    let arg = |i: usize| ctx.args.get(i).map(String::as_str);
    let sess = arg(1).unwrap_or("");
    let sc = arg(2).map_or(f64::NAN, jsx::number_of_str);
    let min = arg(3).map_or(f64::NAN, jsx::number_of_str);
    if sess.is_empty()
        || !(sc > 0.0 && sc < 1.0)
        || min.partial_cmp(&0.0) != Some(std::cmp::Ordering::Greater)
    {
        return Outcome::Fail("usage: node .claude/hooks/window-ceiling.mjs --test <full session id> <scale, 0 to 1> <minutes> [agent id]".to_owned());
    }
    let agent = arg(4).filter(|a| !a.is_empty());
    let at = (jsx::f64_of(now) + min * 60_000.0).trunc();
    let ms = (at.abs() <= 8.64e15)
        .then(|| format!("{at:.0}").parse::<i64>().ok())
        .flatten();
    let Some(expires) = ms.and_then(js::iso_string) else {
        return Outcome::Fail("RangeError: Invalid time value".to_owned());
    };
    let t = Record::new()
        .str("session", sess)
        .opt_str("agent", agent)
        .num("scale", sc)
        .str("expires", &expires);
    let written = std::fs::create_dir_all(&places.logdir)
        .and_then(|()| std::fs::write(places.test_file(), format!("{}\n", t.to_json())));
    if let Err(e) = written {
        return Outcome::Fail(format!("window ceiling: {e}"));
    }
    places.log(
        &Record::new()
            .int("t", now)
            .str("ev", "test-on")
            .str("session", sess)
            .opt_str("agent", agent)
            .num("scale", sc)
            .str("expires", &expires),
    );
    Outcome::Say(format!(
        "window ceiling: lines x {} for session {}{} until {expires}\n",
        js::number_to_string(sc),
        jsx::cut(sess, 8),
        agent.map(|a| format!(" helper {a}")).unwrap_or_default()
    ))
}

fn show(ctx: &Context, places: &Places) -> Outcome {
    let Some(file) = ctx.args.get(1) else {
        return Outcome::Fail(
            "TypeError [ERR_INVALID_ARG_TYPE]: The \"paths[0]\" argument must be of type string. Received undefined"
                .to_owned(),
        );
    };
    let kind = match ctx.args.get(2).map(String::as_str) {
        Some("helper") => Kind::Helper,
        Some("coordinator") => Kind::Coordinator,
        _ => Kind::Session,
    };
    let path = paths::resolve(&ctx.cwd, &[file])
        .to_string_lossy()
        .into_owned();
    match reading::read_transcript(&path, kind == Kind::Helper, None) {
        Ok(s) => Outcome::Say(format!(
            "{}\n",
            limits::lines(&s, kind, &places.settings).show_json()
        )),
        Err(e) => Outcome::Fail(format!("Error: {e}")),
    }
}

/// The test scale for this call: only for the named session (and helper), only while it lasts, only below 1.
fn test_scale(j: &Value, file: &std::path::Path, now: u64) -> Option<f64> {
    let bytes = std::fs::read(file).ok()?;
    let t = input::parse_text(&String::from_utf8_lossy(&bytes))?;
    let session = t.get("session")?.as_str()?;
    if js::len(session) < 8 || j.get("session_id").and_then(Value::as_str) != Some(session) {
        return None;
    }
    let strip = |v: &Value| {
        let s = js::to_string(v);
        s.strip_prefix("agent-")
            .map_or_else(|| s.clone(), str::to_owned)
    };
    let agent = j.get("agent_id").filter(|v| js::truthy(v)).map(strip);
    let want = t.get("agent").filter(|v| js::truthy(v)).map(strip);
    if want != agent {
        return None;
    }
    let exp = js::date_parse(&js::display(t.get("expires")))?;
    if !(i64::try_from(now).is_ok_and(|n| exp > n)) {
        return None;
    }
    let sc = jsx::number_of(t.get("scale"));
    (sc > 0.0 && sc < 1.0).then_some(sc)
}

/// `Math.round(x) || null` as a log value.
fn round_or_null(r: Record, key: &str, x: f64) -> Record {
    let v = js::round(x);
    if v.is_nan() || v.abs() < f64::MIN_POSITIVE {
        r.null(key)
    } else {
        r.num(key, v)
    }
}

fn hook(ctx: &Context, places: &Places, input: &Input, now: u64) -> Outcome {
    let Input::Json(j) = input else {
        places.log(
            &Record::new()
                .int("t", now)
                .str("decision", "allow")
                .str("note", "hook input unreadable"),
        );
        return Outcome::Pass;
    };
    if !js::truthy(j) || j.get("hook_event_name").and_then(Value::as_str) != Some("PreToolUse") {
        return Outcome::Pass;
    }
    let agent = j.get("agent_id").filter(|v| js::truthy(v)).map(|v| {
        let s = js::to_string(v);
        s.strip_prefix("agent-")
            .map_or_else(|| s.clone(), str::to_owned)
    });
    let mut rec = Record::new().int("t", now);
    rec = match j.get("session_id").and_then(Value::as_str) {
        Some(s) => rec.cut("session", s, 8),
        None => rec.null("session"),
    };
    rec = rec.opt_str("agent", agent.as_deref());
    let tool = j
        .get("tool_name")
        .filter(|v| js::truthy(v))
        .map(js::to_string)
        .unwrap_or_default();
    rec = rec.cut("tool", &tool, 60);
    match decide(
        ctx,
        places,
        j,
        agent.as_deref().filter(|a| !a.is_empty()),
        &rec,
        now,
    ) {
        Ok(o) => o,
        Err(e) => {
            let mut note = js::utf16(&format!("error: {e}"));
            note.truncate(127);
            places.log(
                &rec.str("decision", "allow")
                    .raw("note", js::quote_utf16(&note)),
            );
            Outcome::Pass
        }
    }
}

fn decide(
    ctx: &Context,
    places: &Places,
    j: &Value,
    agent: Option<&str>,
    rec: &Record,
    now: u64,
) -> Result<Outcome, String> {
    let allow = |r: Record| {
        places.log(&r.str("decision", "allow"));
        Ok(Outcome::Pass)
    };
    let tp = j
        .get("transcript_path")
        .and_then(Value::as_str)
        .unwrap_or("");
    if tp.is_empty() {
        let r = rec.clone().str("decision", "allow");
        places.log(&r.str("note", "no transcript_path"));
        return Ok(Outcome::Pass);
    }
    let mut path = tp.to_owned();
    let mut src = "own";
    if let Some(a) = agent {
        if !tp.replace('\\', "/").ends_with(&format!("agent-{a}.jsonl")) {
            let base = jsx::basename(tp);
            let joined = PathBuf::from(jsx::dirname(tp))
                .join(base.strip_suffix(".jsonl").unwrap_or(base))
                .join("subagents")
                .join(format!("agent-{a}.jsonl"));
            path = paths::normalize(&joined).to_string_lossy().into_owned();
            src = "derived";
        }
        if !std::path::Path::new(&path).exists() {
            let r = rec.clone().str("src", "none").str("decision", "allow");
            places.log(&r.str("note", "helper transcript not found"));
            return Ok(Outcome::Pass);
        }
    }
    if !std::path::Path::new(&path).exists() {
        let r = rec.clone().str("src", "none").str("decision", "allow");
        places.log(&r.str("note", "transcript not found"));
        return Ok(Outcome::Pass);
    }
    let s = reading::read_transcript(
        &path,
        agent.is_some(),
        Some(&places.logdir.join("window-ceiling-state")),
    )?;
    if s.n == 0 {
        let r = rec.clone().str("src", src).str("decision", "allow");
        places.log(&r.str("note", "no call with usage yet"));
        return Ok(Outcome::Pass);
    }
    let sc = test_scale(j, &places.test_file(), now);
    let mut kind = if agent.is_some() {
        Kind::Helper
    } else {
        Kind::Coordinator
    };
    let mut l = limits::lines(&s, kind, &places.settings);
    let mut by = None;
    if agent.is_none() && l.ctx >= l.warn * sc.unwrap_or(1.0) {
        by = handover::is_coordinator(j.get("session_id"), &places.build, ctx.kit.is_some());
        if by.is_none() {
            kind = Kind::Session;
            l = limits::lines(&s, kind, &places.settings);
        }
    }
    if let Some(sc) = sc {
        l.hard *= sc;
        l.warn *= sc;
    }
    let mut base = rec.clone().str("src", src).num("ctx", l.ctx);
    base = round_or_null(base, "warn", l.warn);
    base = round_or_null(base, "line", l.hard);
    base = base
        .num("g", js::round(l.g))
        .str("gFrom", if l.own { "own" } else { "recorded" })
        .str("kind", kind.name());
    if let Some(b) = &by {
        base = base.str("by", b);
    }
    if kind == Kind::Coordinator
        && let Some(h) = l.hand
    {
        base = base.num("W", js::round(h.wstar));
    }
    base = base.raw("model", jsx::stringify(&l.model));
    if l.fable {
        base = base.str("form", "fable");
    }
    if let Some(sc) = sc {
        base = base.num("test", sc);
    }
    let coord = kind == Kind::Coordinator;
    let who = if coord { "hand-over" } else { "checkpoint" };
    let ids = if l.fable {
        format!("r57-0008, r57-0056, {FABLE_ID}")
    } else {
        "r57-0008, r57-0056".to_owned()
    };
    let fnote = if l.fable {
        format!(" (Fable: the compaction cap only, {FABLE_ID})")
    } else {
        String::new()
    };
    if l.ctx >= l.hard {
        let w = Where {
            root: &places.root,
            cwd: &ctx.cwd,
            kit: ctx.kit.as_ref(),
        };
        let pats = Patterns::new().map_err(|e| e.to_string())?;
        if let Some(why) = handover::handover_call(j, &w, &pats)? {
            places.log(&base.str("decision", "allow").str("why", why));
            return Ok(Outcome::Pass);
        }
        let what = match (ctx.kit.is_some(), agent.is_some(), coord) {
            (true, true, _) => "result under .harness/units/, then return",
            (true, false, true) => {
                "a .harness/<NAME>-STATE.md file, a brief under .harness/briefs/, git commit"
            }
            (true, false, false) => {
                "a .harness/<NAME>-STATE.md file or a result under .harness/units/, git commit"
            }
            (false, true, _) => "result under research-tree/build/units/, then return",
            (false, false, true) => "STATE or TOP-STATE file, a brief, the journal, git commit",
            (false, false, false) => {
                "a STATE file or a result under research-tree/build/units/, the journal, git commit"
            }
        };
        let whose = if agent.is_some() {
            "helper"
        } else if coord {
            "coordinator"
        } else {
            "session"
        };
        let scale = sc.map_or_else(String::new, |s| {
            format!(" (test scale {})", js::number_to_string(s))
        });
        let then = if agent.is_some() {
            "return LIMIT"
        } else {
            "say a fresh session is needed and stop"
        };
        let why = format!(
            "window ceiling ({ids}): context {} is past this {whose}'s line of {}{fnote}{scale}; only the {who} passes now: write it ({what}), then {then}.",
            limits::kfmt(l.ctx),
            limits::kfmt(l.hard)
        );
        places.log(&base.str("decision", "deny"));
        return Ok(Outcome::Refuse(why));
    }
    if l.ctx >= l.warn {
        places.log(&base.str("decision", "notice"));
        let calls = jsx::max(0.0, js::round((l.hard - l.ctx) / jsx::max(l.g, 1.0)));
        let text = format!(
            "Window ceiling: context {}; {} {}, hard line {}{fnote} (about {} calls at {} a call). A {who} is due: go to the first quiet point and write it ({ids}). Past the line only {who} calls pass.",
            limits::kfmt(l.ctx),
            if coord {
                "hand-over point"
            } else {
                "checkpoint"
            },
            limits::kfmt(l.warn),
            limits::kfmt(l.hard),
            js::number_to_string(calls),
            limits::kfmt(l.g)
        );
        return Ok(Outcome::context("PreToolUse", &text));
    }
    allow(base)
}
