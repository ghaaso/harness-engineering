//! A settings file read as `JSON.parse` reads it and written as `JSON.stringify(v, null, 2)` writes it. Unlike
//! `serde_json`'s map (which sorts), an object keeps its keys in the order of the text, so her file keeps its order;
//! a repeated key keeps its first place and its last value; array-index keys are written first, rising, as
//! JavaScript orders them. A lone surrogate escape becomes U+FFFD.

use kit_core::js;
use std::iter::Peekable;
use std::str::CharIndices;

/// How deep arrays and objects may nest; deeper text is taken as not JSON.
const MAX_DEPTH: usize = 512;

/// A JSON value with ordered objects.
#[derive(Debug, Clone, PartialEq)]
pub enum J {
    /// `null`.
    Null,
    /// `true` or `false`.
    Bool(bool),
    /// A number.
    Num(f64),
    /// A string.
    Str(String),
    /// An array.
    Arr(Vec<J>),
    /// An object, its keys in the text's order.
    Obj(Vec<(String, J)>),
}

impl J {
    /// An empty object.
    #[must_use]
    pub const fn obj() -> Self {
        Self::Obj(Vec::new())
    }

    /// A string value.
    #[must_use]
    pub fn str(s: &str) -> Self {
        Self::Str(s.to_owned())
    }

    /// `v[key]` of an object; `None` for a missing key and for any other value.
    #[must_use]
    pub fn get(&self, key: &str) -> Option<&Self> {
        match self {
            Self::Obj(e) => e.iter().find(|(k, _)| k == key).map(|(_, v)| v),
            _ => None,
        }
    }

    /// `v[key]` of an object, to change.
    pub fn get_mut(&mut self, key: &str) -> Option<&mut Self> {
        match self {
            Self::Obj(e) => e.iter_mut().find(|(k, _)| k == key).map(|(_, v)| v),
            _ => None,
        }
    }

    /// `v[key] = value` on an object: a key it has keeps its place, a new one goes last. Nothing on other values.
    pub fn set(&mut self, key: &str, value: Self) {
        if let Self::Obj(e) = self {
            match e.iter_mut().find(|(k, _)| k == key) {
                Some(slot) => slot.1 = value,
                None => e.push((key.to_owned(), value)),
            }
        }
    }

    /// `delete v[key]` on an object.
    pub fn remove(&mut self, key: &str) {
        if let Self::Obj(e) = self {
            e.retain(|(k, _)| k != key);
        }
    }

    /// True for an object that holds `key`.
    #[must_use]
    pub fn has(&self, key: &str) -> bool {
        self.get(key).is_some()
    }

    /// The text of a string value.
    #[must_use]
    pub fn as_str(&self) -> Option<&str> {
        match self {
            Self::Str(s) => Some(s),
            _ => None,
        }
    }

    /// The items of an array.
    #[must_use]
    pub fn as_arr(&self) -> Option<&[Self]> {
        match self {
            Self::Arr(a) => Some(a),
            _ => None,
        }
    }

    /// True for an object.
    #[must_use]
    pub const fn is_obj(&self) -> bool {
        matches!(self, Self::Obj(_))
    }

    /// True for an object with no keys (`!Object.keys(v).length`).
    #[must_use]
    pub fn is_empty_obj(&self) -> bool {
        matches!(self, Self::Obj(e) if e.is_empty())
    }

    /// `JSON.stringify(v, null, 2)`.
    #[must_use]
    pub fn pretty(&self) -> String {
        let mut out = String::new();
        write(self, Some(0), &mut out);
        out
    }

    /// `JSON.stringify(v)`.
    #[must_use]
    pub fn compact(&self) -> String {
        let mut out = String::new();
        write(self, None, &mut out);
        out
    }
}

/// An array index as JavaScript orders object keys: `0`, or digits without a leading zero below 2^32 - 1.
fn index_of(key: &str) -> Option<u64> {
    let ok = key == "0"
        || (!key.starts_with('0') && !key.is_empty() && key.bytes().all(|b| b.is_ascii_digit()));
    if !ok {
        return None;
    }
    key.parse::<u64>().ok().filter(|n| *n < 4_294_967_295)
}

fn pad(out: &mut String, level: usize) {
    for _ in 0..level {
        out.push_str("  ");
    }
}

