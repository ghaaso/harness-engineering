//! Rule 2: the meter (`get_usage`) read in an earlier message than the start, after the previous wave, no older
//! than `SPAN_MIN`, and under the state file's meter lines.

use crate::jsadd::Prim;
use crate::jsv::{self, Js, Key, Thrown, key};
use crate::lines::{self, Line};
use crate::state::State;
use kit_core::js;
use serde_json::Value;
use std::collections::HashMap;

/// How fast the weekly meter can move, points per minute (r57-0183: 4 points in 105 min).
pub const RATE_PER_MIN: f64 = 4.0 / 105.0;

/// A reading stays good while the meter cannot have moved one point (r57-0183).
#[must_use]
pub fn span_min() -> f64 {
    1.0 / RATE_PER_MIN
}

/// The parse the transcript's values come from; the start's own id comes from another (the hook's input).
const FILE: usize = 0;
const INPUT: usize = 1;

/// A tool's result: the line it is on, whether it was refused, and the block.
struct Res<'a> {
    idx: usize,
    err: bool,
    block: &'a Value,
}

/// The last good meter reading.
struct Reading {
    idx: usize,
    msg: Key,
    res_idx: usize,
    at: f64,
    all: f64,
    /// The Fable window's `percentUsed` when it is neither missing nor `null` (`reading.fable != null`).
    fable: Option<Value>,
}

/// `w.label || ''` holds `needle`, ASCII letters in either case (`/needle/i`).
fn labelled<'a>(ws: &'a [Value], needle: &str) -> Js<Option<&'a Value>> {
    for w in ws {
        let label = jsv::text_or_empty(jsv::prop(Some(w), "label")?);
        if label.to_ascii_lowercase().contains(needle) {
            return Ok(Some(w));
        }
    }
    Ok(None)
}

/// The text of a tool result: its content when that is a string, else the `text` of each item joined.
fn result_text(b: &Value) -> Js<String> {
    match b.get("content") {
        Some(Value::String(s)) => Ok(s.clone()),
        Some(Value::Array(items)) => {
            let mut out = String::new();
            for c in items {
                out.push_str(&jsv::text_or_empty(jsv::prop(Some(c), "text")?));
            }
            Ok(out)
        }
        Some(v) if js::truthy(v) => Err(Thrown(
            "(r.b.content || []).map is not a function".to_owned(),
        )),
        _ => Ok(String::new()),
    }
}

