//! JSON read as `JSON.parse` reads it and written as `JSON.stringify(v, null, 1)` writes it, keeping what
//! `serde_json` would change: the order of an object's keys (the text's order, array-index keys first in rising
//! order, a repeated key in its first place with its last value), lone surrogates in strings, and numbers beyond the
//! double range (`1e400` is Infinity, written `null`). Used for `.harness/basis.json`, which `--basis` rewrites whole.

use kit_core::js;

/// How deep arrays and objects may nest. Deeper text is taken as not JSON (V8 reads deeper; a basis file never is).
const MAX_DEPTH: usize = 1000;

/// A JSON value. Strings and keys are UTF-16 units, as JavaScript holds them.
#[derive(Debug, Clone, PartialEq)]
pub enum J {
    /// `null`.
    Null,
    /// `true` or `false`.
    Bool(bool),
    /// A number.
    Num(f64),
    /// A string.
    Str(Vec<u16>),
    /// An array.
    Arr(Vec<J>),
    /// An object: its keys in JavaScript's order once [`J::ordered`] is applied; as parsed, in the text's order.
    Obj(Vec<(Vec<u16>, J)>),
}

impl J {
    /// A string value from Rust text.
    #[must_use]
    pub fn text(s: &str) -> Self {
        Self::Str(js::utf16(s))
    }

    /// JavaScript's truthiness.
    #[must_use]
    pub fn truthy(&self) -> bool {
        match self {
            Self::Null => false,
            Self::Bool(b) => *b,
            Self::Num(x) => !x.is_nan() && x.classify() != std::num::FpCategory::Zero,
            Self::Str(s) => !s.is_empty(),
            Self::Arr(_) | Self::Obj(_) => true,
        }
    }

    /// `v.key` for an object (`None` for a missing key and for any other value).
    #[must_use]
    pub fn get(&self, key: &str) -> Option<&Self> {
        let want = js::utf16(key);
        match self {
            Self::Obj(entries) => entries.iter().find(|(k, _)| *k == want).map(|(_, v)| v),
            _ => None,
        }
    }

    /// `String(v)`.
    #[must_use]
    pub fn to_js_string(&self) -> String {
        match self {
            Self::Null => "null".to_owned(),
            Self::Bool(b) => b.to_string(),
            Self::Num(x) => js::number_to_string(*x),
            Self::Str(s) => String::from_utf16_lossy(s),
            Self::Arr(items) => {
                let parts: Vec<String> = items
                    .iter()
                    .map(|i| {
                        if matches!(i, Self::Null) {
                            String::new()
                        } else {
                            i.to_js_string()
                        }
                    })
                    .collect();
                parts.join(",")
            }
            Self::Obj(_) => "[object Object]".to_owned(),
        }
    }
}

/// True for a key JavaScript treats as an array index (`"0"`, `"17"`, below 2^32 - 1, no leading zero).
fn index_of(key: &[u16]) -> Option<u64> {
    let text = String::from_utf16(key).ok()?;
    let digits = !text.is_empty() && text.bytes().all(|b| b.is_ascii_digit());
    if !digits || (text.len() > 1 && text.starts_with('0')) {
        return None;
    }
    text.parse::<u64>().ok().filter(|n| *n < 4_294_967_295)
}

/// A cursor over JSON text.
struct Parser<'a> {
    chars: std::iter::Peekable<std::str::Chars<'a>>,
}

