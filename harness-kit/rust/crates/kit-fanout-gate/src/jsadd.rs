//! JavaScript's `+`, `ToNumber` and `ToString` on the values the hooks add up: the token sum
//! `(u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.output_tokens || 0)`
//! of `.claude/hooks/fanout-gate.mjs` and `harness-kit/tokens.mjs`, the sums built from it, and a meter reading plus
//! what the meter can have moved. In transcripts every usage field is a whole number and these are plain sums; a value
//! of another kind is added as JavaScript adds it (a string joins as text, `true` is 1).
//!
//! Shared by kit-fanout-gate and kit-tokens: kit-tokens includes this file by its path (it belongs in kit-core,
//! which the port builders do not edit).

use kit_core::js;
use serde_json::Value;

/// The four usage fields, in the order the JavaScript adds them.
const FIELDS: [&str; 4] = [
    "input_tokens",
    "cache_creation_input_tokens",
    "cache_read_input_tokens",
    "output_tokens",
];

/// A primitive value as `+` and a comparison see it.
#[derive(Debug, Clone, PartialEq)]
pub enum Prim {
    /// `null`.
    Null,
    /// `true` or `false`.
    Bool(bool),
    /// A number.
    Num(f64),
    /// A string (an array or object becomes one: its `String(v)`).
    Str(String),
}

impl Prim {
    /// The primitive of a JSON value (`ToPrimitive`: an array is its items joined, an object `[object Object]`).
    #[must_use]
    pub fn of(v: &Value) -> Self {
        match v {
            Value::Null => Self::Null,
            Value::Bool(b) => Self::Bool(*b),
            Value::Number(n) => Self::Num(n.as_f64().unwrap_or(f64::NAN)),
            Value::String(s) => Self::Str(s.clone()),
            Value::Array(_) | Value::Object(_) => Self::Str(js::to_string(v)),
        }
    }

    /// `v || 0`.
    #[must_use]
    pub fn or0(v: Option<&Value>) -> Self {
        match v {
            Some(x) if js::truthy(x) => Self::of(x),
            _ => Self::Num(0.0),
        }
    }

    /// `self + other`: text joined when either is a string, else the numbers added.
    #[must_use]
    pub fn add(&self, other: &Self) -> Self {
        match (self, other) {
            (Self::Str(_), _) | (_, Self::Str(_)) => {
                Self::Str(format!("{}{}", self.text(), other.text()))
            }
            _ => Self::Num(self.number() + other.number()),
        }
    }

    /// `ToNumber`.
    #[must_use]
    pub fn number(&self) -> f64 {
        match self {
            Self::Null | Self::Bool(false) => 0.0,
            Self::Bool(true) => 1.0,
            Self::Num(x) => *x,
            Self::Str(s) => string_to_number(s),
        }
    }

    /// `ToString` (`String(v)`, a template literal).
    #[must_use]
    pub fn text(&self) -> String {
        match self {
            Self::Null => "null".to_owned(),
            Self::Bool(b) => b.to_string(),
            Self::Num(x) => js::number_to_string(*x),
            Self::Str(s) => s.clone(),
        }
    }
}

/// The tokens of one usage object: the four fields, each `|| 0`, added left to right.
#[must_use]
pub fn usage_sum(u: &Value) -> Prim {
    let mut terms = FIELDS.iter().map(|f| Prim::or0(u.get(*f)));
    match terms.next() {
        Some(first) => terms.fold(first, |sum, t| sum.add(&t)),
        None => Prim::Num(0.0),
    }
}

/// True for JavaScript's unsigned decimal literal: digits with an optional fraction, or a fraction alone, then an
/// optional exponent (`12`, `1.`, `.5`, `1e+3`).
fn is_decimal(s: &str) -> bool {
    let b = s.as_bytes();
    let digits = |from: usize| {
        b.iter()
            .skip(from)
            .take_while(|c| c.is_ascii_digit())
            .count()
    };
    let int = digits(0);
    let mut i = int;
    let mut frac = 0;
    if b.get(i) == Some(&b'.') {
        i = i.saturating_add(1);
        frac = digits(i);
        i = i.saturating_add(frac);
    }
    if int == 0 && frac == 0 {
        return false;
    }
    if matches!(b.get(i), Some(b'e' | b'E')) {
        i = i.saturating_add(1);
        if matches!(b.get(i), Some(b'+' | b'-')) {
            i = i.saturating_add(1);
        }
        let exp = digits(i);
        if exp == 0 {
            return false;
        }
        i = i.saturating_add(exp);
    }
    i == b.len()
}

