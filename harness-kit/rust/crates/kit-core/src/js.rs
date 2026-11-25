//! JavaScript's own behaviours, where a port must print or decide what its JavaScript hook prints or decides.
//!
//! JavaScript strings are UTF-16: `s.length` and `s.slice(0, n)` count UTF-16 units, not bytes or `char`s
//! ([`len`], [`utf16`]); `trim` and `\s` use JavaScript's white space ([`is_space`], [`trim`]); `String(x)` and
//! template literals format numbers their own way ([`to_string`], [`display`], [`number_to_string`]);
//! `toFixed` rounds half up on the exact value ([`to_fixed`]); `Math.round` rounds halves up ([`round`]);
//! `Date.parse` and `toISOString` ([`date_parse`], [`iso_string`]); the default `sort()` compares UTF-16 units
//! ([`cmp_utf16`]); `Object.keys` keeps the order of the text ([`object_keys`]), which `serde_json`'s map does not.

use serde_json::Value;
use std::cmp::Ordering;
use std::num::FpCategory;

/// JavaScript's white space and line terminators (what `trim` removes and `\s` matches). Unlike Rust's
/// `char::is_whitespace` it holds U+FEFF and not U+0085.
#[must_use]
pub fn is_space(c: char) -> bool {
    matches!(
        c,
        '\t' | '\n' | '\u{0B}' | '\u{0C}' | '\r' | ' ' | '\u{A0}' | '\u{1680}' | '\u{2000}'
            ..='\u{200A}'
                | '\u{2028}'
                | '\u{2029}'
                | '\u{202F}'
                | '\u{205F}'
                | '\u{3000}'
                | '\u{FEFF}'
    )
}

/// `s.trim()`.
#[must_use]
pub fn trim(s: &str) -> &str {
    s.trim_matches(is_space)
}

/// The string as UTF-16 units: `v.len()` is `s.length`, `v.truncate(n)` is `s.slice(0, n)`.
#[must_use]
pub fn utf16(s: &str) -> Vec<u16> {
    s.encode_utf16().collect()
}

/// `s.length`: the number of UTF-16 units.
#[must_use]
pub fn len(s: &str) -> usize {
    s.encode_utf16().count()
}

/// Appends `c` to `out` as `JSON.stringify` writes it inside a string.
fn push_escaped(out: &mut String, c: char) {
    match c {
        '"' => out.push_str("\\\""),
        '\\' => out.push_str("\\\\"),
        '\u{08}' => out.push_str("\\b"),
        '\u{0C}' => out.push_str("\\f"),
        '\n' => out.push_str("\\n"),
        '\r' => out.push_str("\\r"),
        '\t' => out.push_str("\\t"),
        c if u32::from(c) < 0x20 => out.push_str(&format!("\\u{:04x}", u32::from(c))),
        c => out.push(c),
    }
}

/// `JSON.stringify(s)` for a string.
#[must_use]
pub fn quote(s: &str) -> String {
    let mut out = String::with_capacity(s.len().saturating_add(2));
    out.push('"');
    for c in s.chars() {
        push_escaped(&mut out, c);
    }
    out.push('"');
    out
}

/// `JSON.stringify(s)` for a string given as UTF-16 units, a lone surrogate written as `\udxxx` as JavaScript
/// writes it.
#[must_use]
pub fn quote_utf16(units: &[u16]) -> String {
    let mut out = String::with_capacity(units.len().saturating_add(2));
    out.push('"');
    for c in char::decode_utf16(units.iter().copied()) {
        match c {
            Ok(c) => push_escaped(&mut out, c),
            Err(e) => out.push_str(&format!("\\u{:04x}", e.unpaired_surrogate())),
        }
    }
    out.push('"');
    out
}

/// JavaScript's truthiness of a JSON value: `null`, `false`, `0`, `""` are false; every array and object is true.
#[must_use]
pub fn truthy(v: &Value) -> bool {
    match v {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::Number(n) => n
            .as_f64()
            .is_some_and(|x| !x.is_nan() && x.classify() != FpCategory::Zero),
        Value::String(s) => !s.is_empty(),
        Value::Array(_) | Value::Object(_) => true,
    }
}

