//! Reading a transcript incrementally: the running figures of a session's calls, kept in a small state file per
//! transcript so that a call reads only the bytes added since the last one (whole lines only).

use crate::jsx;
use kit_core::input;
use kit_core::js;
use serde_json::Value;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};

/// Calls of orientation of an Opus root (r57-0171).
pub const ORIENT: u32 = 17;
/// [`ORIENT`] as a length.
const ORIENT_LEN: usize = 17;

/// The running figures of one transcript (version 2 of the state file; its keys and their order are the
/// JavaScript hook's, so either program reads the other's files).
#[derive(Debug, Clone, PartialEq)]
pub struct State {
    /// The transcript path, as given.
    pub path: String,
    /// Bytes read so far (whole lines).
    pub off: u64,
    /// Calls so far.
    pub n: u32,
    /// The message id of the last call (`null` when it had none).
    pub last_id: Value,
    /// Compaction segments so far (0 before the first compaction).
    pub seg: u32,
    /// A compaction boundary was read and the next call starts a segment.
    pub boundary: bool,
    /// Calls in the current segment.
    pub seg_n: u32,
    /// The context of the segment's first call.
    pub seg_first: f64,
    /// The context at the segment's 17th call (or its last, before it has 17).
    pub seg_f: f64,
    /// The context of the last call.
    pub seg_last: f64,
    /// The contexts of the session's first 17 calls.
    pub first17: Vec<f64>,
    /// The contexts of the segment's last 18 calls.
    pub recent: Vec<f64>,
    /// The model of the last call that named one (a string in practice; `""` before any).
    pub model: Value,
}

impl State {
    /// A state that has read nothing of `path`.
    #[must_use]
    pub fn fresh(path: &str) -> Self {
        Self {
            path: path.to_owned(),
            off: 0,
            n: 0,
            last_id: Value::Null,
            seg: 0,
            boundary: false,
            seg_n: 0,
            seg_first: 0.0,
            seg_f: 0.0,
            seg_last: 0.0,
            first17: Vec::new(),
            recent: Vec::new(),
            model: Value::String(String::new()),
        }
    }

    /// The state from a state file's JSON; `None` when it is not version 2, has no string model, or a field is not
    /// what this program or the JavaScript one writes.
    #[must_use]
    pub fn from_json(v: &Value) -> Option<Self> {
        let o = v.as_object()?;
        if o.get("v")?.as_u64()? != 2 {
            return None;
        }
        let count = |k: &str| o.get(k)?.as_u64().and_then(|n| u32::try_from(n).ok());
        let figure = |k: &str| o.get(k)?.as_f64();
        let list = |k: &str| -> Option<Vec<f64>> {
            o.get(k)?.as_array()?.iter().map(Value::as_f64).collect()
        };
        let model = o.get("model").filter(|m| m.is_string())?.clone();
        Some(Self {
            path: o.get("path")?.as_str()?.to_owned(),
            off: o.get("off")?.as_u64()?,
            n: count("n")?,
            last_id: o.get("lastId").cloned().unwrap_or(Value::Null),
            seg: count("seg")?,
            boundary: o.get("boundary")?.as_bool()?,
            seg_n: count("segN")?,
            seg_first: figure("segFirst")?,
            seg_f: figure("segF")?,
            seg_last: figure("segLast")?,
            first17: list("first17")?,
            recent: list("recent")?,
            model,
        })
    }

    /// The state file's text, as `JSON.stringify(s)` writes it.
    #[must_use]
    pub fn to_json(&self) -> String {
        let list = |v: &[f64]| {
            v.iter()
                .map(|x| jsx::num_json(*x))
                .collect::<Vec<_>>()
                .join(",")
        };
        format!(
            "{{\"v\":2,\"path\":{},\"off\":{},\"n\":{},\"lastId\":{},\"seg\":{},\"boundary\":{},\"segN\":{},\"segFirst\":{},\"segF\":{},\"segLast\":{},\"first17\":[{}],\"recent\":[{}],\"model\":{}}}",
            js::quote(&self.path),
            self.off,
            self.n,
            jsx::stringify(&self.last_id),
            self.seg,
            self.boundary,
            self.seg_n,
            jsx::num_json(self.seg_first),
            jsx::num_json(self.seg_f),
            jsx::num_json(self.seg_last),
            list(&self.first17),
            list(&self.recent),
            jsx::stringify(&self.model),
        )
    }

