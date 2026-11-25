//! kit-creep-gate: the port of `.claude/hooks/creep-gate.mjs` (PreToolUse on Agent and Task; no procedural creep,
//! r57-0063).
//!
//! Refuses a review while nothing was written since the last review finished, a review while another runs, a review
//! of a review, a third review of one piece, a repair round on findings that are not breaking, and a review or check
//! aimed elsewhere before the stated deliverable changed. Every start that passes gets one line of context. A prompt
//! line `owner: r57-NNNN` naming a journal record whose status is `owner` passes every rule.
//!
//! The root is `<project>` with `--harness-kit`, else `CREEP_GATE_ROOT`, else the clone. Its log is
//! `<root>/.claude/logs/creep-gate.jsonl`. It fails open: unreadable input or its own error passes and is logged.
//! `--replay <session id or transcript path> [--deliverable <path>]` prints the decisions over a finished session.

mod decide;
mod rules;
mod session;

use decide::{Cur, Decision, decide, fmt_tok};
use kit_core::context::Context;
use kit_core::input::{self, Input};
use kit_core::js;
use kit_core::log::{self, Record};
use kit_core::outcome::Outcome;
use kit_core::paths;
use kit_core::transcript;
use rules::{Patterns, Place, owner_id};
use serde_json::{Map, Value};
use session::{MAIN, Session, id_key, load, ms_u, mtime_of, text_or_empty, walk};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

/// The log file's name.
const LOG: &str = "creep-gate.jsonl";

fn main() -> ExitCode {
    let ctx = Context::from_env();
    let env_root = std::env::var_os("CREEP_GATE_ROOT").map(|v| v.to_string_lossy().into_owned());
    // The replay reads no input: it must not wait on a terminal's standard input.
    if ctx.args.first().map(String::as_str) == Some("--replay") {
        return replay(&ctx, env_root.as_deref(), &home()).finish();
    }
    run(
        &ctx,
        env_root.as_deref(),
        &input::read_stdin(),
        js::now_ms(),
    )
    .finish()
}

/// `os.homedir()`: `USERPROFILE` on Windows, `HOME` elsewhere.
fn home() -> PathBuf {
    let var = if cfg!(windows) { "USERPROFILE" } else { "HOME" };
    std::env::var_os(var).map_or_else(paths::cwd, PathBuf::from)
}

/// `ROOT`: the project in kit mode, else `CREEP_GATE_ROOT` (when not empty) resolved, else the clone.
fn place<'c>(ctx: &'c Context, env_root: Option<&str>) -> Place<'c> {
    let root = match (&ctx.kit, env_root.filter(|r| !r.is_empty())) {
        (Some(k), _) => k.project.clone(),
        (None, Some(r)) => paths::resolve(&ctx.cwd, &[r]),
        (None, None) => ctx.clone.clone(),
    };
    Place::new(root, ctx.kit.as_ref())
}

/// `sessDirOf(tp)`: the session's folder (its transcript path without `.jsonl`, or the part before `/subagents/`).
fn sess_dir_of(tp: &str) -> String {
    let sep = |c: char| c == '/' || c == '\\';
    let found = tp.match_indices("subagents").find(|&(at, w)| {
        let before = tp.get(..at).and_then(|b| b.chars().next_back());
        let after = tp
            .get(at.saturating_add(w.len())..)
            .and_then(|a| a.chars().next());
        before.is_some_and(sep) && after.is_some_and(sep)
    });
    match found {
        Some((at, _)) => tp.get(..at.saturating_sub(1)).unwrap_or("").to_owned(),
        None => tp.strip_suffix(".jsonl").unwrap_or(tp).to_owned(),
    }
}

/// `ownerRecord(p)`: the prompt names a journal record (`owner: r57-NNNN`) whose status is `owner`.
fn owner_record(root: &Path, prompt: &str) -> bool {
    let Some(id) = owner_id(prompt) else {
        return false;
    };
    let needle = format!("\"id\":\"{id}\"");
    let mut files = Vec::new();
    walk(&root.join("library").join("journal"), &mut files);
    for f in files
        .iter()
        .filter(|f| f.to_string_lossy().ends_with(".jsonl"))
    {
        if let Some(l) = transcript::lines(f).find(|l| l.contains(&needle)) {
            return input::parse_text(&l)
                .is_some_and(|o| o.get("status").and_then(Value::as_str) == Some("owner"));
        }
    }
    false
}