/// `String(v)`: `null` is `"null"`, an object `"[object Object]"`, an array its items joined by `,` (a `null` item
/// empty), a number as [`number_to_string`].
#[must_use]
pub fn to_string(v: &Value) -> String {
    match v {
        Value::Null => "null".to_owned(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => n.as_f64().map_or_else(|| n.to_string(), number_to_string),
        Value::String(s) => s.clone(),
        Value::Array(items) => join(items, ","),
        Value::Object(_) => "[object Object]".to_owned(),
    }
}

/// `items.join(sep)`: each item as [`to_string`], a `null` item empty.
#[must_use]
pub fn join(items: &[Value], sep: &str) -> String {
    let parts: Vec<String> = items
        .iter()
        .map(|i| {
            if i.is_null() {
                String::new()
            } else {
                to_string(i)
            }
        })
        .collect();
    parts.join(sep)
}

/// A value in a template literal (`${v}`): [`to_string`], and `"undefined"` for a missing value.
#[must_use]
pub fn display(v: Option<&Value>) -> String {
    v.map_or_else(|| "undefined".to_owned(), to_string)
}

/// `String(x)` for a number: the shortest digits that give `x` back, written plainly from 1e-6 up to below 1e21
/// and with an exponent outside (`1e+21`, `1.5e-7`); `-0` is `"0"`.
#[must_use]
pub fn number_to_string(x: f64) -> String {
    if x.is_nan() {
        return "NaN".to_owned();
    }
    if x.is_infinite() {
        return if x > 0.0 { "Infinity" } else { "-Infinity" }.to_owned();
    }
    if x.classify() == FpCategory::Zero {
        return "0".to_owned();
    }
    let sign = if x < 0.0 { "-" } else { "" };
    let sci = format!("{:e}", x.abs());
    let (mantissa, exp) = sci.split_once('e').unwrap_or((sci.as_str(), "0"));
    let digits: String = mantissa.chars().filter(char::is_ascii_digit).collect();
    let k = i64::try_from(digits.len()).unwrap_or(i64::MAX);
    let n = exp.parse::<i64>().unwrap_or(0).saturating_add(1);
    let count = |v: i64| usize::try_from(v).unwrap_or(0);
    let body = if k <= n && n <= 21 {
        format!("{digits}{}", "0".repeat(count(n.saturating_sub(k))))
    } else if 0 < n && n <= 21 {
        let (head, tail) = digits
            .split_at_checked(count(n))
            .unwrap_or((digits.as_str(), ""));
        format!("{head}.{tail}")
    } else if -6 < n && n <= 0 {
        format!("0.{}{digits}", "0".repeat(count(n.saturating_neg())))
    } else {
        let e = n.saturating_sub(1);
        let (first, rest) = digits.split_at_checked(1).unwrap_or((digits.as_str(), ""));
        let point = if rest.is_empty() { "" } else { "." };
        let esign = if e >= 0 { "+" } else { "-" };
        format!("{first}{point}{rest}e{esign}{}", e.unsigned_abs())
    };
    format!("{sign}{body}")
}

/// `x.toFixed(digits)` (`digits` up to 100): the exact value of `x` rounded half up (Rust's `{:.N}` rounds an exact
/// half to even: `0.25.toFixed(1)` is `"0.3"` where `format!("{:.1}", 0.25)` is `"0.2"`). From 1e21 up it is
/// [`number_to_string`], as in JavaScript.
#[must_use]
pub fn to_fixed(x: f64, digits: usize) -> String {
    if !x.is_finite() || x.abs() >= 1e21 {
        return number_to_string(x);
    }
    let digits = digits.min(100);
    // 1100 places hold every digit of any double's exact value.
    let exact = format!("{:.1100}", x.abs());
    let (int, frac) = exact.split_once('.').unwrap_or((exact.as_str(), ""));
    let mut ds: Vec<u8> = int.bytes().chain(frac.bytes().take(digits)).collect();
    if frac.as_bytes().get(digits).is_some_and(|&d| d >= b'5') {
        let mut carry = true;
        for d in ds.iter_mut().rev() {
            if *d == b'9' {
                *d = b'0';
            } else {
                *d = d.saturating_add(1);
                carry = false;
                break;
            }
        }
        if carry {
            ds.insert(0, b'1');
        }
    }
    let int_len = ds.len().saturating_sub(digits);
    let (head, tail) = ds.split_at_checked(int_len).unwrap_or((ds.as_slice(), &[]));
    let sign = if x < 0.0 { "-" } else { "" };
    let head = String::from_utf8_lossy(head);
    if tail.is_empty() {
        format!("{sign}{head}")
    } else {
        format!("{sign}{head}.{}", String::from_utf8_lossy(tail))
    }
}

/// `Math.round(x)`: to the nearest whole number, halves up (`Math.round(-2.5)` is `-2`; Rust's `f64::round` gives
/// `-3`).
#[must_use]
pub fn round(x: f64) -> f64 {
    if !x.is_finite() {
        return x;
    }
    let f = x.floor();
    if x - f >= 0.5 { f + 1.0 } else { f }
}

/// `Date.now()`: milliseconds since 1970-01-01 UTC.
#[must_use]
pub fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |d| u64::try_from(d.as_millis()).unwrap_or(u64::MAX))
}

