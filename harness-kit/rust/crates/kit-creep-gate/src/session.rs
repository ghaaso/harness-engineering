//! A session's record as the creep gate reads it from its transcripts (`load` of `creep-gate.mjs`): the helper
//! starts with when each ended, the writes, the tokens of each message, the time of the session's first line and
//! the deliverable the session stated.

use crate::rules::{Patterns, Place, deliverable_of, read_text};
use kit_core::{input, js, transcript};
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

/// The name the main transcript's lines are counted under.
pub const MAIN: &str = "main";

/// What JavaScript throws when a line of a transcript holds `null` among its content blocks.
pub const NULL_BLOCK: &str = "Cannot read properties of null (reading 'type')";

/// The tools whose calls count as writes.
const WRITE_TOOLS: [&str; 4] = ["Write", "Edit", "MultiEdit", "NotebookEdit"];

/// One helper start (an Agent or Task call).
#[derive(Debug, Clone)]
pub struct Start {
    /// The call's id, as an [`id_key`].
    pub id: String,
    /// When it was made (ms).
    pub ts: f64,
    /// The same time as whole ms, for printing.
    pub at: i64,
    /// `main` or the agent whose transcript holds it.
    pub who: String,
    /// Its place among the starts of the same transcript.
    pub pos: u64,
    /// `String(description || '')`.
    pub desc: String,
    /// `String(prompt || '')`.
    pub prompt: String,
    /// Its result was an error (the app or another hook refused it).
    pub err: bool,
    /// It is a review.
    pub review: bool,
    /// The piece of work it names.
    pub target: Option<String>,
    /// The helper it started, from the helper's meta file.
    pub agent: Option<String>,
    /// When it finished (ms), `None` while it runs.
    pub end: Option<f64>,
}

/// One write (Write, Edit, MultiEdit or NotebookEdit) that did not fail.
#[derive(Debug, Clone)]
pub struct Write {
    /// When it was made (ms).
    pub ts: f64,
    /// `main` or the agent that made it.
    pub who: String,
    /// The file, as `norm` gives it.
    pub path: String,
}

/// One assistant message's tokens, counted once per message id.
#[derive(Debug, Clone)]
pub struct Msg {
    /// When it was written (ms).
    pub ts: f64,
    /// `main` or the agent that wrote it.
    pub who: String,
    /// Input, cache creation, cache read and output tokens.
    pub n: f64,
}

/// What the gate knows of a session.
#[derive(Debug, Default)]
pub struct Session {
    /// The helper starts, in time order.
    pub starts: Vec<Start>,
    /// The writes that did not fail.
    pub writes: Vec<Write>,
    /// The messages, first-seen order.
    pub msgs: Vec<Msg>,
    /// Agent to the agent that started it.
    pub parents: HashMap<String, String>,
    /// The time of the main transcript's first line.
    pub first: Option<f64>,
    /// The deliverable the session stated (never empty).
    pub deliverable: Option<String>,
    /// The deliverable's newest file time (ms), when it exists.
    pub d_mtime: Option<f64>,
}

/// A JSON value as a key that compares as JavaScript's `===` does for the values a transcript holds (a missing value
/// is `undefined`, unlike `null`).
#[must_use]
pub fn id_key(v: Option<&Value>) -> String {
    v.map_or_else(|| "undefined".to_owned(), Value::to_string)
}

/// Whole milliseconds as a JavaScript number.
#[must_use]
pub fn ms(x: i64) -> f64 {
    serde_json::Number::from(x).as_f64().unwrap_or(0.0)
}

/// Unsigned whole milliseconds as a JavaScript number.
#[must_use]
pub fn ms_u(x: u64) -> f64 {
    serde_json::Number::from(x).as_f64().unwrap_or(0.0)
}

/// `String(v || '')`.
#[must_use]
pub fn text_or_empty(v: Option<&Value>) -> String {
    v.filter(|v| js::truthy(v))
        .map(js::to_string)
        .unwrap_or_default()
}

/// `walk(dir)`: every file under `dir` (links not followed), `.git` and `node_modules` skipped.
pub fn walk(dir: &Path, out: &mut Vec<PathBuf>) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for e in entries.flatten() {
        let p = e.path();
        if e.file_type().is_ok_and(|t| t.is_dir()) {
            let name = e.file_name();
            if name != ".git" && name != "node_modules" {
                walk(&p, out);
            }
        } else {
            out.push(p);
        }
    }
}

/// A file's modification time in ms, as Node's `mtimeMs`.
fn mtime_ms(meta: &std::fs::Metadata) -> Option<f64> {
    let t = meta.modified().ok()?;
    let (d, sign) = match t.duration_since(std::time::UNIX_EPOCH) {
        Ok(d) => (d, 1.0),
        Err(e) => (e.duration(), -1.0),
    };
    let whole = ms_u(d.as_secs()) * 1e3 + f64::from(d.subsec_nanos()) / 1e6;
    Some(sign * whole)
}

