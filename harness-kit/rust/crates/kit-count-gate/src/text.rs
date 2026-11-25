//! Text as the count gate's JavaScript handles it: strings in UTF-16 units where it cuts them (`slice`), its
//! `norm`, `glob`, `clip` and `short`, `Number(x)`, and the keys a JavaScript `Set` compares by.

use kit_core::js;
use serde_json::Value;

/// A message being built in UTF-16 units, so that a piece cut by `slice` (perhaps inside a surrogate pair) is
/// kept as JavaScript keeps it: standard error gets it as Node writes it (a lone surrogate as U+FFFD, see
/// [`lossy`]) and a log line as `JSON.stringify` writes it (`\udxxx`, see `js::quote_utf16`).
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct W(pub Vec<u16>);

impl W {
    /// An empty message.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Appends ordinary text.
    #[must_use]
    pub fn s(mut self, text: &str) -> Self {
        self.0.extend(text.encode_utf16());
        self
    }

    /// Appends UTF-16 units as they are.
    #[must_use]
    pub fn u(mut self, units: &[u16]) -> Self {
        self.0.extend_from_slice(units);
        self
    }
}

/// The units as Node writes them to a stream: a lone surrogate becomes U+FFFD.
#[must_use]
pub fn lossy(units: &[u16]) -> String {
    String::from_utf16_lossy(units)
}

/// `s.slice(0, n)` in UTF-16 units.
#[must_use]
pub fn cut(s: &str, n: usize) -> Vec<u16> {
    let mut v = js::utf16(s);
    v.truncate(n);
    v
}

/// True for a UTF-16 unit that is JavaScript white space (every one of them is a single unit).
fn space_unit(u: u16) -> bool {
    char::from_u32(u32::from(u)).is_some_and(js::is_space)
}

/// `String(e.message).replace(/\s+/g, ' ').slice(0, 120)`: the hook's `short`.
#[must_use]
pub fn short(msg: &[u16]) -> Vec<u16> {
    let mut out = Vec::with_capacity(msg.len());
    let mut in_space = false;
    for &u in msg {
        if space_unit(u) {
            if !in_space {
                out.push(u16::from(b' '));
            }
            in_space = true;
        } else {
            out.push(u);
            in_space = false;
        }
    }
    out.truncate(120);
    out
}

/// The hook's `clip`: a reason as written (trimmed), up to 200 units, cut only between words when the last space
/// lies past unit 100, then `" ..."`.
#[must_use]
pub fn clip(s: &str) -> Vec<u16> {
    let s = js::utf16(js::trim(s));
    if s.len() <= 200 {
        return s;
    }
    let c = s.get(..200).unwrap_or(&s);
    let k = c.iter().rposition(|&u| u == u16::from(b' '));
    let kept = match k {
        Some(k) if k > 100 => c.get(..k).unwrap_or(c),
        _ => c,
    };
    W::new().u(kept).s(" ...").0
}

/// The hook's `norm`: lower case, runs of white space as one space, trimmed.
#[must_use]
pub fn norm(s: &str) -> String {
    let lower = s.to_lowercase();
    let mut out = String::with_capacity(lower.len());
    let mut in_space = false;
    for c in lower.chars() {
        if js::is_space(c) {
            if !in_space {
                out.push(' ');
            }
            in_space = true;
        } else {
            out.push(c);
            in_space = false;
        }
    }
    js::trim(&out).to_owned()
}

/// The hook's `normAgent`: `String(a).trim().replace(/^agent-/, '')`.
#[must_use]
pub fn norm_agent(a: &str) -> String {
    let t = js::trim(a);
    t.strip_prefix("agent-").unwrap_or(t).to_owned()
}

/// `to.replace(/\s*\[[^\]]*\]$/, '')`: a trailing `[...]` (holding no `]`) and the white space before it removed.
#[must_use]
pub fn strip_bracket(to: &str) -> &str {
    let Some(body) = to.strip_suffix(']') else {
        return to;
    };
    let from = body.rfind(']').map_or(0, |k| k.saturating_add(1));
    let Some(open) = body.get(from..).and_then(|rest| rest.find('[')) else {
        return to;
    };
    let open = from.saturating_add(open);
    let head = to.get(..open).unwrap_or(to);
    head.trim_end_matches(js::is_space)
}