/// Days from 1970-01-01 to the given day of the proleptic Gregorian calendar (a day past the month's end runs on
/// into the next month, as `Date.parse("2026-02-30")` does).
fn days_from_civil(year: i64, month: i64, day: i64) -> Option<i64> {
    let y = if month <= 2 {
        year.checked_sub(1)?
    } else {
        year
    };
    let era = y
        .checked_sub(if y >= 0 { 0 } else { 399 })?
        .checked_div(400)?;
    let yoe = y.checked_sub(era.checked_mul(400)?)?;
    let mp = month.checked_add(if month > 2 { -3 } else { 9 })?;
    let doy = mp
        .checked_mul(153)?
        .checked_add(2)?
        .checked_div(5)?
        .checked_add(day)?
        .checked_sub(1)?;
    let doe = yoe
        .checked_mul(365)?
        .checked_add(yoe.checked_div(4)?)?
        .checked_sub(yoe.checked_div(100)?)?
        .checked_add(doy)?;
    era.checked_mul(146_097)?
        .checked_add(doe)?
        .checked_sub(719_468)
}

/// The year, month and day of a count of days from 1970-01-01.
fn civil_from_days(days: i64) -> Option<(i64, i64, i64)> {
    let z = days.checked_add(719_468)?;
    let era = z
        .checked_sub(if z >= 0 { 0 } else { 146_096 })?
        .checked_div(146_097)?;
    let doe = z.checked_sub(era.checked_mul(146_097)?)?;
    let yoe = doe
        .checked_sub(doe.checked_div(1460)?)?
        .checked_add(doe.checked_div(36_524)?)?
        .checked_sub(doe.checked_div(146_096)?)?
        .checked_div(365)?;
    let doy = doe.checked_sub(
        yoe.checked_mul(365)?
            .checked_add(yoe.checked_div(4)?)?
            .checked_sub(yoe.checked_div(100)?)?,
    )?;
    let mp = doy.checked_mul(5)?.checked_add(2)?.checked_div(153)?;
    let day = doy
        .checked_sub(mp.checked_mul(153)?.checked_add(2)?.checked_div(5)?)?
        .checked_add(1)?;
    let month = if mp < 10 {
        mp.checked_add(3)?
    } else {
        mp.checked_sub(9)?
    };
    let year = yoe
        .checked_add(era.checked_mul(400)?)?
        .checked_add(i64::from(month <= 2))?;
    Some((year, month, day))
}