/// The value of `digits` in `radix` (`0x`, `0o`, `0b` literals); NaN when empty or a digit is not of the radix.
fn radix_value(digits: &str, radix: u32) -> f64 {
    if digits.is_empty() {
        return f64::NAN;
    }
    let mut acc = 0.0_f64;
    for c in digits.chars() {
        let Some(d) = c.to_digit(radix) else {
            return f64::NAN;
        };
        acc = acc * f64::from(radix) + f64::from(d);
    }
    acc
}

/// `Number(s)` for a string: JavaScript's white space trimmed, empty is 0, `Infinity` with a sign, `0x`/`0o`/`0b`
/// literals without one, a decimal literal with one; anything else NaN.
#[must_use]
pub fn string_to_number(s: &str) -> f64 {
    let t = js::trim(s);
    if t.is_empty() {
        return 0.0;
    }
    for (prefix, radix) in [
        ("0x", 16),
        ("0X", 16),
        ("0o", 8),
        ("0O", 8),
        ("0b", 2),
        ("0B", 2),
    ] {
        if let Some(d) = t.strip_prefix(prefix) {
            return radix_value(d, radix);
        }
    }
    let (negative, body) = match t.strip_prefix('-') {
        Some(rest) => (true, rest),
        None => (false, t.strip_prefix('+').unwrap_or(t)),
    };
    let x = if body == "Infinity" {
        f64::INFINITY
    } else if is_decimal(body) {
        body.parse::<f64>().unwrap_or(f64::NAN)
    } else {
        return f64::NAN;
    };
    if negative { -x } else { x }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn shown(x: f64) -> String {
        js::number_to_string(x)
    }

    #[test]
    fn whole_numbers_add_up() {
        let u = json!({"input_tokens": 1, "cache_creation_input_tokens": 989, "cache_read_input_tokens": 0, "output_tokens": 10});
        assert_eq!(usage_sum(&u), Prim::Num(1000.0));
    }

    #[test]
    fn a_string_field_joins_as_text_from_where_it_stands() {
        // ("5" || 0) + (undefined || 0) + (0 || 0) + 3 is "5003" in JavaScript; 1 + "5" + 0 + 0 is "1500".
        let u = json!({"input_tokens": "5", "cache_read_input_tokens": 0, "output_tokens": 3});
        assert_eq!(usage_sum(&u), Prim::Str("5003".to_owned()));
        let v = json!({"input_tokens": 1, "cache_creation_input_tokens": "5"});
        assert_eq!(usage_sum(&v), Prim::Str("1500".to_owned()));
    }

    #[test]
    fn true_counts_one_and_a_fraction_is_kept() {
        let u = json!({"input_tokens": true, "output_tokens": 1.5});
        assert_eq!(shown(usage_sum(&u).number()), "2.5");
    }

    #[test]
    fn strings_become_numbers_as_javascript_reads_them() {
        let cases = [
            (" 12 ", "12"),
            ("", "0"),
            ("0x1f", "31"),
            ("-0x1", "NaN"),
            ("1e3", "1000"),
            (".5", "0.5"),
            ("5.", "5"),
            ("-Infinity", "-Infinity"),
            ("abc", "NaN"),
            ("1_000", "NaN"),
            ("500.123", "500.123"),
            ("inf", "NaN"),
        ];
        for (s, want) in cases {
            assert_eq!(shown(string_to_number(s)), want, "{s:?}");
        }
    }

    #[test]
    fn a_reading_given_as_text_joins_the_minutes_moved() {
        // "50" + 0.5 is "500.5", which compares as 500.5.
        let sum = Prim::of(&json!("50")).add(&Prim::Num(0.5));
        assert_eq!(shown(sum.number()), "500.5");
        let arr = Prim::of(&json!([7])).add(&Prim::Num(1.0));
        assert_eq!(arr, Prim::Str("71".to_owned()));
        assert!(
            Prim::of(&json!({"a": 1}))
                .add(&Prim::Num(1.0))
                .number()
                .is_nan()
        );
    }
}
