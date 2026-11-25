//! A transcript as the fan-out gate reads it (`lines(path)`): the app's `api-request` lines as markers, and the
//! conversation's `assistant` and `user` lines parsed; every other line is left out.

use crate::jsv::{self, Js};
use kit_core::transcript;
use serde_json::Value;
use std::path::Path;

/// One line kept from a transcript.
#[derive(Debug, Clone, PartialEq)]
pub enum Line {
    /// `{"type":"api-request"...`: the app sent a request.
    Api,
    /// A conversation line whose `type` is `assistant` or `user`.
    Msg(Value),
}

impl Line {
    /// The line's `type`.
    #[must_use]
    pub fn kind(&self) -> &str {
        match self {
            Self::Api => "api-request",
            Self::Msg(v) => v.get("type").and_then(Value::as_str).unwrap_or(""),
        }
    }

    /// True for an `assistant` line.
    #[must_use]
    pub fn is_assistant(&self) -> bool {
        self.kind() == "assistant"
    }

    /// The parsed line, for a conversation line.
    #[must_use]
    pub fn value(&self) -> Option<&Value> {
        match self {
            Self::Api => None,
            Self::Msg(v) => Some(v),
        }
    }

    /// `o.message`.
    #[must_use]
    pub fn message(&self) -> Option<&Value> {
        self.value().and_then(|v| v.get("message"))
    }

    /// `o.message.id`: throws where the line has no message (or a `null` one).
    ///
    /// # Errors
    /// As V8's `TypeError`.
    pub fn message_id(&self) -> Js<Option<&Value>> {
        jsv::prop(self.message(), "id")
    }

    /// `blocks(o)`: the message's content when it is a list, else nothing.
    #[must_use]
    pub fn blocks(&self) -> &[Value] {
        self.message()
            .filter(|m| kit_core::js::truthy(m))
            .and_then(|m| m.get("content"))
            .and_then(Value::as_array)
            .map_or(&[], Vec::as_slice)
    }
}

/// `lines(path)`: the kept lines of the file at `path` (a missing file has none).
#[must_use]
pub fn read(path: &Path) -> Vec<Line> {
    let mut out = Vec::new();
    for l in transcript::lines(path) {
        if l.starts_with("{\"type\":\"api-request\"") {
            out.push(Line::Api);
            continue;
        }
        if !l.starts_with("{\"parentUuid\"") {
            continue;
        }
        if let Some(v) = kit_core::input::parse_text(&l) {
            let kind = v.get("type").and_then(Value::as_str);
            if kind == Some("assistant") || kind == Some("user") {
                out.push(Line::Msg(v));
            }
        }
    }
    out
}

/// `b.type` of a content block: throws on a `null` block.
///
/// # Errors
/// As V8's `TypeError`.
pub fn block_type(b: &Value) -> Js<Option<&str>> {
    Ok(jsv::prop(Some(b), "type")?.and_then(Value::as_str))
}
