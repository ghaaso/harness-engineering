//! `WIDTHS.md`: the widths and holds a plan declares (the hook's `declarations`).

use crate::text::{W, cut, norm};
use kit_core::js;
use std::path::Path;

/// What a declaration limits.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Kind {
    /// `width "<pattern>" <n>: <reason>`: at most `n` running helpers matching.
    Width(u32),
    /// `hold "<pattern>" while "<b>": <reason>`: no new helper matching while one matching `b` (normed) runs.
    Hold(String),
}

/// One declaration.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Decl {
    /// Width or hold.
    pub kind: Kind,
    /// The first pattern, normed.
    pub a: String,
    /// The reason, trimmed.
    pub reason: String,
    /// Its line in the file, from 1.
    pub line: usize,
    /// `width "<a>" <n>` or `hold "<a>" while "<b>"`.
    pub text: String,
}

/// The file's declarations; `Err` holds the JavaScript's error message (in UTF-16 units: it may hold a line cut
/// inside a surrogate pair). A missing file declares nothing.
pub fn declarations(path: &Path) -> Result<Vec<Decl>, Vec<u16>> {
    let bytes = match std::fs::read(path) {
        Ok(b) => b,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(e) => {
            let msg = W::new().s(&format!("cannot be read ({e})")).0;
            return Err(W::new().u(&crate::text::short(&msg)).0);
        }
    };
    parse(&String::from_utf8_lossy(&bytes))
}

/// `text.replace(/^﻿/, '').split(/\r?\n/)`.
fn split_lines(text: &str) -> Vec<&str> {
    let text = text.strip_prefix('\u{feff}').unwrap_or(text);
    let pieces: Vec<&str> = text.split('\n').collect();
    let last = pieces.len().saturating_sub(1);
    pieces
        .into_iter()
        .enumerate()
        .map(|(k, p)| {
            if k < last {
                p.strip_suffix('\r').unwrap_or(p)
            } else {
                p
            }
        })
        .collect()
}

/// `/^[ \t]*```/`.
fn is_fence(s: &str) -> bool {
    s.trim_start_matches([' ', '\t']).starts_with("```")
}

/// `/^(?:[-*][ \t]+)?(width|hold)[ \t]+"/i` on the line's first 40 units: the kind (lower case) and the byte
/// position of the quote.
fn head(s: &str) -> Option<(&'static str, usize)> {
    let b = s.as_bytes();
    let mut i = 0usize;
    if matches!(b.first(), Some(b'-' | b'*')) {
        let ws = b.get(1..).map_or(0, |r| {
            r.iter().take_while(|c| matches!(c, b' ' | b'\t')).count()
        });
        if ws > 0 {
            i = ws.saturating_add(1);
        }
    }
    let rest = b.get(i..)?;
    let kind = if rest.len() >= 5 && rest.get(..5)?.eq_ignore_ascii_case(b"width") {
        "width"
    } else if rest.len() >= 4 && rest.get(..4)?.eq_ignore_ascii_case(b"hold") {
        "hold"
    } else {
        return None;
    };
    i = i.saturating_add(kind.len());
    let ws = b.get(i..).map_or(0, |r| {
        r.iter().take_while(|c| matches!(c, b' ' | b'\t')).count()
    });
    if ws == 0 {
        return None;
    }
    i = i.saturating_add(ws);
    // Everything matched is ASCII, so bytes are UTF-16 units: the quote must be among the first 40.
    (b.get(i) == Some(&b'"') && i < 40).then_some((kind, i))
}

/// `/^[ \t]+(\d{1,3})[ \t]*:(.*)$/`: the number and the rest.
fn width_tail(t: &str) -> Option<(u32, &str)> {
    let lead = t
        .len()
        .saturating_sub(t.trim_start_matches([' ', '\t']).len());
    if lead == 0 {
        return None;
    }
    let after = t.get(lead..)?;
    let digits = after.bytes().take_while(u8::is_ascii_digit).count();
    if !(1..=3).contains(&digits) {
        return None;
    }
    let n: u32 = after.get(..digits)?.parse().ok()?;
    let rest = after.get(digits..)?.trim_start_matches([' ', '\t']);
    let rest = rest.strip_prefix(':')?;
    // `.` stops at a line terminator.
    (!rest.contains(['\n', '\r', '\u{2028}', '\u{2029}'])).then_some((n, rest))
}

/// `/^[ \t]+while[ \t]+$/i`.
fn is_while(s: &str) -> bool {
    let inner = s.trim_matches([' ', '\t']);
    s.len() > inner.len()
        && s.starts_with([' ', '\t'])
        && s.ends_with([' ', '\t'])
        && inner.eq_ignore_ascii_case("while")
}