impl Parser<'_> {
    fn ws(&mut self) {
        while self
            .chars
            .peek()
            .is_some_and(|c| matches!(c, ' ' | '\t' | '\n' | '\r'))
        {
            self.chars.next();
        }
    }

    fn eat(&mut self, c: char) -> Option<()> {
        (self.chars.next()? == c).then_some(())
    }

    fn word(&mut self, w: &str) -> Option<()> {
        for c in w.chars() {
            self.eat(c)?;
        }
        Some(())
    }

    fn value(&mut self, depth: usize) -> Option<J> {
        if depth > MAX_DEPTH {
            return None;
        }
        self.ws();
        let v = match *self.chars.peek()? {
            '{' => self.object(depth)?,
            '[' => self.array(depth)?,
            '"' => J::Str(self.string()?),
            't' => {
                self.word("true")?;
                J::Bool(true)
            }
            'f' => {
                self.word("false")?;
                J::Bool(false)
            }
            'n' => {
                self.word("null")?;
                J::Null
            }
            _ => J::Num(self.number()?),
        };
        self.ws();
        Some(v)
    }

    fn digits(&mut self, out: &mut String) -> usize {
        let mut n = 0usize;
        while let Some(c) = self.chars.peek().copied().filter(char::is_ascii_digit) {
            out.push(c);
            self.chars.next();
            n = n.saturating_add(1);
        }
        n
    }

    fn number(&mut self) -> Option<f64> {
        let mut lexeme = String::new();
        if self.chars.peek() == Some(&'-') {
            lexeme.push('-');
            self.chars.next();
        }
        if self.chars.peek() == Some(&'0') {
            lexeme.push('0');
            self.chars.next();
        } else if self.digits(&mut lexeme) == 0 {
            return None;
        }
        if self.chars.peek() == Some(&'.') {
            lexeme.push('.');
            self.chars.next();
            if self.digits(&mut lexeme) == 0 {
                return None;
            }
        }
        if let Some(e) = self
            .chars
            .peek()
            .copied()
            .filter(|c| matches!(c, 'e' | 'E'))
        {
            lexeme.push(e);
            self.chars.next();
            if let Some(s) = self
                .chars
                .peek()
                .copied()
                .filter(|c| matches!(c, '+' | '-'))
            {
                lexeme.push(s);
                self.chars.next();
            }
            if self.digits(&mut lexeme) == 0 {
                return None;
            }
        }
        lexeme.parse::<f64>().ok()
    }

    fn hex4(&mut self) -> Option<u16> {
        let mut v: u16 = 0;
        for _ in 0..4 {
            let d = self.chars.next()?.to_digit(16)?;
            v = v.checked_mul(16)?.checked_add(u16::try_from(d).ok()?)?;
        }
        Some(v)
    }

    fn string(&mut self) -> Option<Vec<u16>> {
        self.eat('"')?;
        let mut out: Vec<u16> = Vec::new();
        loop {
            match self.chars.next()? {
                '"' => return Some(out),
                '\\' => {
                    let unit = match self.chars.next()? {
                        '"' => 0x22,
                        '\\' => 0x5C,
                        '/' => 0x2F,
                        'b' => 0x08,
                        'f' => 0x0C,
                        'n' => 0x0A,
                        'r' => 0x0D,
                        't' => 0x09,
                        'u' => self.hex4()?,
                        _ => return None,
                    };
                    out.push(unit);
                }
                c if u32::from(c) < 0x20 => return None,
                c => {
                    let mut buf = [0u16; 2];
                    out.extend_from_slice(c.encode_utf16(&mut buf));
                }
            }
        }
    }

    fn array(&mut self, depth: usize) -> Option<J> {
        self.eat('[')?;
        let mut items = Vec::new();
        self.ws();
        if self.chars.peek() == Some(&']') {
            self.chars.next();
            return Some(J::Arr(items));
        }
        loop {
            items.push(self.value(depth.saturating_add(1))?);
            match self.chars.next()? {
                ',' => {}
                ']' => return Some(J::Arr(items)),
                _ => return None,
            }
        }
    }

    fn object(&mut self, depth: usize) -> Option<J> {
        self.eat('{')?;
        let mut entries: Vec<(Vec<u16>, J)> = Vec::new();
        self.ws();
        if self.chars.peek() == Some(&'}') {
            self.chars.next();
            return Some(J::Obj(entries));
        }
        loop {
            self.ws();
            let k = self.string()?;
            self.ws();
            self.eat(':')?;
            let v = self.value(depth.saturating_add(1))?;
            match entries.iter_mut().find(|(have, _)| *have == k) {
                Some(slot) => slot.1 = v,
                None => entries.push((k, v)),
            }
            match self.chars.next()? {
                ',' => {}
                '}' => return Some(J::Obj(ordered(entries))),
                _ => return None,
            }
        }
    }
}

