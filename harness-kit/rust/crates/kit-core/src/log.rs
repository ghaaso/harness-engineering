//! Log lines: one JSON object per line appended to `<logs>/<hook>.jsonl`, never failing the hook (the JavaScript's
//! `try { mkdirSync(...); appendFileSync(..., JSON.stringify(o) + '\n') } catch {}`).
//!
//! A [`Record`] keeps its keys in the order they were set, as a JavaScript object does, so a line reads as its
//! JavaScript hook writes it. Setting a key that is already there replaces its value in place, as
//! `{ ...rec, key: value }` does.

use crate::js;
use std::io::Write;
use std::path::Path;

/// One log line being built: keys in order, each value already as JSON text.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Record {
    fields: Vec<(String, String)>,
}

impl Record {
    /// An empty record.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Sets `key` to a JSON text given as it is (for a value built elsewhere).
    #[must_use]
    pub fn raw(mut self, key: &str, json: String) -> Self {
        self.set(key, json);
        self
    }

    /// Sets `key` to a string.
    #[must_use]
    pub fn str(self, key: &str, value: &str) -> Self {
        self.raw(key, js::quote(value))
    }

    /// Sets `key` to the first `units` UTF-16 units of `value`: the JavaScript's `value.slice(0, units)`, a cut
    /// surrogate pair written as `JSON.stringify` writes it.
    #[must_use]
    pub fn cut(self, key: &str, value: &str, units: usize) -> Self {
        let mut v = js::utf16(value);
        v.truncate(units);
        self.raw(key, js::quote_utf16(&v))
    }

    /// Sets `key` to a whole number.
    #[must_use]
    pub fn int(self, key: &str, value: u64) -> Self {
        self.raw(key, value.to_string())
    }

    /// Sets `key` to a number written as `JSON.stringify` writes it (`null` for NaN and the infinities).
    #[must_use]
    pub fn num(self, key: &str, value: f64) -> Self {
        let text = if value.is_finite() {
            js::number_to_string(value)
        } else {
            "null".to_owned()
        };
        self.raw(key, text)
    }

    /// Sets `key` to `true` or `false`.
    #[must_use]
    pub fn bool(self, key: &str, value: bool) -> Self {
        self.raw(key, value.to_string())
    }

    /// Sets `key` to `null`.
    #[must_use]
    pub fn null(self, key: &str) -> Self {
        self.raw(key, "null".to_owned())
    }

    /// Sets `key` to a string, or to `null` when `value` is `None`.
    #[must_use]
    pub fn opt_str(self, key: &str, value: Option<&str>) -> Self {
        match value {
            Some(v) => self.str(key, v),
            None => self.null(key),
        }
    }

    /// Sets `key` to `json` in place (keeping its position if it is there already, as an object spread does).
    pub fn set(&mut self, key: &str, json: String) {
        match self.fields.iter_mut().find(|(k, _)| k == key) {
            Some(field) => field.1 = json,
            None => self.fields.push((key.to_owned(), json)),
        }
    }

    /// The record as one line of JSON, as `JSON.stringify` writes the same object.
    #[must_use]
    pub fn to_json(&self) -> String {
        let body: Vec<String> = self
            .fields
            .iter()
            .map(|(k, v)| format!("{}:{v}", js::quote(k)))
            .collect();
        format!("{{{}}}", body.join(","))
    }
}

/// Appends `record` and a newline to `<dir>/<file>`, making `dir` first. Every error is ignored: a log never fails a
/// hook.
pub fn append(dir: &Path, file: &str, record: &Record) {
    let line = format!("{}\n", record.to_json());
    let written = std::fs::create_dir_all(dir).and_then(|()| {
        std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(dir.join(file))
            .and_then(|mut f| f.write_all(line.as_bytes()))
    });
    written.unwrap_or_default();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keys_keep_their_order_and_a_reset_key_its_place() {
        let r = Record::new()
            .int("t", 5)
            .str("a", "x")
            .null("b")
            .str("a", "y");
        assert_eq!(r.to_json(), r#"{"t":5,"a":"y","b":null}"#);
    }

    #[test]
    fn cut_counts_utf16_units() {
        let r = Record::new().cut("s", "\u{e9}\u{1f600}z", 2);
        assert_eq!(r.to_json(), "{\"s\":\"\u{e9}\\ud83d\"}");
    }

    #[test]
    fn append_writes_one_line_and_makes_the_folder() {
        let dir = std::env::temp_dir().join(format!("kit-core-log-{}", std::process::id()));
        append(
            &dir.join("logs"),
            "x.jsonl",
            &Record::new().bool("ok", true),
        );
        append(&dir.join("logs"), "x.jsonl", &Record::new().num("n", 0.5));
        let text = std::fs::read_to_string(dir.join("logs").join("x.jsonl")).unwrap_or_default();
        std::fs::remove_dir_all(&dir).unwrap_or_default();
        assert_eq!(text, "{\"ok\":true}\n{\"n\":0.5}\n");
    }
}