fn write(v: &J, level: Option<usize>, out: &mut String) {
    match v {
        J::Null => out.push_str("null"),
        J::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
        J::Num(x) if x.is_finite() => out.push_str(&js::number_to_string(*x)),
        J::Num(_) => out.push_str("null"),
        J::Str(s) => out.push_str(&js::quote(s)),
        J::Arr(items) => {
            let parts: Vec<(Option<&str>, &J)> = items.iter().map(|i| (None, i)).collect();
            write_list(&parts, ('[', ']'), level, out);
        }
        J::Obj(entries) => {
            let mut indexed: Vec<(u64, &(String, J))> = entries
                .iter()
                .filter_map(|e| index_of(&e.0).map(|n| (n, e)))
                .collect();
            indexed.sort_by_key(|(n, _)| *n);
            let parts: Vec<(Option<&str>, &J)> = indexed
                .iter()
                .map(|(_, e)| *e)
                .chain(entries.iter().filter(|e| index_of(&e.0).is_none()))
                .map(|(k, v)| (Some(k.as_str()), v))
                .collect();
            write_list(&parts, ('{', '}'), level, out);
        }
    }
}

fn write_list(
    parts: &[(Option<&str>, &J)],
    (open, close): (char, char),
    level: Option<usize>,
    out: &mut String,
) {
    out.push(open);
    if parts.is_empty() {
        out.push(close);
        return;
    }
    let inner = level.map(|l| l.saturating_add(1));
    for (i, (key, value)) in parts.iter().enumerate() {
        if i > 0 {
            out.push(',');
        }
        if let Some(l) = inner {
            out.push('\n');
            pad(out, l);
        }
        if let Some(k) = key {
            out.push_str(&js::quote(k));
            out.push(':');
            if inner.is_some() {
                out.push(' ');
            }
        }
        write(value, inner, out);
    }
    if let Some(l) = level {
        out.push('\n');
        pad(out, l);
    }
    out.push(close);
}

/// `JSON.parse(text)`: the value, or why the text is not JSON (with the position in bytes).
pub fn parse(text: &str) -> Result<J, String> {
    let mut p = Parser {
        it: text.char_indices().peekable(),
    };
    p.ws();
    let v = p.value(0)?;
    p.ws();
    match p.it.peek() {
        None => Ok(v),
        Some(&(i, c)) => Err(format!("unexpected {c:?} at position {i}")),
    }
}

struct Parser<'a> {
    it: Peekable<CharIndices<'a>>,
}