/// The largest time a JavaScript `Date` holds, in milliseconds either side of 1970.
const MAX_TIME: i64 = 8_640_000_000_000_000;

/// A cursor over the text of a date.
struct DateText<'a> {
    b: &'a [u8],
    i: usize,
}

impl DateText<'_> {
    fn eat(&mut self, c: u8) -> bool {
        let hit = self
            .b
            .get(self.i)
            .is_some_and(|x| x.eq_ignore_ascii_case(&c));
        if hit {
            self.i = self.i.saturating_add(1);
        }
        hit
    }

    fn digit(&mut self) -> Option<i64> {
        let d = self.b.get(self.i).filter(|d| d.is_ascii_digit())?;
        self.i = self.i.saturating_add(1);
        Some(i64::from(d.saturating_sub(b'0')))
    }

    fn number(&mut self, width: usize) -> Option<i64> {
        (0..width).try_fold(0i64, |n, _| n.checked_mul(10)?.checked_add(self.digit()?))
    }
}

/// `Date.parse(s)` for the date-time format of ECMAScript (what transcripts, state files and `toISOString` write):
/// `YYYY`, `YYYY-MM`, `YYYY-MM-DD`, or `±YYYYYY` years, then optionally `THH:mm`, `:ss`, `.s…` (digits past the
/// third ignored) and `Z` or `±HH:mm` / `±HHmm`; `T` and `Z` in either case. `None` where JavaScript gives NaN.
/// Differences: a date-time with no `Z` or offset is read as UTC (JavaScript reads it as local time), and the other
/// forms V8 also accepts (`"Nov 25 2026"`, a space for `T`) give `None`.
#[must_use]
pub fn date_parse(s: &str) -> Option<i64> {
    let mut p = DateText {
        b: s.as_bytes(),
        i: 0,
    };
    let year = if p.eat(b'+') {
        p.number(6)?
    } else if p.eat(b'-') {
        let y = p.number(6)?;
        if y == 0 {
            return None;
        }
        y.checked_neg()?
    } else {
        p.number(4)?
    };
    let (mut month, mut day) = (1i64, 1i64);
    if p.eat(b'-') {
        month = p.number(2)?;
        if p.eat(b'-') {
            day = p.number(2)?;
        }
    }
    let (mut hour, mut minute, mut second, mut milli, mut offset) = (0i64, 0i64, 0i64, 0i64, 0i64);
    if p.eat(b'T') {
        hour = p.number(2)?;
        if !p.eat(b':') {
            return None;
        }
        minute = p.number(2)?;
        if p.eat(b':') {
            second = p.number(2)?;
            if p.eat(b'.') {
                let mut places = 0u32;
                while let Some(d) = p.digit() {
                    if places < 3 {
                        milli = milli.checked_mul(10)?.checked_add(d)?;
                        places = places.saturating_add(1);
                    }
                }
                if places == 0 {
                    return None;
                }
                milli = milli.checked_mul(10i64.checked_pow(3u32.saturating_sub(places))?)?;
            }
        }
        if !p.eat(b'Z') {
            let sign = if p.eat(b'+') {
                Some(-1)
            } else if p.eat(b'-') {
                Some(1)
            } else {
                None
            };
            if let Some(sign) = sign {
                let oh = p.number(2)?;
                p.eat(b':');
                let om = p.number(2)?;
                if oh > 23 || om > 59 {
                    return None;
                }
                offset = oh
                    .checked_mul(60)?
                    .checked_add(om)?
                    .checked_mul(60_000)?
                    .checked_mul(sign)?;
            }
        }
    }
    let valid = p.i == p.b.len()
        && (1..=12).contains(&month)
        && (1..=31).contains(&day)
        && (0..=24).contains(&hour)
        && (0..=59).contains(&minute)
        && (0..=59).contains(&second)
        && (hour < 24 || (minute == 0 && second == 0 && milli == 0));
    if !valid {
        return None;
    }
    let ms = days_from_civil(year, month, day)?
        .checked_mul(86_400_000)?
        .checked_add(hour.checked_mul(3_600_000)?)?
        .checked_add(minute.checked_mul(60_000)?)?
        .checked_add(second.checked_mul(1000)?)?
        .checked_add(milli)?
        .checked_add(offset)?;
    (ms.checked_abs()? <= MAX_TIME).then_some(ms)
}