    /// One call (or another content block of the last call) with context `ctx`.
    fn add_call(&mut self, id: Option<&Value>, ctx: f64, model: Option<&Value>) {
        if let Some(id) = id
            && same(id, &self.last_id)
        {
            // another content block of the same call: keep the largest reading
            if ctx <= self.seg_last {
                return;
            }
            self.seg_last = ctx;
            if self.seg_n == 1 {
                self.seg_first = ctx;
            }
            if self.seg_n <= ORIENT {
                self.seg_f = ctx;
            }
            if self.n <= ORIENT
                && let Some(slot) = self
                    .n
                    .checked_sub(1)
                    .and_then(|i| usize::try_from(i).ok())
                    .and_then(|i| self.first17.get_mut(i))
            {
                *slot = ctx;
            }
            if let Some(last) = self.recent.last_mut() {
                *last = ctx;
            }
            return;
        }
        if self.boundary {
            self.seg = self.seg.saturating_add(1);
            self.seg_n = 0;
            self.boundary = false;
            self.recent.clear();
        }
        self.n = self.n.saturating_add(1);
        self.seg_n = self.seg_n.saturating_add(1);
        self.last_id = id.cloned().unwrap_or(Value::Null);
        if self.seg_n == 1 {
            self.seg_first = ctx;
        }
        if self.seg_n <= ORIENT {
            self.seg_f = ctx;
        }
        self.seg_last = ctx;
        if self.n <= ORIENT {
            self.first17.push(ctx);
        }
        self.recent.push(ctx);
        if self.recent.len() > ORIENT_LEN.saturating_add(1) {
            self.recent.remove(0);
        }
        if let Some(m) = model {
            self.model = m.clone();
        }
    }
}

/// JavaScript's `===` between an id just read and the stored one (two objects are never the same).
fn same(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::String(x), Value::String(y)) => x == y,
        (Value::Number(x), Value::Number(y)) => x
            .as_f64()
            .zip(y.as_f64())
            .is_some_and(|(x, y)| x.partial_cmp(&y) == Some(std::cmp::Ordering::Equal)),
        (Value::Bool(x), Value::Bool(y)) => x == y,
        _ => false,
    }
}

/// `x || 0` for a usage figure. A figure that is not a number (never seen in a transcript) is read as `Number(x)`.
fn figure(v: Option<&Value>) -> f64 {
    match v.filter(|v| js::truthy(v)) {
        None => 0.0,
        Some(x) => jsx::number_of(Some(x)),
    }
}

/// Reads the lines of `text` (whole lines of a transcript) into `s`.
pub fn scan_text(s: &mut State, text: &str, helper: bool) {
    for line in text.split('\n') {
        if line.contains("\"compact_boundary\"") {
            if let Some(j) = input::parse_text(line)
                && j.get("type").and_then(Value::as_str) == Some("system")
                && j.get("subtype").and_then(Value::as_str) == Some("compact_boundary")
            {
                s.boundary = true;
            }
            continue;
        }
        if !line.contains("\"assistant\"") || !line.contains("\"usage\"") {
            continue;
        }
        let Some(j) = input::parse_text(line) else {
            continue;
        };
        if j.get("type").and_then(Value::as_str) != Some("assistant") {
            continue;
        }
        let Some(m) = j.get("message").filter(|m| js::truthy(m)) else {
            continue;
        };
        let Some(u) = m.get("usage").filter(|u| js::truthy(u)) else {
            continue;
        };
        if !helper && j.get("isSidechain").is_some_and(js::truthy) {
            continue;
        }
        if m.get("model").and_then(Value::as_str) == Some("<synthetic>") {
            continue;
        }
        let ctx = figure(u.get("input_tokens"))
            + figure(u.get("cache_creation_input_tokens"))
            + figure(u.get("cache_read_input_tokens"))
            + figure(u.get("output_tokens"));
        if ctx.is_nan() || ctx <= 0.0 {
            continue;
        }
        let id = m
            .get("id")
            .filter(|v| js::truthy(v))
            .or_else(|| j.get("uuid").filter(|v| js::truthy(v)));
        let model = m.get("model").filter(|v| js::truthy(v));
        s.add_call(id, ctx, model);
    }
}

/// The state file's name for a transcript: `<folder two up>-<file without .jsonl>`, every character outside
/// `[A-Za-z0-9_.-]` replaced by `_` (two for a character outside the BMP, as JavaScript counts it).
#[must_use]
pub fn state_name(path: &str) -> String {
    let base = jsx::basename(path);
    let key = format!(
        "{}-{}",
        jsx::basename(&jsx::dirname(&jsx::dirname(path))),
        base.strip_suffix(".jsonl").unwrap_or(base)
    );
    let mut out = String::with_capacity(key.len());
    for c in key.chars() {
        if c.is_ascii_alphanumeric() || matches!(c, '_' | '.' | '-') {
            out.push(c);
        } else {
            for _ in 0..c.len_utf16() {
                out.push('_');
            }
        }
    }
    out
}

/// A Node-like message for an error on `path`.
fn io_message(e: &std::io::Error, what: &str, path: &str) -> String {
    match e.kind() {
        std::io::ErrorKind::NotFound => {
            format!("ENOENT: no such file or directory, {what} '{path}'")
        }
        std::io::ErrorKind::IsADirectory => {
            format!("EISDIR: illegal operation on a directory, {what}")
        }
        _ => format!("{e}, {what} '{path}'"),
    }
}