/// `mtimeOf(d)`: the newest file time of the deliverable (a file, or every file under a folder); `None` when it does
/// not exist or a folder holds no file.
#[must_use]
pub fn mtime_of(root: &Path, d: &str) -> Option<f64> {
    let p = kit_core::paths::resolve(root, &[d]);
    let st = std::fs::metadata(&p).ok()?;
    if !st.is_dir() {
        return mtime_ms(&st);
    }
    let mut files = Vec::new();
    walk(&p, &mut files);
    files
        .iter()
        .filter_map(|f| std::fs::metadata(f).ok().and_then(|m| mtime_ms(&m)))
        .fold(None, |m: Option<f64>, t| match m {
            Some(x) if t <= x => Some(x),
            _ => Some(t),
        })
}

/// A start's call result.
#[derive(Debug, Clone, Copy)]
struct Outcome {
    ts: f64,
    err: bool,
    launched: bool,
}

/// What [`load`] gathers line by line before the starts are completed.
#[derive(Debug, Default)]
struct Gather {
    starts: Vec<Start>,
    start_ids: HashSet<String>,
    writes: Vec<(String, Write)>,
    msgs: Vec<Msg>,
    msg_ids: HashSet<String>,
    results: HashMap<String, Outcome>,
    last_ts: HashMap<String, f64>,
    first: Option<f64>,
    deliverable: Option<String>,
}

/// `load(sessDir)`. Fails, as the JavaScript throws, when a user or assistant line holds `null` among its content
/// blocks.
///
/// # Errors
/// The JavaScript's error message.
pub fn load(place: &Place<'_>, rx: &Patterns, sess_dir: &str) -> Result<Session, String> {
    let mut files: Vec<(PathBuf, String)> =
        vec![(PathBuf::from(format!("{sess_dir}.jsonl")), MAIN.to_owned())];
    let mut metas: HashMap<String, (String, bool)> = HashMap::new();
    let mut parents: HashMap<String, String> = HashMap::new();
    let mut sub = Vec::new();
    walk(&Path::new(sess_dir).join("subagents"), &mut sub);
    for f in sub {
        let name = f
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default();
        let Some((agent, kind)) = rx.agent_file(&name) else {
            continue;
        };
        if kind == "jsonl" {
            files.push((f, agent.to_owned()));
            continue;
        }
        let Some(o) = input::parse_text(&read_text(&f)).filter(|o| !o.is_null()) else {
            continue;
        };
        if let Some(tu) = o.get("toolUseId").filter(|v| js::truthy(v)) {
            let finished = o.get("finished") == Some(&Value::Bool(true));
            metas.insert(id_key(Some(tu)), (agent.to_owned(), finished));
        }
        if let Some(p) = o.get("parentAgentId").filter(|v| js::truthy(v)) {
            parents.insert(agent.to_owned(), js::to_string(p));
        }
    }

    let mut g = Gather::default();
    for (f, who) in &files {
        let mut pos: u64 = 0;
        for l in transcript::lines(f) {
            if !l.starts_with('{') {
                continue;
            }
            let Some(o) = input::parse_text(&l) else {
                continue;
            };
            line(place, &mut g, &o, who, &mut pos)?;
        }
    }

    let Gather {
        mut starts,
        writes,
        msgs,
        results,
        last_ts,
        first,
        deliverable,
        ..
    } = g;
    for s in &mut starts {
        let m = metas.get(&s.id);
        let r = results.get(&s.id);
        s.err = r.is_some_and(|r| r.err);
        s.review = rx.is_review(&s.desc, &s.prompt);
        s.target = place.target_of(rx, &s.prompt);
        s.agent = m.map(|m| m.0.clone());
        s.end = match m {
            Some((agent, true)) => Some(
                last_ts
                    .get(agent)
                    .copied()
                    .unwrap_or_else(|| r.map_or(s.ts, |r| r.ts)),
            ),
            Some((_, false)) => None,
            None => r.filter(|r| !r.err && !r.launched).map(|r| r.ts),
        };
    }
    starts.sort_by(|a, b| a.ts.total_cmp(&b.ts));
    let writes = writes
        .into_iter()
        .filter(|(id, _)| !results.get(id).is_some_and(|r| r.err))
        .map(|(_, w)| w)
        .collect();
    Ok(Session {
        starts,
        writes,
        msgs,
        parents,
        first,
        deliverable,
        d_mtime: None,
    })
}