/// `new Date(ms).toISOString()`: `YYYY-MM-DDTHH:mm:ss.sssZ`, years outside 0..=9999 as `±YYYYYY`. `None` where
/// JavaScript throws (beyond ±8.64e15 ms).
#[must_use]
pub fn iso_string(ms: i64) -> Option<String> {
    if ms.checked_abs()? > MAX_TIME {
        return None;
    }
    let days = ms.checked_div_euclid(86_400_000)?;
    let rem = ms.checked_rem_euclid(86_400_000)?;
    let (year, month, day) = civil_from_days(days)?;
    let year = if (0..=9999).contains(&year) {
        format!("{year:04}")
    } else {
        format!(
            "{}{:06}",
            if year < 0 { "-" } else { "+" },
            year.unsigned_abs()
        )
    };
    Some(format!(
        "{year}-{month:02}-{day:02}T{:02}:{:02}:{:02}.{:03}Z",
        rem.checked_div(3_600_000)?,
        rem.checked_rem(3_600_000)?.checked_div(60_000)?,
        rem.checked_rem(60_000)?.checked_div(1000)?,
        rem.checked_rem(1000)?
    ))
}

/// The order of JavaScript's default `sort()` of strings: by UTF-16 units (Rust's `str` order is by code points and
/// differs for characters above U+FFFF against U+E000..U+FFFF).
#[must_use]
pub fn cmp_utf16(a: &str, b: &str) -> Ordering {
    a.encode_utf16().cmp(b.encode_utf16())
}

/// A cursor over JSON text that finds where values are without building them.
struct Scan<'a> {
    text: &'a str,
    i: usize,
}

impl Scan<'_> {
    fn peek(&self) -> Option<u8> {
        self.text.as_bytes().get(self.i).copied()
    }

    fn bump(&mut self) {
        self.i = self.i.saturating_add(1);
    }

    fn ws(&mut self) {
        while self
            .peek()
            .is_some_and(|c| matches!(c, b' ' | b'\t' | b'\r' | b'\n'))
        {
            self.bump();
        }
    }

    fn expect(&mut self, c: u8) -> Option<()> {
        self.ws();
        (self.peek() == Some(c)).then(|| self.bump())
    }

    /// A string: its span with the quotes.
    fn string(&mut self) -> Option<(usize, usize)> {
        self.ws();
        let start = self.i;
        self.expect(b'"')?;
        loop {
            match self.peek()? {
                b'\\' => {
                    self.bump();
                    self.bump();
                }
                b'"' => {
                    self.bump();
                    return Some((start, self.i));
                }
                _ => self.bump(),
            }
        }
    }

    /// Skips one value and gives its span.
    fn value(&mut self, depth: usize) -> Option<(usize, usize)> {
        if depth > 512 {
            return None;
        }
        self.ws();
        let start = self.i;
        match self.peek()? {
            b'{' => {
                self.object(depth)?;
            }
            b'[' => {
                self.bump();
                self.ws();
                if self.peek() == Some(b']') {
                    self.bump();
                } else {
                    loop {
                        self.value(depth.saturating_add(1))?;
                        self.ws();
                        match self.peek()? {
                            b',' => self.bump(),
                            b']' => {
                                self.bump();
                                break;
                            }
                            _ => return None,
                        }
                    }
                }
            }
            b'"' => {
                self.string()?;
            }
            _ => {
                while self.peek().is_some_and(|c| {
                    !matches!(c, b',' | b']' | b'}' | b' ' | b'\t' | b'\r' | b'\n')
                }) {
                    self.bump();
                }
                if self.i == start {
                    return None;
                }
            }
        }
        Some((start, self.i))
    }

    /// An object: its keys, decoded, each with the span of its value, in the order of the text.
    fn object(&mut self, depth: usize) -> Option<Vec<(String, (usize, usize))>> {
        self.expect(b'{')?;
        let mut out = Vec::new();
        self.ws();
        if self.peek() == Some(b'}') {
            self.bump();
            return Some(out);
        }
        loop {
            self.ws();
            let (a, b) = self.string()?;
            let key = crate::input::parse_text(self.text.get(a..b)?)?
                .as_str()?
                .to_owned();
            self.expect(b':')?;
            let span = self.value(depth.saturating_add(1))?;
            out.push((key, span));
            self.ws();
            match self.peek()? {
                b',' => self.bump(),
                b'}' => {
                    self.bump();
                    return Some(out);
                }
                _ => return None,
            }
        }
    }
}