/// The hook: the outcome for one input at time `now` (ms), its log line written.
fn run(ctx: &Context, env_root: Option<&str>, input: &Input, now: u64) -> Outcome {
    let place = place(ctx, env_root);
    let logs = place.root.join(".claude").join("logs");
    let write = |r: &Record| log::append(&logs, LOG, r);
    let Input::Json(j) = input else {
        write(
            &Record::new()
                .int("t", now)
                .str("decision", "allow")
                .str("why", "unreadable input"),
        );
        return Outcome::Pass;
    };
    let empty = Value::Object(Map::new());
    let ti = j
        .get("tool_input")
        .filter(|v| v.is_object() || v.is_array())
        .unwrap_or(&empty);
    let agent_id = j
        .get("agent_id")
        .filter(|v| js::truthy(v))
        .map(js::to_string);
    let tu = j.get("tool_use_id").filter(|v| v.is_string());
    let desc = text_or_empty(ti.get("description"));
    let mut rec =
        Record::new()
            .int("t", now)
            .cut("session", &text_or_empty(j.get("session_id")), 8);
    rec = match &agent_id {
        Some(a) => rec.cut("agent_id", a, 17),
        None => rec.null("agent_id"),
    };
    rec = rec
        .opt_str("tu", tu.and_then(Value::as_str))
        .cut("desc", &desc, 60);
    let helper_start = js::truthy(j)
        && j.get("hook_event_name").and_then(Value::as_str) == Some("PreToolUse")
        && matches!(js::display(j.get("tool_name")).as_str(), "Agent" | "Task");
    if !helper_start {
        write(
            &rec.str("decision", "allow")
                .str("why", "not a helper start"),
        );
        return Outcome::Pass;
    }
    let prompt = text_or_empty(ti.get("prompt"));
    let tu_key = id_key(Some(tu.unwrap_or(&Value::Null)));
    let who = agent_id.as_deref().map_or_else(
        || MAIN.to_owned(),
        |a| a.strip_prefix("agent-").unwrap_or(a).to_owned(),
    );
    let call = Call {
        place: &place,
        logs: &logs,
        tp: &text_or_empty(j.get("transcript_path")),
        tu: &tu_key,
        who: &who,
        desc: &desc,
        prompt: &prompt,
        now: ms_u(now),
    };
    match call.decide() {
        Ok((r, escape)) => {
            rec = rec
                .bool("review", r.review)
                .opt_str("target", r.target.as_deref());
            if let Some(why) = r.why {
                write(&rec.str("decision", "deny").str("why", &why));
                let rule = if ctx.kit.is_some() {
                    "creep gate (no procedural creep, the kit's rules; r57-0063): "
                } else {
                    "creep gate (CLAUDE.md rule 8, r57-0063): "
                };
                return Outcome::Refuse(format!("{rule}{why}"));
            }
            let why = if escape {
                "owner escape"
            } else if r.review {
                "review passes rules 1, 2, 3 and 5"
            } else {
                "not a review"
            };
            write(&rec.str("decision", "allow").str("why", why));
            Outcome::context("PreToolUse", &r.context)
        }
        Err(e) => {
            let mut why = js::utf16("error: ");
            let mut msg = js::utf16(&e);
            msg.truncate(160);
            why.extend(msg);
            write(
                &rec.str("decision", "allow")
                    .raw("why", js::quote_utf16(&why)),
            );
            Outcome::Pass
        }
    }
}

/// One helper start to decide.
struct Call<'a> {
    place: &'a Place<'a>,
    logs: &'a Path,
    tp: &'a str,
    tu: &'a str,
    who: &'a str,
    desc: &'a str,
    prompt: &'a str,
    now: f64,
}