/// True when `s` is 1 to 80 of `[A-Za-z0-9_-]`.
#[must_use]
pub fn is_agent_id(s: &str) -> bool {
    (1..=80).contains(&s.len())
        && s.bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
}

/// The hook's `glob(p, s)`: `*` any units, `?` one unit, the whole of `s`; one backtrack point.
#[must_use]
pub fn glob(p: &[u16], s: &[u16]) -> bool {
    let star_u = u16::from(b'*');
    let any_u = u16::from(b'?');
    let (mut i, mut k) = (0usize, 0usize);
    let mut star: Option<usize> = None;
    let mut mark = 0usize;
    while let Some(&sc) = s.get(k) {
        let pc = p.get(i).copied();
        if pc.is_some_and(|c| c == any_u || c == sc) {
            i = i.saturating_add(1);
            k = k.saturating_add(1);
        } else if pc == Some(star_u) {
            star = Some(i);
            i = i.saturating_add(1);
            mark = k;
        } else if let Some(st) = star {
            i = st.saturating_add(1);
            mark = mark.saturating_add(1);
            k = mark;
        } else {
            return false;
        }
    }
    while p.get(i) == Some(&star_u) {
        i = i.saturating_add(1);
    }
    i == p.len()
}

/// `n` as a double (counts stay far below 2^32).
#[must_use]
pub fn nf(n: usize) -> f64 {
    u32::try_from(n).map_or_else(|_| f64::from(u32::MAX), f64::from)
}

/// A `u64` as a double, as JavaScript holds it.
#[must_use]
pub fn uf(x: u64) -> f64 {
    let hi = u32::try_from(x.checked_shr(32).unwrap_or(0)).unwrap_or(u32::MAX);
    let lo = u32::try_from(x & 0xffff_ffff).unwrap_or(0);
    f64::from(hi).mul_add(4_294_967_296.0, f64::from(lo))
}

/// The value of the digits of `s` in base `radix`, or NaN when `s` is empty or holds another character.
fn radix_value(s: &str, radix: u32) -> f64 {
    if s.is_empty() {
        return f64::NAN;
    }
    let mut v = 0.0f64;
    for c in s.chars() {
        let Some(d) = c.to_digit(radix) else {
            return f64::NAN;
        };
        v = v.mul_add(f64::from(radix), f64::from(d));
    }
    v
}

/// True when `s` is a decimal literal as `Number(s)` reads one: `[+-]? (digits [. digits?] | . digits) ([eE][+-]? digits)?`.
fn is_decimal(s: &str) -> bool {
    let b = s.as_bytes();
    let mut i = 0usize;
    let at = |i: usize| b.get(i).copied();
    if matches!(at(i), Some(b'+' | b'-')) {
        i = i.saturating_add(1);
    }
    let mut digits = 0usize;
    while at(i).is_some_and(|c| c.is_ascii_digit()) {
        i = i.saturating_add(1);
        digits = digits.saturating_add(1);
    }
    if at(i) == Some(b'.') {
        i = i.saturating_add(1);
        while at(i).is_some_and(|c| c.is_ascii_digit()) {
            i = i.saturating_add(1);
            digits = digits.saturating_add(1);
        }
    }
    if digits == 0 {
        return false;
    }
    if matches!(at(i), Some(b'e' | b'E')) {
        i = i.saturating_add(1);
        if matches!(at(i), Some(b'+' | b'-')) {
            i = i.saturating_add(1);
        }
        let start = i;
        while at(i).is_some_and(|c| c.is_ascii_digit()) {
            i = i.saturating_add(1);
        }
        if i == start {
            return false;
        }
    }
    i == b.len()
}

/// `Number(s)` for a string.
#[must_use]
pub fn str_to_number(s: &str) -> f64 {
    let t = js::trim(s);
    if t.is_empty() {
        return 0.0;
    }
    match t {
        "Infinity" | "+Infinity" => return f64::INFINITY,
        "-Infinity" => return f64::NEG_INFINITY,
        _ => {}
    }
    for (pre, radix) in [
        ("0x", 16),
        ("0X", 16),
        ("0o", 8),
        ("0O", 8),
        ("0b", 2),
        ("0B", 2),
    ] {
        if let Some(rest) = t.strip_prefix(pre) {
            return radix_value(rest, radix);
        }
    }
    if is_decimal(t) {
        t.parse::<f64>().unwrap_or(f64::NAN)
    } else {
        f64::NAN
    }
}