/// `meterCheck(objs, tuId, st)`: why the start is refused, or `None`.
///
/// # Errors
/// Where the JavaScript throws (a line or block that is `null` where it reads a property).
pub fn check(
    objs: &[Line],
    tu: Option<&Value>,
    st: Option<&State>,
    now: f64,
) -> Js<Option<String>> {
    let tu_key = key(tu, INPUT);
    // The message of the start being decided, and where it begins.
    let mut cur_msg = Key::Null;
    let mut cur_truthy = false;
    for o in objs.iter().filter(|o| o.is_assistant()) {
        let mut found = false;
        for b in o.blocks() {
            if lines::block_type(b)? == Some("tool_use") && key(b.get("id"), FILE) == tu_key {
                found = true;
                break;
            }
        }
        if found {
            let id = o.message_id()?;
            cur_msg = key(id, FILE);
            cur_truthy = jsv::truthy(id);
        }
    }
    // `None` stands for -1: no line is before it.
    let mut cur_idx = Some(objs.len());
    if cur_truthy {
        cur_idx = None;
        for (i, o) in objs.iter().enumerate() {
            if o.is_assistant() && key(o.message_id()?, FILE) == cur_msg {
                cur_idx = Some(i);
                break;
            }
        }
    }
    let before_cur = |i: usize| cur_idx.is_some_and(|c| i < c);

    let mut results: HashMap<Key, Res<'_>> = HashMap::new();
    for (i, o) in objs.iter().enumerate() {
        if o.kind() != "user" {
            continue;
        }
        for b in o.blocks() {
            if lines::block_type(b)? == Some("tool_result") {
                let err = jsv::truthy(b.get("is_error"));
                results.insert(
                    key(b.get("tool_use_id"), FILE),
                    Res {
                        idx: i,
                        err,
                        block: b,
                    },
                );
            }
        }
    }

    let mut last_wave: Option<usize> = None;
    let mut reading: Option<Reading> = None;
    for (i, o) in objs.iter().enumerate() {
        if !o.is_assistant() || !before_cur(i) || key(o.message_id()?, FILE) == cur_msg {
            continue;
        }
        for b in o.blocks() {
            if lines::block_type(b)? != Some("tool_use") {
                continue;
            }
            let name = b.get("name");
            let id = key(b.get("id"), FILE);
            if (jsv::is_str(name, "Agent") || jsv::is_str(name, "Task"))
                && !results.get(&id).is_some_and(|r| r.err)
            {
                last_wave = Some(i);
            }
            if !jsv::text_or_empty(name).ends_with("get_usage") {
                continue;
            }
            let Some(r) = results.get(&id) else {
                continue;
            };
            if r.err || !before_cur(r.idx) {
                continue;
            }
            let txt = result_text(r.block)?;
            let Some(j) = kit_core::input::parse_text(&txt) else {
                continue;
            };
            let plan = jsv::prop(Some(&j), "plan")?;
            let ws = plan
                .filter(|p| js::truthy(p))
                .and_then(|p| p.get("windows"))
                .and_then(Value::as_array)
                .map_or(&[][..], Vec::as_slice);
            let all = labelled(ws, "all models")?;
            let fab = labelled(ws, "fable")?;
            let Some(all) = all
                .and_then(|a| a.get("percentUsed"))
                .and_then(Value::as_f64)
            else {
                continue;
            };
            let at = objs
                .get(r.idx)
                .and_then(Line::value)
                .and_then(|v| v.get("timestamp"))
                .and_then(|t| js::date_parse(&js::to_string(t)))
                .map_or(f64::NAN, |ms| {
                    ms.to_string().parse::<f64>().unwrap_or(f64::NAN)
                });
            reading = Some(Reading {
                idx: i,
                msg: key(o.message_id()?, FILE),
                res_idx: r.idx,
                at,
                all,
                fable: fab
                    .and_then(|f| f.get("percentUsed"))
                    .filter(|v| !v.is_null())
                    .cloned(),
            });
        }
    }
    let Some(reading) = reading else {
        return Ok(Some(
            "read the meter (get_usage) in a message before this start, then start in a later message (rule 5, r57-0615)"
                .to_owned(),
        ));
    };
    if last_wave.is_some_and(|w| reading.idx < w) {
        return Ok(Some("the last meter reading came before the previous wave of starts: read it again before this wave (rule 5)".to_owned()));
    }
    if !cur_truthy {
        let mut later = false;
        for o in objs.iter().skip(reading.res_idx.saturating_add(1)) {
            if o.kind() == "api-request"
                || (o.is_assistant() && key(o.message_id()?, FILE) != reading.msg)
            {
                later = true;
                break;
            }
        }
        if !later {
            return Ok(Some("no request has gone out since the meter reading, so the reading is in the same message as this start (r57-0615): start in a later message".to_owned()));
        }
    }
    let age = (now - reading.at) / 60000.0;
    let span = span_min();
    let fresh = age <= span;
    if !fresh {
        return Ok(Some(format!(
            "the last meter reading is {} min old; the meter can move a point in {} min (r57-0183): read it again",
            js::number_to_string(js::round(age)),
            js::to_fixed(span, 0)
        )));
    }
    let moved = RATE_PER_MIN * jsv::max0(age);
    if let Some(st) = st {
        if let Some(line) = st.line
            && reading.all + moved >= line
        {
            return Ok(Some(format!(
                "the meter read {} % (up to {} % now) and the line in {} is {} %: start nothing; ask the owner with cap:",
                js::number_to_string(reading.all),
                js::to_fixed(reading.all + moved, 1),
                st.rel,
                js::number_to_string(line)
            )));
        }
        // `reading.fable + moved >= st.fableLine`, with JavaScript's `+` (a reading given as text joins as text).
        if let (Some(line), Some(fable)) = (st.fable_line, reading.fable.as_ref())
            && Prim::of(fable).add(&Prim::Num(moved)).number() >= line
        {
            return Ok(Some(format!(
                "the Fable meter read {} % and the Fable line in {} is {} %: start nothing; ask the owner with cap:",
                js::to_string(fable),
                st.rel,
                js::number_to_string(line)
            )));
        }
    }
    Ok(None)
}