impl Call<'_> {
    /// The decision and whether the owner's escape was used; `Err` where the JavaScript throws.
    fn decide(&self) -> Result<(Decision, bool), String> {
        let rx = Patterns::new().map_err(|e| e.to_string())?;
        let dir = sess_dir_of(self.tp);
        let mut s = if !self.tp.is_empty() && Path::new(&format!("{dir}.jsonl")).exists() {
            load(self.place, &rx, &dir)?
        } else {
            Session::default()
        };
        if let Some(d) = &s.deliverable {
            s.d_mtime = mtime_of(&self.place.root, d);
        }
        let mut refused: HashSet<String> = s
            .starts
            .iter()
            .filter(|x| x.err)
            .map(|x| x.id.clone())
            .collect();
        for l in transcript::lines(&self.logs.join(LOG)) {
            if !l.contains("\"deny\"") {
                continue;
            }
            if let Some(tu) = input::parse_text(&l)
                .as_ref()
                .and_then(|o| o.get("tu"))
                .filter(|v| js::truthy(v))
            {
                refused.insert(id_key(Some(tu)));
            }
        }
        let found = s.starts.iter().find(|x| x.id == self.tu);
        let cur = match found {
            Some(f) => Cur {
                id: &f.id,
                ts: f.ts,
                who: &f.who,
                pos: Some(f.pos),
                desc: self.desc,
                prompt: self.prompt,
            },
            None => Cur {
                id: self.tu,
                ts: self.now,
                who: self.who,
                pos: None,
                desc: self.desc,
                prompt: self.prompt,
            },
        };
        let escape = owner_record(&self.place.root, self.prompt);
        let r = decide(self.place, &rx, &s, &cur, self.now, &refused, escape);
        Ok((r, escape))
    }
}

/// `--replay <session id or transcript path> [--deliverable <path>]`: the decisions over a finished session, printed.
fn replay(ctx: &Context, env_root: Option<&str>, home: &Path) -> Outcome {
    let place = place(ctx, env_root);
    let rx = match Patterns::new() {
        Ok(r) => r,
        Err(e) => return Outcome::Fail(format!("creep gate: {e}")),
    };
    let arg = ctx.args.get(1);
    let mut tp = arg.cloned().unwrap_or_default();
    if !Path::new(&tp).exists()
        && let Some(found) = find_transcript(&home.join(".claude").join("projects"), &tp)
    {
        tp = found;
    }
    if !Path::new(&tp).exists() {
        return Outcome::Fail(format!(
            "no transcript for {}",
            arg.map_or("undefined", String::as_str)
        ));
    }
    let mut s = match load(&place, &rx, &sess_dir_of(&tp)) {
        Ok(s) => s,
        Err(e) => return Outcome::Fail(format!("creep gate: TypeError: {e}")),
    };
    let di = ctx.args.iter().position(|a| a == "--deliverable");
    if let Some(d) = di
        .and_then(|i| ctx.args.get(i.saturating_add(1)))
        .filter(|d| !d.is_empty())
    {
        let n = place.norm(d);
        let n = n.trim_end_matches('/');
        s.deliverable = (!n.is_empty()).then(|| n.to_owned());
    }
    let mut out = format!(
        "deliverable: {}\n",
        s.deliverable.as_deref().unwrap_or("none stated")
    );
    let mut refused: HashSet<String> = s
        .starts
        .iter()
        .filter(|x| x.err)
        .map(|x| x.id.clone())
        .collect();
    let (mut saved, mut n) = (0.0, 0_usize);
    for x in &s.starts {
        let clock = js::iso_string(x.at)
            .and_then(|t| t.get(11..19).map(str::to_owned))
            .unwrap_or_default();
        if x.err {
            out.push_str(&format!(
                "{clock}  refused by the app or another hook  {}\n",
                x.desc
            ));
            continue;
        }
        let cur = Cur {
            id: &x.id,
            ts: x.ts,
            who: &x.who,
            pos: Some(x.pos),
            desc: &x.desc,
            prompt: &x.prompt,
        };
        let r = decide(
            &place,
            &rx,
            &s,
            &cur,
            x.ts,
            &refused,
            owner_record(&place.root, &x.prompt),
        );
        let tk = x.agent.as_deref().map_or(0.0, |a| agent_tokens(&s, a));
        if r.why.is_some() {
            refused.insert(x.id.clone());
            saved += tk;
            n = n.saturating_add(1);
        }
        let target = r
            .target
            .as_deref()
            .filter(|t| !t.is_empty())
            .map(|t| format!(", {t}"))
            .unwrap_or_default();
        let why = r
            .why
            .as_deref()
            .map(|w| format!("\n          {w}"))
            .unwrap_or_default();
        out.push_str(&format!(
            "{clock}  {}  {}  [{}{target}; its helper used {}]{why}\n",
            if r.why.is_some() { "REFUSE" } else { "allow " },
            x.desc,
            if r.review { "review" } else { "work" },
            fmt_tok(tk)
        ));
    }
    let all: f64 = s.msgs.iter().map(|m| m.n).fold(0.0, |a, x| a + x);
    out.push_str(&format!(
        "\n{n} of {} starts refused; the refused helpers themselves used {} of the session's {} tokens.\n",
        s.starts.len(),
        fmt_tok(saved),
        fmt_tok(all)
    ));
    Outcome::Say(out)
}

