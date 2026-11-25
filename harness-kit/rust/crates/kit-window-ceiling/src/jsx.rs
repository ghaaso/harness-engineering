//! JavaScript and Node behaviours the window ceiling needs beyond `kit_core::js`: `Number(x)`, `Math.max` and
//! `Math.min` with `NaN`, `JSON.stringify` of any value, and Node's `path.dirname` and `path.basename` on text.

use kit_core::js;
use serde_json::Value;

/// `Number(s)` for a string: JavaScript's white space trimmed, empty is 0, `Infinity` with an optional sign, `0x`,
/// `0o` and `0b` literals without a sign, and decimal literals; anything else is `NaN`.
#[must_use]
pub fn number_of_str(s: &str) -> f64 {
    let t = js::trim(s);
    match t {
        "" => return 0.0,
        "Infinity" | "+Infinity" => return f64::INFINITY,
        "-Infinity" => return f64::NEG_INFINITY,
        _ => {}
    }
    let radix = match t.get(..2) {
        Some("0x" | "0X") => 16,
        Some("0o" | "0O") => 8,
        Some("0b" | "0B") => 2,
        _ => 0,
    };
    if radix != 0 {
        return t
            .get(2..)
            .filter(|d| !d.is_empty())
            .map_or(f64::NAN, |d| radix_value(d, radix));
    }
    decimal(t).unwrap_or(f64::NAN)
}

/// The value of digits in a radix, or `NaN` for a digit outside it.
fn radix_value(digits: &str, radix: u32) -> f64 {
    let mut v = 0.0_f64;
    for c in digits.chars() {
        match c.to_digit(radix) {
            Some(d) => v = v * f64::from(radix) + f64::from(d),
            None => return f64::NAN,
        }
    }
    v
}

/// A decimal literal as `Number` reads it (`1.`, `.5`, `+1e3`), `None` when it is not one.
fn decimal(t: &str) -> Option<f64> {
    let (sign, body) = match t.as_bytes().first() {
        Some(b'+') => ("", t.get(1..)?),
        Some(b'-') => ("-", t.get(1..)?),
        _ => ("", t),
    };
    let (mant, exp) = match body.split_once(['e', 'E']) {
        Some((m, e)) => (m, Some(e)),
        None => (body, None),
    };
    let (int, frac) = mant.split_once('.').unwrap_or((mant, ""));
    let digits = |s: &str| s.bytes().all(|c| c.is_ascii_digit());
    if !digits(int) || !digits(frac) || (int.is_empty() && frac.is_empty()) {
        return None;
    }
    let int = if int.is_empty() { "0" } else { int };
    let frac = if frac.is_empty() { "0" } else { frac };
    let mut text = format!("{sign}{int}.{frac}");
    if let Some(e) = exp {
        let ed = e.strip_prefix(['+', '-']).unwrap_or(e);
        if ed.is_empty() || !digits(ed) {
            return None;
        }
        text.push('e');
        text.push_str(e);
    }
    text.parse::<f64>().ok()
}

/// `Number(v)` for a JSON value; `None` is `undefined` (`NaN`).
#[must_use]
pub fn number_of(v: Option<&Value>) -> f64 {
    match v {
        None | Some(Value::Object(_)) => f64::NAN,
        Some(Value::Null) => 0.0,
        Some(Value::Bool(b)) => {
            if *b {
                1.0
            } else {
                0.0
            }
        }
        Some(Value::Number(n)) => n.as_f64().unwrap_or(f64::NAN),
        Some(Value::String(s)) => number_of_str(s),
        Some(a @ Value::Array(_)) => number_of_str(&js::to_string(a)),
    }
}

/// `Math.max(a, b)`: `NaN` if either is.
#[must_use]
pub fn max(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        f64::NAN
    } else {
        a.max(b)
    }
}

/// `Math.min(a, b)`: `NaN` if either is.
#[must_use]
pub fn min(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        f64::NAN
    } else {
        a.min(b)
    }
}

/// A whole number as a double, exactly up to 2^53.
#[must_use]
pub fn f64_of(x: u64) -> f64 {
    let hi = u32::try_from(x.checked_shr(32).unwrap_or(0)).unwrap_or(u32::MAX);
    let lo = u32::try_from(x & 0xFFFF_FFFF).unwrap_or(u32::MAX);
    f64::from(hi) * 4_294_967_296.0 + f64::from(lo)
}

/// A number as `JSON.stringify` writes it: `null` for `NaN` and the infinities.
#[must_use]
pub fn num_json(x: f64) -> String {
    if x.is_finite() {
        js::number_to_string(x)
    } else {
        "null".to_owned()
    }
}