impl Parser<'_> {
    fn ws(&mut self) {
        while matches!(self.it.peek(), Some((_, ' ' | '\t' | '\n' | '\r'))) {
            self.it.next();
        }
    }

    fn unexpected(&mut self) -> String {
        match self.it.peek() {
            Some(&(i, c)) => format!("unexpected {c:?} at position {i}"),
            None => "unexpected end of the text".to_owned(),
        }
    }

    fn eat(&mut self, want: char) -> Result<(), String> {
        if matches!(self.it.peek(), Some(&(_, c)) if c == want) {
            self.it.next();
            Ok(())
        } else {
            Err(self.unexpected())
        }
    }

    fn value(&mut self, depth: usize) -> Result<J, String> {
        if depth > MAX_DEPTH {
            return Err("nested too deeply".to_owned());
        }
        match self.it.peek().map(|&(_, c)| c) {
            Some('{') => self.object(depth),
            Some('[') => self.array(depth),
            Some('"') => self.string().map(J::Str),
            Some('t') => self.word("true", J::Bool(true)),
            Some('f') => self.word("false", J::Bool(false)),
            Some('n') => self.word("null", J::Null),
            Some('-' | '0'..='9') => self.number(),
            _ => Err(self.unexpected()),
        }
    }

    fn word(&mut self, w: &str, v: J) -> Result<J, String> {
        for c in w.chars() {
            self.eat(c)?;
        }
        Ok(v)
    }

    fn digits(&mut self, out: &mut String) -> usize {
        let mut n = 0usize;
        while let Some(&(_, c)) = self.it.peek() {
            if !c.is_ascii_digit() {
                break;
            }
            out.push(c);
            self.it.next();
            n = n.saturating_add(1);
        }
        n
    }

    fn number(&mut self) -> Result<J, String> {
        let mut s = String::new();
        if matches!(self.it.peek(), Some((_, '-'))) {
            s.push('-');
            self.it.next();
        }
        if matches!(self.it.peek(), Some((_, '0'))) {
            s.push('0');
            self.it.next();
        } else if self.digits(&mut s) == 0 {
            return Err(self.unexpected());
        }
        if matches!(self.it.peek(), Some((_, '.'))) {
            s.push('.');
            self.it.next();
            if self.digits(&mut s) == 0 {
                return Err(self.unexpected());
            }
        }
        if matches!(self.it.peek(), Some((_, 'e' | 'E'))) {
            s.push('e');
            self.it.next();
            if let Some(&(_, c @ ('+' | '-'))) = self.it.peek() {
                s.push(c);
                self.it.next();
            }
            if self.digits(&mut s) == 0 {
                return Err(self.unexpected());
            }
        }
        s.parse::<f64>()
            .map(J::Num)
            .map_err(|e| format!("bad number {s}: {e}"))
    }

    fn hex4(&mut self) -> Result<u16, String> {
        let mut h = String::new();
        for _ in 0..4 {
            match self.it.peek() {
                Some(&(_, c)) if c.is_ascii_hexdigit() => {
                    h.push(c);
                    self.it.next();
                }
                _ => return Err(self.unexpected()),
            }
        }
        u16::from_str_radix(&h, 16).map_err(|e| e.to_string())
    }

    fn string(&mut self) -> Result<String, String> {
        self.eat('"')?;
        let mut out = String::new();
        loop {
            let Some((i, c)) = self.it.next() else {
                return Err("unterminated string".to_owned());
            };
            match c {
                '"' => return Ok(out),
                '\\' => {
                    let Some((_, e)) = self.it.next() else {
                        return Err("unterminated string".to_owned());
                    };
                    match e {
                        '"' => out.push('"'),
                        '\\' => out.push('\\'),
                        '/' => out.push('/'),
                        'b' => out.push('\u{8}'),
                        'f' => out.push('\u{C}'),
                        'n' => out.push('\n'),
                        'r' => out.push('\r'),
                        't' => out.push('\t'),
                        'u' => {
                            let hi = self.hex4()?;
                            out.push(self.unit(hi));
                        }
                        other => return Err(format!("bad escape \\{other} at position {i}")),
                    }
                }
                c if u32::from(c) < 0x20 => {
                    return Err(format!("a control character in a string at position {i}"));
                }
                c => out.push(c),
            }
        }
    }

    /// The character of a `\u` escape; a high surrogate followed by `\u` and a low one is joined with it.
    fn unit(&mut self, hi: u16) -> char {
        if (0xD800..0xDC00).contains(&hi) {
            let mut look = self.it.clone();
            if matches!(look.next(), Some((_, '\\'))) && matches!(look.next(), Some((_, 'u'))) {
                let mut probe = Parser { it: look };
                if let Ok(lo) = probe.hex4()
                    && (0xDC00..0xE000).contains(&lo)
                {
                    self.it = probe.it;
                    return char::decode_utf16([hi, lo])
                        .next()
                        .and_then(Result::ok)
                        .unwrap_or('\u{FFFD}');
                }
            }
        }
        char::decode_utf16([hi])
            .next()
            .and_then(Result::ok)
            .unwrap_or('\u{FFFD}')
    }

    fn array(&mut self, depth: usize) -> Result<J, String> {
        self.eat('[')?;
        self.ws();
        let mut items = Vec::new();
        if matches!(self.it.peek(), Some((_, ']'))) {
            self.it.next();
            return Ok(J::Arr(items));
        }
        loop {
            self.ws();
            items.push(self.value(depth.saturating_add(1))?);
            self.ws();
            match self.it.next() {
                Some((_, ',')) => {}
                Some((_, ']')) => return Ok(J::Arr(items)),
                Some((i, c)) => return Err(format!("unexpected {c:?} at position {i}")),
                None => return Err("unexpected end of the text".to_owned()),
            }
        }
    }

    fn object(&mut self, depth: usize) -> Result<J, String> {
        self.eat('{')?;
        self.ws();
        let mut obj = J::obj();
        if matches!(self.it.peek(), Some((_, '}'))) {
            self.it.next();
            return Ok(obj);
        }
        loop {
            self.ws();
            let key = self.string()?;
            self.ws();
            self.eat(':')?;
            self.ws();
            let v = self.value(depth.saturating_add(1))?;
            obj.set(&key, v);
            self.ws();
            match self.it.next() {
                Some((_, ',')) => {}
                Some((_, '}')) => return Ok(obj),
                Some((i, c)) => return Err(format!("unexpected {c:?} at position {i}")),
                None => return Err("unexpected end of the text".to_owned()),
            }
        }
    }
}