/// One parsed line of a transcript.
fn line(
    place: &Place<'_>,
    g: &mut Gather,
    o: &Value,
    who: &str,
    pos: &mut u64,
) -> Result<(), String> {
    let Some(ts) = o
        .get("timestamp")
        .and_then(|v| js::date_parse(&js::to_string(v)))
    else {
        return Ok(());
    };
    let at = ts;
    let ts = ms(ts);
    if who == MAIN && g.first.is_none_or(|f| ts < f) {
        g.first = Some(ts);
    }
    if !g.last_ts.get(who).is_some_and(|&l| l >= ts) {
        g.last_ts.insert(who.to_owned(), ts);
    }
    let msg = o.get("message").filter(|m| js::truthy(m));
    let content = msg.and_then(|m| m.get("content"));
    let blocks: &[Value] = content.and_then(Value::as_array).map_or(&[], Vec::as_slice);
    let kind = o.get("type").and_then(Value::as_str);
    let user = kind == Some("user");
    let assistant = kind == Some("assistant");
    if (user || assistant) && blocks.iter().any(Value::is_null) {
        return Err(NULL_BLOCK.to_owned());
    }
    if who == MAIN && g.deliverable.is_none() {
        let mut texts: Vec<String> = Vec::new();
        if let Some(Value::String(t)) = o.get("content") {
            texts.push(t.clone());
        }
        if user || assistant {
            if let Some(Value::String(t)) = content {
                texts.push(t.clone());
            }
            for b in blocks {
                if b.get("type").and_then(Value::as_str) == Some("text") {
                    texts.push(text_or_empty(b.get("text")));
                }
            }
        }
        for t in &texts {
            if let Some(m) = deliverable_of(t) {
                let d = place.norm(m);
                let d = d.trim_end_matches('/');
                if !d.is_empty() {
                    g.deliverable = Some(d.to_owned());
                }
                break;
            }
        }
    }
    if let Some(m) = msg.filter(|_| assistant) {
        let id = m.get("id").filter(|v| js::truthy(v));
        let usage = m.get("usage").filter(|v| js::truthy(v));
        if let (Some(id), Some(u)) = (id, usage)
            && g.msg_ids.insert(id_key(Some(id)))
        {
            {
                let n = [
                    "input_tokens",
                    "cache_creation_input_tokens",
                    "cache_read_input_tokens",
                    "output_tokens",
                ]
                .iter()
                .map(|k| u.get(*k).and_then(Value::as_f64).unwrap_or(0.0))
                .fold(0.0, |a, x| a + x);
                g.msgs.push(Msg {
                    ts,
                    who: who.to_owned(),
                    n,
                });
            }
        }
    }
    for b in blocks {
        let btype = b.get("type").and_then(Value::as_str);
        if assistant && btype == Some("tool_use") {
            let empty = Value::Null;
            let i = b.get("input").filter(|v| js::truthy(v)).unwrap_or(&empty);
            let name = b.get("name").and_then(Value::as_str).unwrap_or("");
            let id = id_key(b.get("id"));
            if (name == "Agent" || name == "Task") && g.start_ids.insert(id.clone()) {
                g.starts.push(Start {
                    id: id.clone(),
                    ts,
                    at,
                    who: who.to_owned(),
                    pos: *pos,
                    desc: text_or_empty(i.get("description")),
                    prompt: text_or_empty(i.get("prompt")),
                    err: false,
                    review: false,
                    target: None,
                    agent: None,
                    end: None,
                });
                *pos = pos.saturating_add(1);
            }
            if WRITE_TOOLS.contains(&name) {
                let file = i
                    .get("file_path")
                    .filter(|v| js::truthy(v))
                    .or_else(|| i.get("notebook_path"));
                g.writes.push((
                    id,
                    Write {
                        ts,
                        who: who.to_owned(),
                        path: place.norm(&text_or_empty(file)),
                    },
                ));
            }
        }
        if user && btype == Some("tool_result") {
            let key = id_key(b.get("tool_use_id"));
            g.results.entry(key).or_insert_with(|| {
                let text = match b.get("content") {
                    Some(Value::String(t)) => t.clone(),
                    Some(Value::Array(a)) => text_or_empty(a.first().and_then(|c| c.get("text"))),
                    _ => String::new(),
                };
                Outcome {
                    ts,
                    err: b.get("is_error").is_some_and(js::truthy),
                    launched: text.starts_with("Async agent launched"),
                }
            });
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_missing_id_and_a_null_id_are_different_keys() {
        assert_ne!(id_key(None), id_key(Some(&Value::Null)));
    }

    #[test]
    fn a_null_block_in_an_assistant_line_fails_as_javascript_throws() {
        let place = Place::new(kit_core::paths::cwd(), None);
        let mut g = Gather::default();
        let o = serde_json::json!({"type": "assistant", "timestamp": "2026-11-25T10:00:00Z", "message": {"content": [null]}});
        let mut pos = 0;
        assert_eq!(
            line(&place, &mut g, &o, MAIN, &mut pos),
            Err(NULL_BLOCK.to_owned())
        );
        let other = serde_json::json!({"type": "system", "timestamp": "2026-11-25T10:00:00Z", "message": {"content": [null]}});
        assert_eq!(line(&place, &mut g, &other, MAIN, &mut pos), Ok(()));
    }
}