/// Loads a cached state, `None` when there is none or it cannot be used.
fn load(sp: &Path) -> Option<State> {
    let text = std::fs::read(sp).ok()?;
    State::from_json(&input::parse_text(&String::from_utf8_lossy(&text))?)
}

/// Writes the state through a temporary file and a rename; every error is ignored.
fn save(dir: &Path, sp: &Path, s: &State) {
    let mut tmp = sp.as_os_str().to_owned();
    tmp.push(format!(".{}", std::process::id()));
    let tmp = PathBuf::from(tmp);
    let done = std::fs::create_dir_all(dir)
        .and_then(|()| std::fs::write(&tmp, s.to_json()))
        .and_then(|()| std::fs::rename(&tmp, sp));
    done.unwrap_or_default();
}

/// Reads the transcript at `path` from where its cached state left off (`state_dir` given) or from the start.
///
/// # Errors
/// Where the JavaScript throws: the transcript cannot be opened or read.
pub fn read_transcript(
    path: &str,
    helper: bool,
    state_dir: Option<&Path>,
) -> Result<State, String> {
    let sp = state_dir.map(|d| d.join(format!("{}.json", state_name(path))));
    let mut s = sp
        .as_deref()
        .and_then(load)
        .filter(|s| s.path == path)
        .unwrap_or_else(|| State::fresh(path));
    let mut f = File::open(path).map_err(|e| io_message(&e, "open", path))?;
    let size = f
        .metadata()
        .map_err(|e| io_message(&e, "fstat", path))?
        .len();
    if size < s.off {
        s = State::fresh(path); // the file was rewritten
    }
    if let Some(want) = size.checked_sub(s.off).filter(|w| *w > 0) {
        let mut buf = Vec::new();
        f.seek(SeekFrom::Start(s.off))
            .and_then(|_| f.by_ref().take(want).read_to_end(&mut buf))
            .map_err(|e| io_message(&e, "read", path))?;
        if let Some(last) = buf.iter().rposition(|b| *b == b'\n') {
            let chunk = buf.get(..=last).unwrap_or_default();
            scan_text(&mut s, &String::from_utf8_lossy(chunk), helper);
            let step = u64::try_from(last.saturating_add(1)).unwrap_or(0);
            s.off = s.off.saturating_add(step);
        }
    }
    if let (Some(dir), Some(sp)) = (state_dir, sp.as_deref()) {
        save(dir, sp, &s);
    }
    Ok(s)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn call(id: &str, ctx: u64, out: u64) -> String {
        format!(
            "{{\"type\":\"assistant\",\"message\":{{\"id\":\"{id}\",\"model\":\"claude-opus-5-5\",\"usage\":{{\"input_tokens\":{},\"output_tokens\":{out}}}}}}}",
            ctx.saturating_sub(out)
        )
    }

    #[test]
    fn two_blocks_of_one_call_count_once_with_the_larger_reading() {
        let mut s = State::fresh("x");
        let text = format!(
            "{}\n{}\n{}\n",
            call("a", 1000, 10),
            call("a", 1300, 300),
            call("b", 2000, 5)
        );
        scan_text(&mut s, &text, false);
        assert_eq!((s.n, s.first17.clone()), (2, vec![1300.0, 2000.0]));
    }

    #[test]
    fn a_compaction_starts_a_new_segment_at_the_next_call() {
        let mut s = State::fresh("x");
        let text = format!(
            "{}\n{{\"type\":\"system\",\"subtype\":\"compact_boundary\"}}\n{}\n",
            call("a", 5000, 1),
            call("b", 900, 1)
        );
        scan_text(&mut s, &text, false);
        assert_eq!((s.seg, s.seg_n, s.seg_first, s.n), (1, 1, 900.0, 2));
    }

    #[test]
    fn the_state_file_round_trips_with_the_javascript_keys_in_order() {
        let mut s = State::fresh("p");
        scan_text(&mut s, &format!("{}\n", call("a", 1000, 10)), false);
        let text = s.to_json();
        assert!(text.starts_with("{\"v\":2,\"path\":\"p\",\"off\":0,\"n\":1,\"lastId\":\"a\""));
        let back = input::parse_text(&text).and_then(|v| State::from_json(&v));
        assert_eq!(back, Some(s));
    }

    #[test]
    fn a_state_without_a_model_is_not_used() {
        let v = serde_json::json!({"v": 2, "path": "p", "off": 0, "n": 0, "lastId": null, "seg": 0,
            "boundary": false, "segN": 0, "segFirst": 0, "segF": 0, "segLast": 0, "first17": [], "recent": []});
        assert_eq!(State::from_json(&v), None);
    }

    #[test]
    fn the_state_name_takes_the_folder_two_up_and_masks_other_characters() {
        let p = "/t/projects/proj/m1.jsonl";
        assert_eq!(state_name(p), "projects-m1");
        assert_eq!(state_name("/a/b c/d/x\u{1f600}.jsonl"), "b_c-x__");
    }
}