/// An object's keys in JavaScript's order: array-index keys first in rising order, then the rest as they came.
fn ordered(entries: Vec<(Vec<u16>, J)>) -> Vec<(Vec<u16>, J)> {
    let (mut index, names): (Vec<_>, Vec<_>) = entries
        .into_iter()
        .partition(|(k, _)| index_of(k).is_some());
    index.sort_by_key(|(k, _)| index_of(k));
    index.extend(names);
    index
}

/// `JSON.parse(text)`: `None` where it throws.
#[must_use]
pub fn parse(text: &str) -> Option<J> {
    let mut p = Parser {
        chars: text.chars().peekable(),
    };
    let v = p.value(0)?;
    p.chars.next().is_none().then_some(v)
}

/// `JSON.stringify(v, null, 1)`.
#[must_use]
pub fn stringify(v: &J) -> String {
    let mut out = String::new();
    write(v, 0, &mut out);
    out
}

fn write(v: &J, indent: usize, out: &mut String) {
    match v {
        J::Null => out.push_str("null"),
        J::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
        J::Num(x) if x.is_finite() => out.push_str(&js::number_to_string(*x)),
        J::Num(_) => out.push_str("null"),
        J::Str(s) => out.push_str(&js::quote_utf16(s)),
        J::Arr(items) if items.is_empty() => out.push_str("[]"),
        J::Obj(entries) if entries.is_empty() => out.push_str("{}"),
        J::Arr(items) => {
            let inner = indent.saturating_add(1);
            out.push_str("[\n");
            for (i, item) in items.iter().enumerate() {
                if i > 0 {
                    out.push_str(",\n");
                }
                out.push_str(&" ".repeat(inner));
                write(item, inner, out);
            }
            out.push('\n');
            out.push_str(&" ".repeat(indent));
            out.push(']');
        }
        J::Obj(entries) => {
            let inner = indent.saturating_add(1);
            out.push_str("{\n");
            for (i, (k, item)) in entries.iter().enumerate() {
                if i > 0 {
                    out.push_str(",\n");
                }
                out.push_str(&" ".repeat(inner));
                out.push_str(&js::quote_utf16(k));
                out.push_str(": ");
                write(item, inner, out);
            }
            out.push('\n');
            out.push_str(&" ".repeat(indent));
            out.push('}');
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keys_keep_javascript_order_and_values_their_text() {
        let text =
            r#"[{"b":1,"2":"x","a":{"z":[]},"1":null,"b":2.50,"s":"\ud800\u00e9"}, 1e400, -0]"#;
        let v = parse(text);
        assert_eq!(
            v.as_ref().map(stringify).as_deref(),
            Some(
                "[\n {\n  \"1\": null,\n  \"2\": \"x\",\n  \"b\": 2.5,\n  \"a\": {\n   \"z\": []\n  },\n  \"s\": \"\\ud800\u{e9}\"\n },\n null,\n 0\n]"
            )
        );
    }

    #[test]
    fn text_that_json_parse_refuses_is_none() {
        for bad in [
            "",
            "[1,]",
            "{'a':1}",
            "01",
            "1.",
            "[1] x",
            "\"a\nb\"",
            "\u{feff}[]",
        ] {
            assert!(parse(bad).is_none(), "{bad:?}");
        }
        assert!(parse(" [ ] ").is_some());
    }

    #[test]
    fn string_of_a_value_is_javascripts() {
        let v = parse(r#"[["own-0001"], {"a": 1}, [null, 2], true]"#);
        let texts: Vec<String> = match v {
            Some(J::Arr(items)) => items.iter().map(J::to_js_string).collect(),
            _ => Vec::new(),
        };
        assert_eq!(texts, ["own-0001", "[object Object]", ",2", "true"]);
    }
}