/// The declarations of a file's text.
fn parse(text: &str) -> Result<Vec<Decl>, Vec<u16>> {
    let mut out = Vec::new();
    let mut fence = false;
    for (k, s) in split_lines(text).into_iter().enumerate() {
        if is_fence(s) {
            fence = !fence;
            continue;
        }
        if fence {
            continue;
        }
        let Some((kind, quote)) = head(s) else {
            continue;
        };
        let line = k.saturating_add(1);
        let bad = |w: &str| -> Vec<u16> {
            W::new()
                .s(&format!("line {line} is not a declaration ({w}): "))
                .u(&cut(js::trim(s), 80))
                .0
        };
        if js::len(s) > 1000 {
            return Err(bad("longer than 1000 characters"));
        }
        let body = js::trim(s.get(quote..).unwrap_or(""));
        let q: Vec<&str> = body.split('"').collect();
        let (a, b, rest, n): (&str, Option<&str>, String, Option<u32>) = if kind == "width" {
            let shape = "width \"<pattern>\" <n>: <reason>";
            let (Some(a), Some(tail)) = (q.get(1), q.get(2..)) else {
                return Err(bad(shape));
            };
            if q.len() < 3 {
                return Err(bad(shape));
            }
            let joined = tail.join("\"");
            let Some((n, rest)) = width_tail(&joined) else {
                return Err(bad(shape));
            };
            (a, None, rest.to_owned(), Some(n))
        } else {
            let shape = "hold \"<pattern>\" while \"<pattern>\": <reason>";
            let tail = q.get(4..).map(|t| t.join("\"")).unwrap_or_default();
            let lead = tail.trim_start_matches([' ', '\t']);
            let (Some(a), Some(w), Some(b)) = (q.get(1), q.get(2), q.get(3)) else {
                return Err(bad(shape));
            };
            if q.len() < 5 || !is_while(w) || !lead.starts_with(':') {
                return Err(bad(shape));
            }
            let rest = lead.strip_prefix(':').unwrap_or(lead).to_owned();
            (a, Some(*b), rest, None)
        };
        let reason = js::trim(&rest).to_owned();
        let na = norm(a);
        let nb = b.map(norm);
        if na.is_empty() || nb.as_deref().is_some_and(str::is_empty) {
            return Err(bad("an empty pattern"));
        }
        if js::len(&reason) < 12 || !reason.bytes().any(|c| c.is_ascii_digit()) {
            return Err(bad(
                "the reason names its plan line or measurement, with a number, in 12 characters or more",
            ));
        }
        let (kind, text) = match (n, nb) {
            (Some(n), _) => (Kind::Width(n), format!("width \"{na}\" {n}")),
            (None, Some(nb)) => {
                let text = format!("hold \"{na}\" while \"{nb}\"");
                (Kind::Hold(nb), text)
            }
            (None, None) => return Err(bad("an empty pattern")),
        };
        out.push(Decl {
            kind,
            a: na,
            reason,
            line,
            text,
        });
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::text::lossy;

    fn err(text: &str) -> String {
        parse(text).err().map(|e| lossy(&e)).unwrap_or_default()
    }

    #[test]
    fn a_width_and_a_hold_parse() {
        let d = parse("# x\n- width \"Build: *\" 2: plan line 4 of x\r\n* HOLD \"a*\"  While \"b\" : RUN plan 12 \"q\"\n")
            .unwrap_or_default();
        assert_eq!(
            d.iter().map(|x| x.text.as_str()).collect::<Vec<_>>(),
            vec!["width \"build: *\" 2", "hold \"a*\" while \"b\""]
        );
        assert_eq!(
            d.get(1).map(|x| x.reason.as_str()),
            Some("RUN plan 12 \"q\"")
        );
    }

    #[test]
    fn fenced_and_indented_lines_are_examples() {
        assert_eq!(
            parse("```\nwidth \"x\" 0: nine\n```\n    hold \"a\" while \"b\": x\n"),
            Ok(vec![])
        );
    }

    #[test]
    fn a_broken_line_names_itself() {
        assert_eq!(
            err("ok\nwidth \"a\" 1234: plan line 12\n"),
            "line 2 is not a declaration (width \"<pattern>\" <n>: <reason>): width \"a\" 1234: plan line 12"
        );
        assert!(err("hold \"\" while \"b\": RUN plan line 12\n").contains("(an empty pattern)"));
        assert!(err("width \"a\" 2: the plan says so\n").contains("with a number"));
    }

    #[test]
    fn the_head_is_looked_for_in_the_first_40_units_only() {
        let s = format!("width{}\"a\" 1: plan line 12", " ".repeat(40));
        assert_eq!(parse(&s), Ok(vec![]));
    }
}