/// True for a key JavaScript treats as an array index (`"0"`, `"17"`, below 2^32 - 1, no leading zero).
fn is_index(key: &str) -> bool {
    (key == "0"
        || (!key.starts_with('0') && !key.is_empty() && key.bytes().all(|b| b.is_ascii_digit())))
        && key.parse::<u64>().is_ok_and(|n| n < 4_294_967_295)
}

/// `Object.keys` of the object reached from the top of the JSON text `json` through the keys `path` (for a key
/// given twice, its last value, as `JSON.parse` keeps it): each key once, in the order of the text, array-index keys
/// first in rising order, as JavaScript orders them. `None` when the text is not JSON or the path does not lead to
/// an object. Use it where the JavaScript prints or walks keys in order; `serde_json::Map` sorts them.
#[must_use]
pub fn object_keys(json: &str, path: &[&str]) -> Option<Vec<String>> {
    let mut at = 0usize;
    for seg in path {
        let entries = Scan { text: json, i: at }.object(0)?;
        at = entries.into_iter().rev().find(|(k, _)| k == seg)?.1.0;
    }
    let entries = Scan { text: json, i: at }.object(0)?;
    let mut seen = std::collections::HashSet::new();
    let keys: Vec<String> = entries
        .into_iter()
        .map(|(k, _)| k)
        .filter(|k| seen.insert(k.clone()))
        .collect();
    let (mut index, names): (Vec<String>, Vec<String>) =
        keys.into_iter().partition(|k| is_index(k));
    index.sort_by_key(|k| k.parse::<u64>().unwrap_or(0));
    index.extend(names);
    Some(index)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn trim_removes_javascript_space_only() {
        assert_eq!(trim("\u{feff} a \u{85}"), "a \u{85}");
    }

    #[test]
    fn numbers_print_as_string_of_a_number() {
        let cases = [
            (1e21, "1e+21"),
            (1.5e-7, "1.5e-7"),
            (123e-20, "1.23e-18"),
            (0.000_001, "0.000001"),
            (9_007_199_254_740_994.0, "9007199254740994"),
            (-0.0, "0"),
            (0.1, "0.1"),
            (-2.5, "-2.5"),
            (100.0, "100"),
            (123_456.789, "123456.789"),
        ];
        for (x, want) in cases {
            assert_eq!(number_to_string(x), want);
        }
    }

    #[test]
    fn to_fixed_rounds_exact_halves_up() {
        let cases = [
            (0.25, 1, "0.3"),
            (1.005, 2, "1.00"),
            (-0.04, 1, "-0.0"),
            (1e21, 2, "1e+21"),
            (123.456, 0, "123"),
            (9.96, 1, "10.0"),
            (0.5, 0, "1"),
        ];
        for (x, d, want) in cases {
            assert_eq!(to_fixed(x, d), want);
        }
    }

    #[test]
    fn math_round_rounds_halves_up() {
        let got = [
            round(-2.5),
            round(2.5),
            round(0.499_999_999_999_999_94),
            round(-0.6),
        ];
        assert!(
            got.iter()
                .zip([-2.0, 3.0, 0.0, -1.0])
                .all(|(a, b)| (a - b).abs() < 1e-9)
        );
    }

    #[test]
    fn date_parse_matches_node() {
        // Each figure from Node 24's Date.parse on this PC (2026-11-25).
        let cases: [(&str, Option<i64>); 18] = [
            ("2026-02-30", Some(1_772_409_600_000)),
            ("2026-11-25T10:00:00.1234Z", Some(1_795_600_800_123)),
            ("2026-11-25T24:00:00Z", Some(1_795_651_200_000)),
            ("2026-11-25T24:00:01Z", None),
            ("2026-11-25t10:00:00z", Some(1_795_600_800_000)),
            ("2026-11-25T10:00Z", Some(1_795_600_800_000)),
            ("2026-11-25T10Z", None),
            ("+002026-11-25T00:00:00Z", Some(1_795_564_800_000)),
            ("2026", Some(1_767_225_600_000)),
            ("2026-11", Some(1_793_491_200_000)),
            ("2026-11-25T10:00:00+05:30", Some(1_795_581_000_000)),
            ("2026-11-25T10:00:00.5+0530", Some(1_795_581_000_500)),
            ("2026-13-01", None),
            ("2026-11-25T10:60:00Z", None),
            ("-000001-01-01T00:00:00Z", Some(-62_198_755_200_000)),
            ("2026-11-25T10:00:00.Z", None),
            ("2026-04-31T00:00:00Z", Some(1_777_593_600_000)),
            (" 2026-11-25T10:00:00Z", None),
        ];
        for (s, want) in cases {
            assert_eq!(date_parse(s), want, "{s}");
        }
    }

    #[test]
    fn iso_string_matches_node() {
        assert_eq!(
            iso_string(-62_198_755_200_000).as_deref(),
            Some("-000001-01-01T00:00:00.000Z")
        );
        assert_eq!(
            iso_string(253_402_300_800_000).as_deref(),
            Some("+010000-01-01T00:00:00.000Z")
        );
        assert_eq!(
            iso_string(1_795_600_800_123).as_deref(),
            Some("2026-11-25T10:00:00.123Z")
        );
    }

    #[test]
    fn date_parse_reads_back_iso_string() {
        let t = 1_795_600_800_123;
        assert_eq!(iso_string(t).as_deref().and_then(date_parse), Some(t));
    }

    #[test]
    fn to_string_follows_string_of_a_value() {
        let v = json!([1, null, [2.5, "a"], {"k": 1}, true]);
        assert_eq!(to_string(&v), "1,,2.5,a,[object Object],true");
        assert_eq!(display(None), "undefined");
    }

    #[test]
    fn object_keys_keep_the_order_of_the_text() {
        let text =
            r#"{"kinds": {"b": 1, "a": {"x": [1, "}"]}, "10": 0, "2": 0, "b": 3}, "kinds2": 1}"#;
        let got = object_keys(text, &["kinds"]);
        let want: Vec<String> = ["2", "10", "b", "a"]
            .iter()
            .map(|s| (*s).to_owned())
            .collect();
        assert_eq!(got, Some(want));
    }

    #[test]
    fn object_keys_follow_the_last_of_a_repeated_key() {
        let got = object_keys(r#"{"k": {"a": 1}, "k": {"z": 1}}"#, &["k"]);
        assert_eq!(got, Some(vec!["z".to_owned()]));
    }

    #[test]
    fn sort_order_is_by_utf16_units() {
        assert_eq!(cmp_utf16("\u{1f600}", "\u{ff61}"), Ordering::Less);
    }

    #[test]
    fn a_cut_pair_is_quoted_as_javascript_writes_it() {
        assert_eq!(quote_utf16(&[0x61, 0xd83d]), "\"a\\ud83d\"");
        assert_eq!(quote("\u{1}\u{7f}"), "\"\\u0001\u{7f}\"");
    }
}
