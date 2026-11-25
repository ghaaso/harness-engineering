//! kit-fanout-gate: the port of `.claude/hooks/fanout-gate.mjs` (PreToolUse on Agent and Task).
//!
//! Every helper start states a token limit with an expected figure and a measured basis (a record with status
//! `measured` or `observed`); under a cap in the session's state file, the tokens spent plus the rest of every
//! running helper's limit plus this limit must stay under it; and the meter (`get_usage`) must have been read in
//! an earlier message, after the previous wave, recently, and under the state file's meter lines.
//!
//! The root is the project in kit mode (`--harness-kit`), else `FANOUT_GATE_ROOT`, else the clone. The time is
//! `FANOUT_GATE_NOW` when set. Every decision is logged to `<root>/.claude/logs/fanout-gate.jsonl`. It fails open:
//! where the JavaScript throws, the error is logged and the start passes; unreadable input passes unlogged.

mod cap;
mod fsx;
mod jsadd;
mod jsv;
mod limit;
mod lines;
mod meter;
mod patterns;
mod state;

use jsv::{Js, Thrown};
use kit_core::context::{Context, Kit};
use kit_core::input::{self, Input};
use kit_core::js;
use kit_core::log::{self, Record};
use kit_core::outcome::Outcome;
use kit_core::paths;
use patterns::Patterns;
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

fn main() -> ExitCode {
    let ctx = Context::from_env();
    let env = |k: &str| {
        std::env::var_os(k)
            .map(|v| v.to_string_lossy().into_owned())
            .filter(|v| !v.is_empty())
    };
    let now = match env("FANOUT_GATE_NOW") {
        Some(t) => js::date_parse(&t).map_or(f64::NAN, jsv::to_f64_signed),
        None => jsv::to_f64(js::now_ms()),
    };
    let root = env("FANOUT_GATE_ROOT");
    run(&ctx, &input::read_stdin(), now, root.as_deref()).finish()
}

/// Where the hook reads and writes, as the JavaScript works it out at its start.
pub struct Where<'a> {
    /// `ROOT`: the project in kit mode, else `FANOUT_GATE_ROOT` (resolved), else the clone.
    pub root: PathBuf,
    /// `<root>/.claude/logs`.
    pub logdir: PathBuf,
    /// Kit mode's folders.
    pub kit: Option<&'a Kit>,
    /// The clone (kit mode reads `<clone>/harness-kit/basis.json`).
    pub clone: &'a Path,
    /// `NOW`, in milliseconds (NaN where `FANOUT_GATE_NOW` is not a date).
    pub now: f64,
}

impl<'a> Where<'a> {
    /// The places for this context; `root_env` is `FANOUT_GATE_ROOT` when set and not empty.
    fn new(ctx: &'a Context, root_env: Option<&str>, now: f64) -> Self {
        let root = match (&ctx.kit, root_env) {
            (Some(k), _) => k.project.clone(),
            (None, Some(r)) => paths::resolve(&ctx.cwd, &[r]),
            (None, None) => ctx.clone.clone(),
        };
        Self {
            logdir: root.join(".claude").join("logs"),
            root,
            kit: ctx.kit.as_ref(),
            clone: &ctx.clone,
            now,
        }
    }
}

/// How a decision ends.
enum End {
    /// Not the gate's business: pass, no log line.
    Quiet,
    /// Allowed: logged.
    Allow,
    /// Refused: logged, the reason on standard error.
    Deny(String),
}

/// The hook's work for one input at time `now` (ms); `root_env` is `FANOUT_GATE_ROOT`.
fn run(ctx: &Context, input: &Input, now: f64, root_env: Option<&str>) -> Outcome {
    let Input::Json(j) = input else {
        return Outcome::Pass;
    };
    let w = Where::new(ctx, root_env, now);
    let mut rec = Record::new().num("t", now);
    let end = Patterns::new()
        .map_err(|e| Thrown(e.to_string()))
        .and_then(|p| decide(&p, &w, j, &mut rec));
    let write = |r: &Record| log::append(&w.logdir, "fanout-gate.jsonl", r);
    match end {
        Ok(End::Quiet) => Outcome::Pass,
        Ok(End::Allow) => {
            write(&rec.str("decision", "allow"));
            Outcome::Pass
        }
        Ok(End::Deny(why)) => {
            write(&rec.str("decision", "deny").str("why", &why));
            Outcome::Refuse(why)
        }
        Err(Thrown(msg)) => {
            let mut note = js::utf16("error: ");
            let mut m = js::utf16(&msg);
            m.truncate(160);
            note.extend(m);
            write(
                &rec.str("decision", "allow")
                    .raw("note", js::quote_utf16(&note)),
            );
            Outcome::Pass
        }
    }
}