/// `Number(v)` for a JSON value; a missing value (`undefined`) is NaN.
#[must_use]
pub fn to_number(v: Option<&Value>) -> f64 {
    match v {
        None => f64::NAN,
        Some(Value::Null) => 0.0,
        Some(Value::Bool(b)) => f64::from(u8::from(*b)),
        Some(Value::Number(n)) => n.as_f64().unwrap_or(f64::NAN),
        Some(Value::String(s)) => str_to_number(s),
        Some(a @ Value::Array(_)) => str_to_number(&js::to_string(a)),
        Some(Value::Object(_)) => f64::NAN,
    }
}

/// `Number(v) || 0`.
#[must_use]
pub fn number_or_zero(v: Option<&Value>) -> f64 {
    let n = to_number(v);
    if n.is_nan() { 0.0 } else { n }
}

/// The key a JavaScript `Set` or `Map` compares a JSON value by (SameValueZero); `None` for an array or object,
/// which equals nothing parsed elsewhere.
#[must_use]
pub fn key_of(v: &Value) -> Option<String> {
    match v {
        Value::Null => Some("z".to_owned()),
        Value::Bool(b) => Some(format!("b{b}")),
        Value::Number(n) => Some(format!(
            "n{}",
            js::number_to_string(n.as_f64().unwrap_or(f64::NAN))
        )),
        Value::String(s) => Some(format!("s{s}")),
        Value::Array(_) | Value::Object(_) => None,
    }
}

/// A value that JavaScript finds truthy, or `None`.
#[must_use]
pub fn truthy(v: Option<&Value>) -> Option<&Value> {
    v.filter(|x| js::truthy(x))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn u(s: &str) -> Vec<u16> {
        js::utf16(s)
    }

    #[test]
    fn glob_matches_stars_and_question_marks_over_the_whole_text() {
        assert!(glob(
            &u("orchestrate: wave2 *"),
            &u("orchestrate: wave2 f4c memory")
        ));
        assert!(glob(&u("*replay-*"), &u("analyse: replay-l8 x")));
        assert!(!glob(&u("a?c"), &u("abcd")));
        assert!(glob(&u("a*"), &u("a")));
    }

    #[test]
    fn glob_question_mark_is_one_utf16_unit() {
        assert!(glob(&u("??"), &u("\u{1f600}")));
        assert!(!glob(&u("?"), &u("\u{1f600}")));
    }

    #[test]
    fn strip_bracket_removes_the_last_group_and_its_space() {
        assert_eq!(strip_bracket("gone  [opus]"), "gone");
        assert_eq!(strip_bracket("a [x] [y]"), "a [x]");
        assert_eq!(strip_bracket("a[b[c]"), "a");
        assert_eq!(strip_bracket("plain"), "plain");
        assert_eq!(strip_bracket("x]"), "x]");
    }

    #[test]
    fn norm_lowers_and_collapses_space() {
        assert_eq!(norm("  Analyse:\t One\u{feff} TWO "), "analyse: one two");
    }

    #[test]
    fn number_reads_strings_as_javascript_does() {
        assert!((str_to_number(" 6 ") - 6.0).abs() < f64::EPSILON);
        assert!((str_to_number("0x14") - 20.0).abs() < f64::EPSILON);
        assert!((str_to_number("1e1") - 10.0).abs() < f64::EPSILON);
        assert!(str_to_number("many").is_nan());
        assert!(str_to_number("inf").is_nan());
        assert!(str_to_number("").abs() < f64::EPSILON);
    }

    #[test]
    fn clip_cuts_between_words_past_unit_100() {
        let long = format!("{} tail", "word ".repeat(50));
        let c = lossy(&clip(&long));
        assert!(c.ends_with("word ..."));
        assert!(js::len(&c) <= 204);
    }

    #[test]
    fn short_collapses_space_and_cuts_at_120() {
        let s = short(&u(&format!("a \n\t b{}", "x".repeat(200))));
        assert_eq!(s.len(), 120);
        assert_eq!(s.get(..4), Some(u("a bx").as_slice()));
    }

    #[test]
    fn uf_holds_large_values() {
        assert!((uf(1_764_000_000_123) - 1_764_000_000_123.0).abs() < f64::EPSILON);
    }
}