/// `JSON.stringify(v)` (object keys in `serde_json`'s order; the hook only searches such text for words).
#[must_use]
pub fn stringify(v: &Value) -> String {
    match v {
        Value::Null => "null".to_owned(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => n.as_f64().map_or_else(|| "null".to_owned(), num_json),
        Value::String(s) => js::quote(s),
        Value::Array(items) => {
            let parts: Vec<String> = items.iter().map(stringify).collect();
            format!("[{}]", parts.join(","))
        }
        Value::Object(map) => {
            let parts: Vec<String> = map
                .iter()
                .map(|(k, v)| format!("{}:{}", js::quote(k), stringify(v)))
                .collect();
            format!("{{{}}}", parts.join(","))
        }
    }
}

/// The first `n` UTF-16 units of `s` (`s.slice(0, n)`), a cut pair written as U+FFFD as Node writes it out.
#[must_use]
pub fn cut(s: &str, n: usize) -> String {
    let mut u = js::utf16(s);
    u.truncate(n);
    String::from_utf16_lossy(&u)
}

/// A path separator for Node's `path` module on this system.
fn is_sep(b: u8) -> bool {
    b == b'/' || (cfg!(windows) && b == b'\\')
}

/// Node's `path.basename(p)`.
#[must_use]
pub fn basename(p: &str) -> &str {
    let b = p.as_bytes();
    let mut start = 0_usize;
    if cfg!(windows) && b.first().is_some_and(u8::is_ascii_alphabetic) && b.get(1) == Some(&b':') {
        start = 2;
    }
    let mut end: Option<usize> = None;
    let mut i = b.len();
    while i > start {
        i = i.saturating_sub(1);
        if b.get(i).copied().is_some_and(is_sep) {
            if end.is_some() {
                start = i.saturating_add(1);
                break;
            }
        } else if end.is_none() {
            end = Some(i.saturating_add(1));
        }
    }
    end.and_then(|e| p.get(start..e)).unwrap_or("")
}

/// Node's `path.dirname(p)`.
#[must_use]
pub fn dirname(p: &str) -> String {
    if cfg!(windows) {
        dirname_win(p)
    } else {
        dirname_posix(p)
    }
}

fn dirname_posix(p: &str) -> String {
    let b = p.as_bytes();
    if b.is_empty() {
        return ".".to_owned();
    }
    let has_root = b.first() == Some(&b'/');
    let mut end = None;
    let mut matched = true;
    let mut i = b.len();
    while i > 1 {
        i = i.saturating_sub(1);
        if b.get(i) == Some(&b'/') {
            if !matched {
                end = Some(i);
                break;
            }
        } else {
            matched = false;
        }
    }
    match end {
        None => if has_root { "/" } else { "." }.to_owned(),
        Some(1) if has_root => "//".to_owned(),
        Some(e) => p.get(..e).unwrap_or("").to_owned(),
    }
}

fn dirname_win(p: &str) -> String {
    let b = p.as_bytes();
    let len = b.len();
    let at = |i: usize| b.get(i).copied().unwrap_or(0);
    if len == 0 {
        return ".".to_owned();
    }
    if len == 1 {
        return if is_sep(at(0)) { p } else { "." }.to_owned();
    }
    let mut root_end: Option<usize> = None;
    let mut offset = 0_usize;
    if is_sep(at(0)) {
        root_end = Some(1);
        offset = 1;
        if is_sep(at(1)) {
            let mut j = 2_usize;
            let mut last = j;
            while j < len && !is_sep(at(j)) {
                j = j.saturating_add(1);
            }
            if j < len && j != last {
                last = j;
                while j < len && is_sep(at(j)) {
                    j = j.saturating_add(1);
                }
                if j < len && j != last {
                    last = j;
                    while j < len && !is_sep(at(j)) {
                        j = j.saturating_add(1);
                    }
                    if j == len {
                        return p.to_owned();
                    }
                    if j != last {
                        root_end = Some(j.saturating_add(1));
                        offset = j.saturating_add(1);
                    }
                }
            }
        }
    } else if at(0).is_ascii_alphabetic() && at(1) == b':' {
        let r = if len > 2 && is_sep(at(2)) { 3 } else { 2 };
        root_end = Some(r);
        offset = r;
    }
    let mut end = None;
    let mut matched = true;
    let mut i = len;
    while i > offset {
        i = i.saturating_sub(1);
        if is_sep(at(i)) {
            if !matched {
                end = Some(i);
                break;
            }
        } else {
            matched = false;
        }
    }
    let Some(end) = end.or(root_end) else {
        return ".".to_owned();
    };
    p.get(..end).unwrap_or("").to_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn number_reads_what_javascript_reads() {
        let cases: [(&str, f64); 8] = [
            ("0.4", 0.4),
            (" 5\n", 5.0),
            ("", 0.0),
            ("1.", 1.0),
            (".5", 0.5),
            ("+1e3", 1000.0),
            ("0x10", 16.0),
            ("-2.5E-1", -0.25),
        ];
        for (s, want) in cases {
            assert!((number_of_str(s) - want).abs() < 1e-12, "{s}");
        }
    }

    #[test]
    fn number_refuses_what_javascript_refuses() {
        for s in ["1.5x", "inf", "NaN", "-0x10", "1e", ".", "1_0", "infinity"] {
            assert!(number_of_str(s).is_nan(), "{s}");
        }
    }

    #[test]
    fn number_of_values_follows_javascript() {
        assert!((number_of(Some(&serde_json::json!(true))) - 1.0).abs() < f64::EPSILON);
        assert!((number_of(Some(&serde_json::json!([7]))) - 7.0).abs() < f64::EPSILON);
        assert!(number_of(Some(&serde_json::json!({}))).is_nan());
        assert!(number_of(None).is_nan());
    }

    #[test]
    fn basename_and_dirname_follow_node() {
        assert_eq!(basename("/a/b/c.jsonl"), "c.jsonl");
        assert_eq!(basename("/a/b/"), "b");
        assert_eq!(dirname("/a/b/c.jsonl"), "/a/b");
        assert_eq!(dirname("c.jsonl"), ".");
        assert_eq!(dirname("/x"), "/");
        if cfg!(windows) {
            assert_eq!(basename("C:\\a\\b.jsonl"), "b.jsonl");
            assert_eq!(dirname("C:\\a\\b.jsonl"), "C:\\a");
            assert_eq!(dirname("C:\\a"), "C:\\");
            assert_eq!(dirname("\\\\srv\\share\\x"), "\\\\srv\\share\\");
        }
    }

    #[test]
    fn f64_of_is_exact_for_times() {
        assert!((f64_of(1_764_000_000_123) - 1_764_000_000_123.0).abs() < f64::EPSILON);
    }
}