/// The first `<projects>/<folder>/<name>` whose name starts with `id` and ends `.jsonl`.
fn find_transcript(base: &Path, id: &str) -> Option<String> {
    let folders = std::fs::read_dir(base).ok()?;
    for d in folders.flatten() {
        let Ok(files) = std::fs::read_dir(d.path()) else {
            continue;
        };
        for f in files.flatten() {
            let name = f.file_name().to_string_lossy().into_owned();
            if name.starts_with(id) && name.ends_with(".jsonl") {
                return Some(f.path().to_string_lossy().into_owned());
            }
        }
    }
    None
}

/// The tokens of an agent and every agent below it.
fn agent_tokens(s: &Session, agent: &str) -> f64 {
    let mut fam: HashSet<&str> = HashSet::from([agent]);
    let mut grew = true;
    while grew {
        grew = false;
        for (c, p) in &s.parents {
            if fam.contains(p.as_str()) && fam.insert(c.as_str()) {
                grew = true;
            }
        }
    }
    s.msgs
        .iter()
        .filter(|m| fam.contains(m.who.as_str()))
        .map(|m| m.n)
        .fold(0.0, |a, x| a + x)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_session_folder_is_before_subagents_or_without_jsonl() {
        assert_eq!(
            sess_dir_of("C:\\p\\s1\\subagents\\agent-a.jsonl"),
            "C:\\p\\s1"
        );
        assert_eq!(sess_dir_of("/p/s1.jsonl"), "/p/s1");
        assert_eq!(sess_dir_of("/p/xsubagents/s1.jsonl"), "/p/xsubagents/s1");
    }

    #[test]
    fn unreadable_input_passes_and_is_logged_under_the_root() {
        let dir = std::env::temp_dir().join(format!("kit-creep-gate-unit-{}", std::process::id()));
        let root = dir.to_string_lossy().into_owned();
        let ctx = Context::from_parts(vec![], None, &paths::cwd());
        let out = run(&ctx, Some(&root), &Input::Unreadable, 5);
        assert_eq!(out, Outcome::Pass);
        let text =
            std::fs::read_to_string(dir.join(".claude").join("logs").join(LOG)).unwrap_or_default();
        assert!(text.starts_with(r#"{"t":5,"decision":"allow","why":"unreadable input"}"#));
        std::fs::remove_dir_all(&dir).unwrap_or_default();
    }

    #[test]
    fn a_null_block_in_the_transcript_passes_with_the_error_logged() {
        let dir = std::env::temp_dir().join(format!("kit-creep-gate-null-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap_or_default();
        let tp = dir.join("s.jsonl");
        std::fs::write(
            &tp,
            "{\"type\":\"user\",\"timestamp\":\"2026-11-25T10:00:00Z\",\"message\":{\"content\":[null]}}\n",
        )
        .unwrap_or_default();
        let root = dir.to_string_lossy().into_owned();
        let ctx = Context::from_parts(vec![], None, &paths::cwd());
        let j = serde_json::json!({"hook_event_name": "PreToolUse", "tool_name": "Agent", "transcript_path": tp.to_string_lossy(), "tool_input": {"description": "refute: x"}});
        assert_eq!(run(&ctx, Some(&root), &Input::Json(j), 5), Outcome::Pass);
        let text =
            std::fs::read_to_string(dir.join(".claude").join("logs").join(LOG)).unwrap_or_default();
        assert!(text.contains(r#""why":"error: Cannot read properties of null (reading 'type')""#));
        std::fs::remove_dir_all(&dir).unwrap_or_default();
    }
}
