//! The hook's input: the JSON the app writes to standard input, read as the JavaScript hooks read it
//! (`JSON.parse(readFileSync(0, 'utf8'))` inside a `try`).

use serde_json::Value;
use std::io::Read;

/// The hook's input.
#[derive(Debug, Clone, PartialEq)]
pub enum Input {
    /// The input parsed as JSON. It may be any JSON value, `null` included: a JavaScript hook that reads a field of
    /// `null` throws, and its port must end as [`crate::outcome::Outcome::Fail`] there.
    Json(Value),
    /// Empty, not JSON, or standard input could not be read: where the JavaScript's `catch` runs.
    Unreadable,
}

/// Reads standard input to its end and parses it with [`parse`].
#[must_use]
pub fn read_stdin() -> Input {
    let mut bytes = Vec::new();
    match std::io::stdin().lock().read_to_end(&mut bytes) {
        Ok(_) => parse(&bytes),
        Err(_) => Input::Unreadable,
    }
}

/// Parses bytes as the JavaScript does: invalid UTF-8 becomes U+FFFD (as Node's `'utf8'` decoding does), then JSON.
/// A byte-order mark makes the input unreadable, as in `JSON.parse`. One difference is mended: `JSON.parse` accepts
/// a lone surrogate escape (`"\ud800"`) and `serde_json` does not, so on such a failure each lone surrogate escape is
/// replaced by `\ufffd` and the text parsed again (the value then holds U+FFFD where the JavaScript holds the lone
/// surrogate).
#[must_use]
pub fn parse(bytes: &[u8]) -> Input {
    let text = String::from_utf8_lossy(bytes);
    if let Ok(v) = serde_json::from_str::<Value>(&text) {
        return Input::Json(v);
    }
    match mend_lone_surrogates(&text).map(|t| serde_json::from_str::<Value>(&t)) {
        Some(Ok(v)) => Input::Json(v),
        _ => Input::Unreadable,
    }
}

/// Parses one JSON text (a transcript line, a file) as `JSON.parse` does, with the same mending as [`parse`];
/// `None` where `JSON.parse` would throw.
#[must_use]
pub fn parse_text(text: &str) -> Option<Value> {
    match serde_json::from_str::<Value>(text) {
        Ok(v) => Some(v),
        Err(_) => mend_lone_surrogates(text).and_then(|t| serde_json::from_str::<Value>(&t).ok()),
    }
}

/// The four hex digits after `\u`, as a number.
fn hex4(chars: &mut std::iter::Peekable<std::str::Chars<'_>>) -> Option<(u16, String)> {
    let mut digits = String::with_capacity(4);
    for _ in 0..4 {
        let c = chars.next_if(char::is_ascii_hexdigit)?;
        digits.push(c);
    }
    u16::from_str_radix(&digits, 16).ok().map(|n| (n, digits))
}

/// The text with every lone surrogate escape replaced by `\ufffd`, or `None` when there is none.
fn mend_lone_surrogates(text: &str) -> Option<String> {
    let mut out = String::with_capacity(text.len());
    let mut changed = false;
    let mut chars = text.chars().peekable();
    while let Some(c) = chars.next() {
        out.push(c);
        if c != '\\' {
            continue;
        }
        match chars.next() {
            Some('u') => {}
            Some(other) => {
                out.push(other);
                continue;
            }
            None => break,
        }
        out.push('u');
        let Some((unit, digits)) = hex4(&mut chars) else {
            continue;
        };
        if (0xD800..=0xDBFF).contains(&unit) {
            let mut ahead = chars.clone();
            let low = (ahead.next() == Some('\\') && ahead.next() == Some('u'))
                .then(|| hex4(&mut ahead))
                .flatten()
                .filter(|(n, _)| (0xDC00..=0xDFFF).contains(n));
            if let Some((_, low_digits)) = low {
                out.push_str(&digits);
                out.push_str("\\u");
                out.push_str(&low_digits);
                chars = ahead;
            } else {
                out.push_str("fffd");
                changed = true;
            }
        } else if (0xDC00..=0xDFFF).contains(&unit) {
            out.push_str("fffd");
            changed = true;
        } else {
            out.push_str(&digits);
        }
    }
    changed.then_some(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_input_is_unreadable() {
        assert_eq!(parse(b""), Input::Unreadable);
    }

    #[test]
    fn broken_input_is_unreadable() {
        assert_eq!(parse(b"not json"), Input::Unreadable);
    }

    #[test]
    fn a_byte_order_mark_is_unreadable_as_in_json_parse() {
        assert_eq!(parse("\u{feff}{}".as_bytes()), Input::Unreadable);
    }

    #[test]
    fn null_is_json() {
        assert_eq!(parse(b" null\n"), Input::Json(Value::Null));
    }

    #[test]
    fn a_lone_surrogate_is_mended_not_refused() {
        let got = parse(br#"{"a":"x\ud800y","b":"\ud83d\ude00"}"#);
        let want = serde_json::json!({"a": "x\u{fffd}y", "b": "\u{1f600}"});
        assert_eq!(got, Input::Json(want));
    }

    #[test]
    fn an_escaped_backslash_before_u_is_not_an_escape() {
        let got = parse(br#"{"a":"\\ud800"}"#);
        assert_eq!(got, Input::Json(serde_json::json!({"a": "\\ud800"})));
    }
}
