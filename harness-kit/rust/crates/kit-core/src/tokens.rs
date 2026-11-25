//! Tokens as the fan-out gate counts them (`.claude/hooks/fanout-gate.mjs` `tokensOf`, `harness-kit/tokens.mjs`
//! `readTranscript` and `session`; record r57-0170): input + cache creation + cache read + output, once per message
//! id. Within one file the last usage of an id counts; across files the first file that has an id counts it.
//!
//! ```
//! use kit_core::tokens::{Ledger, of_file};
//! let lines = [serde_json::json!({"type": "assistant", "message": {"id": "m1",
//!     "usage": {"input_tokens": 3, "cache_creation_input_tokens": 4, "cache_read_input_tokens": 5, "output_tokens": 6}}})];
//! let mut ledger = Ledger::new();
//! let count = ledger.add(&of_file(&lines));
//! assert_eq!((count.tokens, count.messages), (18, 1));
//! ```

use serde_json::Value;
use std::collections::{HashMap, HashSet};

/// The four usage fields that are summed.
const FIELDS: [&str; 4] = [
    "input_tokens",
    "cache_creation_input_tokens",
    "cache_read_input_tokens",
    "output_tokens",
];

/// The message id and tokens of one transcript line, when it is `type: "assistant"` with a truthy `message.usage`
/// and a non-empty string `message.id` (an id of another kind is not counted; in transcripts it is a string). A usage field that is missing or not a whole number of zero or more counts
/// 0 (in transcripts each is a whole number; the JavaScript's `u.x || 0` would add another kind of value as it is).
#[must_use]
pub fn of_line(line: &Value) -> Option<(&str, u64)> {
    if line.get("type").and_then(Value::as_str) != Some("assistant") {
        return None;
    }
    let message = line.get("message")?;
    let usage = message.get("usage").filter(|u| crate::js::truthy(u))?;
    let id = message
        .get("id")
        .and_then(Value::as_str)
        .filter(|id| !id.is_empty())?;
    let sum = FIELDS
        .iter()
        .map(|f| usage.get(*f).and_then(Value::as_u64).unwrap_or(0))
        .fold(0u64, u64::saturating_add);
    Some((id, sum))
}

/// The messages of one file: each id once, in the order ids first appear, with the tokens of its last line (a
/// JavaScript `Map` set line by line).
#[must_use]
pub fn of_file<'a, I>(lines: I) -> Vec<(String, u64)>
where
    I: IntoIterator<Item = &'a Value>,
{
    let mut out: Vec<(String, u64)> = Vec::new();
    let mut at: HashMap<String, usize> = HashMap::new();
    for (id, n) in lines.into_iter().filter_map(of_line) {
        match at.get(id).and_then(|&i| out.get_mut(i)) {
            Some(slot) => slot.1 = n,
            None => {
                at.insert(id.to_owned(), out.len());
                out.push((id.to_owned(), n));
            }
        }
    }
    out
}

/// Tokens and messages counted by a [`Ledger`].
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct Count {
    /// Tokens of the messages newly counted.
    pub tokens: u64,
    /// How many messages were newly counted.
    pub messages: u64,
}

/// Message ids already counted, shared across files so that a message seen in two files counts once.
#[derive(Debug, Clone, Default)]
pub struct Ledger {
    seen: HashSet<String>,
}

impl Ledger {
    /// A ledger that has counted nothing.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Counts the messages of one file (from [`of_file`]) whose ids this ledger has not counted yet.
    pub fn add(&mut self, messages: &[(String, u64)]) -> Count {
        let mut count = Count::default();
        for (id, n) in messages {
            if self.seen.insert(id.clone()) {
                count.tokens = count.tokens.saturating_add(*n);
                count.messages = count.messages.saturating_add(1);
            }
        }
        count
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn line(id: &str, input: u64) -> Value {
        json!({"type": "assistant", "message": {"id": id, "usage": {"input_tokens": input, "output_tokens": 1}}})
    }

    #[test]
    fn the_last_usage_of_an_id_in_a_file_counts() {
        let got = of_file(&[line("a", 10), line("b", 5), line("a", 20)]);
        assert_eq!(got, vec![("a".to_owned(), 21), ("b".to_owned(), 6)]);
    }

    #[test]
    fn a_message_in_two_files_counts_once() {
        let mut ledger = Ledger::new();
        let first = ledger.add(&of_file(&[line("a", 10)]));
        let second = ledger.add(&of_file(&[line("a", 99), line("c", 1)]));
        assert_eq!((first.tokens, second.tokens, second.messages), (11, 2, 1));
    }

    #[test]
    fn user_lines_and_lines_without_an_id_count_nothing() {
        let user = json!({"type": "user", "message": {"id": "u", "usage": {"input_tokens": 5}}});
        let no_id = json!({"type": "assistant", "message": {"usage": {"input_tokens": 5}}});
        assert!(of_file(&[user, no_id]).is_empty());
    }
}