/// `fmt(n)`: millions with one decimal.
fn fmt(n: f64) -> String {
    format!("{} M", js::to_fixed(n / 1e6, 1))
}

/// A JSON list of strings, as `JSON.stringify` writes it.
fn json_list(items: &[String]) -> String {
    let parts: Vec<String> = items.iter().map(|s| js::quote(s)).collect();
    format!("[{}]", parts.join(","))
}

/// The main block of the JavaScript, inside its `try`.
fn decide(p: &Patterns, w: &Where<'_>, j: &Value, rec: &mut Record) -> Js<End> {
    if !js::truthy(j)
        || !jsv::is_str(j.get("hook_event_name"), "PreToolUse")
        || !matches!(js::display(j.get("tool_name")).as_str(), "Agent" | "Task")
    {
        return Ok(End::Quiet);
    }
    let ti = j
        .get("tool_input")
        .filter(|t| t.is_object() || t.is_array());
    let field = |k: &str| ti.and_then(|t| t.get(k));
    let sess = jsv::text_or_empty(j.get("session_id"));
    let tu = j.get("tool_use_id");
    let sess_cut = {
        let mut u = js::utf16(&sess);
        u.truncate(8);
        u
    };
    rec.set("session", js::quote_utf16(&sess_cut));
    rec.set(
        "tu",
        tu.and_then(Value::as_str).map_or_else(null, js::quote),
    );
    let agent = j.get("agent_id").filter(|a| js::truthy(a));
    rec.set(
        "agent_id",
        agent.map_or_else(null, |a| cut(&js::to_string(a), 17)),
    );
    rec.set("desc", cut(&jsv::text_or_empty(field("description")), 60));

    // 1. The limit and its basis.
    // A cut inside a surrogate pair cannot name a state file (the JavaScript's pattern then matches no text).
    let st = match String::from_utf16(&sess_cut) {
        Ok(s8) if !sess.is_empty() => state::state_file(p, w, &s8.to_lowercase())?,
        _ => None,
    };
    let s = limit::stated_limit(p, w, field("prompt"));
    let form = "token limit L M (expected about E M, basis <record id>)";
    if let Some(s) = &s {
        rec.set("limit", num(s.limit));
        rec.set("expected", s.expected.map_or_else(null, num));
        rec.set("ids", json_list(&s.ids));
        rec.set("in", js::quote(&s.place));
        let Some(expected) = s.expected else {
            return Ok(End::Deny(format!(
                "fanout gate (r57-0038): the limit in {} has no expected figure on its line; write \"{form}\".",
                s.place
            )));
        };
        let above = s.limit > expected;
        if !above {
            return Ok(End::Deny(format!(
                "fanout gate (r57-0038): the limit {} is not above the expected {}; a limit is the measured need plus a buffer.",
                fmt(s.limit),
                fmt(expected)
            )));
        }
        if s.ids.is_empty() {
            return Ok(End::Deny(format!(
                "fanout gate (r57-0038, r57-0617): the limit in {} cites no record for its expected figure; write \"{form}\", the record being one that measured similar work.",
                s.place
            )));
        }
        let journal = limit::Journal::load(p, w);
        let missing: Vec<&str> = s
            .ids
            .iter()
            .filter(|id| journal.status(id).is_none())
            .map(String::as_str)
            .collect();
        if !missing.is_empty() {
            let where_ = if w.kit.is_some() {
                "library/journal, harness-kit/basis.json or .harness/basis.json"
            } else {
                "library/journal"
            };
            let hint = if w.kit.is_some() {
                " (node harness-kit/tokens.mjs --basis \"<what was measured>\" <agent id> adds one of your own)"
            } else {
                ""
            };
            return Ok(End::Deny(format!(
                "fanout gate (r57-0038): {} cited in {} is not in {where_}; cite an existing record{hint}.",
                missing.join(", "),
                s.place
            )));
        }
        if !s
            .ids
            .iter()
            .any(|id| matches!(journal.status(id), Some("measured" | "observed")))
        {
            return Ok(End::Deny(format!(
                "fanout gate (r57-0038, r57-0617): none of {} is a measured or observed record; cite the record that measured similar work.",
                s.ids.join(", ")
            )));
        }
    } else if let Some(cap) = st.as_ref().and_then(|st| st.cap) {
        let rel = st.as_ref().map_or("", |st| st.rel.as_str());
        return Ok(End::Deny(format!(
            "fanout gate (r57-0614): this session runs under a cap of {} ({rel}); state the helper's limit in its prompt as \"{form}\".",
            fmt(cap)
        )));
    }

    // 2. The meter, read in an earlier message, after the previous wave.
    let transcript = jsv::text_or_empty(j.get("transcript_path"));
    let proj_dir = fsx::dirname(&transcript);
    let in_subagents = |t: &str| {
        t.contains("/subagents/")
            || t.contains("\\subagents/")
            || t.contains("/subagents\\")
            || t.contains("\\subagents\\")
    };
    let mut own = transcript;
    if let Some(agent) = j.get("agent_id").filter(|a| js::truthy(a))
        && !in_subagents(&own)
    {
        let a = js::to_string(agent);
        let id = a.strip_prefix("agent-").unwrap_or(&a);
        let name = format!("agent-{id}.jsonl");
        let base = fsx::basename(Path::new(&own));
        let stem = base.strip_suffix(".jsonl").unwrap_or(&base);
        let mut found = Vec::new();
        fsx::files(
            &proj_dir.join(stem).join("subagents"),
            &|n: &str| n == name,
            &mut found,
        );
        own = found
            .first()
            .map(|f| f.to_string_lossy().into_owned())
            .unwrap_or_default();
    }
    if w.kit.is_some_and(|k| !k.usage_tool) {
        rec.set(
            "note",
            js::quote("meter rule off: --no-usage-tool (no tool reads the plan's usage here)"),
        );
    } else if own.is_empty() || !Path::new(&own).exists() {
        rec.set(
            "note",
            js::quote("caller transcript not found; meter not checked"),
        );
    } else if let Some(why) = meter::check(&lines::read(Path::new(&own)), tu, st.as_ref(), w.now)? {
        return Ok(End::Deny(format!("fanout gate: {why}.")));
    }

    // 3. The cap.
    if let (Some(st), Some(s)) = (&st, &s)
        && let Some(cap_limit) = st.cap
    {
        let path_text = js::display(j.get("transcript_path"));
        let main = if in_subagents(&path_text) {
            paths::resolve(&paths::cwd(), &[&proj_dir.to_string_lossy(), "..", ".."])
        } else {
            proj_dir
        };
        let c = cap::check(p, w, st, &main, tu, s.limit)?;
        rec.set("cap", num(cap_limit));
        rec.set("spent", prim_json(&c.spent));
        rec.set("reserve", num(c.reserve));
        rec.set("running", c.running.to_string());
        if c.total.number() > cap_limit {
            return Ok(End::Deny(format!(
                "fanout gate (r57-0614): spent {} + the rest of {} running helpers' limits {} + this limit {} = {}, past the cap of {} in {}; wait for a helper to end, or ask the owner with cap:.",
                fmt(c.spent.number()),
                c.running,
                fmt(c.reserve),
                fmt(s.limit),
                fmt(c.total.number()),
                fmt(cap_limit),
                st.rel
            )));
        }
    }
    Ok(End::Allow)
}

/// `null` as JSON text.
fn null() -> String {
    "null".to_owned()
}

/// A number as `JSON.stringify` writes it (`null` for NaN and the infinities).
fn num(x: f64) -> String {
    if x.is_finite() {
        js::number_to_string(x)
    } else {
        null()
    }
}

/// A sum as `JSON.stringify` writes it: a number, or the text a string field made of it.
fn prim_json(p: &jsadd::Prim) -> String {
    match p {
        jsadd::Prim::Str(s) => js::quote(s),
        other => num(other.number()),
    }
}

/// `String(s).slice(0, units)` as JSON text (a cut surrogate pair written as JavaScript writes it).
fn cut(s: &str, units: usize) -> String {
    let mut u = js::utf16(s);
    u.truncate(units);
    js::quote_utf16(&u)
}
