//! The hook's regular expressions, written so that they match what the JavaScript ones match: `\d` as `[0-9]`,
//! `\b` as the ASCII word boundary, `\s` as JavaScript's white space, and the `i` flag folding ASCII letters only
//! (a JavaScript pattern without the `u` flag folds no non-ASCII letter onto an ASCII one).

use kit_core::regex::{self, Regex};

/// JavaScript's `\s` (white space and line terminators), as a class.
const S: &str = r"[\t\n\x0B\x0C\r \x{A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}]";
/// JavaScript's `\b` without the `u` flag.
const B: &str = r"(?-u:\b)";

/// The compiled patterns.
#[derive(Debug)]
pub struct Patterns {
    /// `LIMIT_RE`: `limit` then a number and a unit.
    pub limit: Regex,
    /// `EXPECTED_RE`: `expected` then a number and a unit.
    pub expected: Regex,
    /// `ID_RE`: a record id such as `r57-0165`.
    pub id: Regex,
    /// A path ending in `.md`, in a prompt.
    pub md_path: Regex,
    /// A path with a folder named `briefs`.
    pub briefs: Regex,
    /// A path starting with a drive letter.
    pub drive: Regex,
    /// The marks a state-file line may start with.
    pub lead: Regex,
    /// A line starting with `cap`.
    pub cap_line: Regex,
    /// `<n> M tokens` on a cap line.
    pub cap_num: Regex,
    /// `Meter line ... <n> %`.
    pub meter: Regex,
    /// `Fable meter line ... <n> %`.
    pub fable: Regex,
    /// `session <8 hex digits>`, every one in a state file.
    pub sessions: Regex,
    /// The start of a journal line: its id and status.
    pub journal: Regex,
}

/// A number and a unit (K, M or B in either case).
fn num() -> String {
    format!(r"([0-9]+(?:\.[0-9]+)?){S}*([KMBkmb]){B}")
}

impl Patterns {
    /// Compiles every pattern.
    ///
    /// # Errors
    /// A pattern the `regex` crate refuses (a fault in this file; a unit test compiles them).
    pub fn new() -> Result<Self, regex::Error> {
        let num = num();
        let metre = |lead: &str| {
            format!(
                r"^(?i-u:{lead}meter )(?:(?i-u:stop ))?(?i-u:line){B}[^\n%]*?([0-9]+(?:\.[0-9]+)?){S}*%"
            )
        };
        Ok(Self {
            limit: Regex::new(&format!(
                r"{B}(?i-u:limit)(?:{S}+(?i-u:is|of|at))?{S}*[:=]?{S}*(?:(?i-u:about){S}+)?{num}"
            ))?,
            expected: Regex::new(&format!(
                r"{B}(?i-u:expected)(?:{S}+(?i-u:is|of))?{S}*[:=]?{S}*(?:(?i-u:about){S}+|(?i-u:around){S}+|~{S}*)?{num}"
            ))?,
            id: Regex::new(&format!(r"{B}([a-z][a-z0-9]*-[0-9]{{4}}){B}"))?,
            md_path: Regex::new(&format!(r"[A-Za-z0-9_.:/\\\-]+\.md{B}"))?,
            briefs: Regex::new(r"(?:^|[\\/])briefs[\\/]")?,
            drive: Regex::new(r"^[A-Za-z]:")?,
            lead: Regex::new(&format!(r"^(?:{S}|[>*_\-])+"))?,
            cap_line: Regex::new(&format!(r"^(?i-u:cap){B}"))?,
            cap_num: Regex::new(&format!(
                r"([0-9]+(?:\.[0-9]+)?){S}*([KMBkmb]){S}+(?i-u:tokens){B}"
            ))?,
            meter: Regex::new(&metre(""))?,
            fable: Regex::new(&metre("fable "))?,
            sessions: Regex::new(&format!(r"{B}(?i-u:session){S}+([0-9a-fA-F]{{8}}){B}"))?,
            journal: Regex::new(r#"^\{"id":"([^"]+)","kind":"[^"]*"(?:,"status":"([^"]*)")?"#)?,
        })
    }

    /// The pattern `\bsession\s+<sess8>\b` with the `i` flag. The JavaScript puts the session's first eight
    /// characters into the pattern as they are; this takes them as text (`regex::escape`), which differs only for a
    /// session id holding a character special in a pattern (session ids are UUIDs).
    ///
    /// # Errors
    /// A pattern the `regex` crate refuses.
    pub fn session(sess8: &str) -> Result<Regex, regex::Error> {
        Regex::new(&format!(
            r"{B}(?i-u:session){S}+(?i:{}){B}",
            regex::escape(sess8)
        ))
    }
}

/// The value of a unit: K, M or B in either case.
#[must_use]
pub fn unit(u: &str) -> f64 {
    match u {
        "K" | "k" => 1e3,
        "M" | "m" => 1e6,
        "B" | "b" => 1e9,
        _ => f64::NAN,
    }
}

/// `+text` for the digits a pattern matched.
#[must_use]
pub fn number(text: &str) -> f64 {
    text.parse::<f64>().unwrap_or(f64::NAN)
}

/// The lines of `text` as `text.split(/\r?\n/)` gives them.
#[must_use]
pub fn split_lines(text: &str) -> Vec<&str> {
    let pieces: Vec<&str> = text.split('\n').collect();
    let last = pieces.len().saturating_sub(1);
    pieces
        .into_iter()
        .enumerate()
        .map(|(i, p)| {
            if i < last {
                p.strip_suffix('\r').unwrap_or(p)
            } else {
                p
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pats() -> Option<Patterns> {
        Patterns::new().ok()
    }

    #[test]
    fn every_pattern_compiles() {
        assert!(Patterns::new().is_ok());
        assert!(Patterns::session("abcd1234").is_ok());
    }

    #[test]
    fn the_limit_line_of_the_method_is_read() {
        let p = pats();
        let line = "Your token limit is 12 M (expected about 8 M, basis r57-0165).";
        let m = p.as_ref().and_then(|p| p.limit.captures(line));
        let got = m.map(|m| {
            (
                m.get(1).map(|x| x.as_str().to_owned()),
                m.get(2).map(|x| x.as_str().to_owned()),
            )
        });
        assert_eq!(got, Some((Some("12".to_owned()), Some("M".to_owned()))));
    }

    #[test]
    fn the_kelvin_sign_is_not_a_k() {
        let p = pats();
        assert!(!p.is_some_and(
            |p| p.limit.is_match("limit 3 \u{212A}") || p.limit.is_match("limit 3 Kx")
        ));
    }

    #[test]
    fn a_meter_line_takes_the_first_number_before_a_percent() {
        let p = pats();
        let m = p
            .as_ref()
            .and_then(|p| p.meter.captures("meter line 12 and 86 % (r57-0037)"));
        assert_eq!(m.and_then(|m| m.get(1)).map(|x| x.as_str()), Some("86"));
    }

    #[test]
    fn split_lines_keeps_a_last_carriage_return() {
        assert_eq!(split_lines("a\r\nb\r"), vec!["a", "b\r"]);
    }
}
