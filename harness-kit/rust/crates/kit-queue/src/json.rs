//! JSON text written as `JSON.stringify` writes it: object keys in the order they were given (a `serde_json::Map`
//! sorts them), numbers as JavaScript prints them, and the indented form of `JSON.stringify(v, null, n)`.

use kit_core::js;
use serde_json::Value;

/// A JSON value whose objects keep their keys in the order they were set.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum J {
    /// `null`.
    Null,
    /// `true` or `false`.
    Bool(bool),
    /// A number, already as its text.
    Num(String),
    /// A string.
    Str(String),
    /// An array.
    Arr(Vec<J>),
    /// An object, keys in order.
    Obj(Vec<(String, J)>),
}

impl J {
    /// A whole number.
    #[must_use]
    pub fn int(n: i64) -> Self {
        Self::Num(n.to_string())
    }

    /// A number as JavaScript prints it; `null` for NaN and the infinities (as `JSON.stringify` writes them).
    #[must_use]
    pub fn num(x: f64) -> Self {
        if x.is_finite() {
            Self::Num(js::number_to_string(x))
        } else {
            Self::Null
        }
    }

    /// A string.
    #[must_use]
    pub fn str(s: &str) -> Self {
        Self::Str(s.to_owned())
    }

    /// An array of strings.
    #[must_use]
    pub fn strs(list: &[String]) -> Self {
        Self::Arr(list.iter().map(|s| Self::str(s)).collect())
    }

    /// An empty object, to be filled with [`J::with`].
    #[must_use]
    pub fn obj() -> Self {
        Self::Obj(Vec::new())
    }

    /// The object with `key` set to `value` (in place when the key is there already, as `{ ...o, key }` does).
    /// On anything but an object it does nothing.
    #[must_use]
    pub fn with(mut self, key: &str, value: J) -> Self {
        if let Self::Obj(fields) = &mut self {
            match fields.iter_mut().find(|(k, _)| k == key) {
                Some(field) => field.1 = value,
                None => fields.push((key.to_owned(), value)),
            }
        }
        self
    }

    /// The same value from a parsed one (an object's keys come in `serde_json`'s order).
    #[must_use]
    pub fn from_value(v: &Value) -> Self {
        match v {
            Value::Null => Self::Null,
            Value::Bool(b) => Self::Bool(*b),
            Value::Number(n) => match (n.as_i64(), n.as_u64()) {
                (Some(i), _) => Self::int(i),
                (None, Some(u)) => Self::Num(u.to_string()),
                _ => Self::num(n.as_f64().unwrap_or(f64::NAN)),
            },
            Value::String(s) => Self::str(s),
            Value::Array(a) => Self::Arr(a.iter().map(Self::from_value).collect()),
            Value::Object(o) => Self::Obj(
                o.iter()
                    .map(|(k, x)| (k.clone(), Self::from_value(x)))
                    .collect(),
            ),
        }
    }

    /// `JSON.stringify(v)`: one line.
    #[must_use]
    pub fn compact(&self) -> String {
        let mut out = String::new();
        self.write(&mut out, 0, 0);
        out
    }

    /// `JSON.stringify(v, null, indent)`.
    #[must_use]
    pub fn pretty(&self, indent: usize) -> String {
        let mut out = String::new();
        self.write(&mut out, indent, 0);
        out
    }

    fn write(&self, out: &mut String, indent: usize, depth: usize) {
        let inner = depth.saturating_add(1);
        let pad = |out: &mut String, d: usize| {
            if indent > 0 {
                out.push('\n');
                out.push_str(&" ".repeat(indent.saturating_mul(d)));
            }
        };
        match self {
            Self::Null => out.push_str("null"),
            Self::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
            Self::Num(t) => out.push_str(t),
            Self::Str(s) => out.push_str(&js::quote(s)),
            Self::Arr(items) if items.is_empty() => out.push_str("[]"),
            Self::Obj(fields) if fields.is_empty() => out.push_str("{}"),
            Self::Arr(items) => {
                out.push('[');
                for (i, item) in items.iter().enumerate() {
                    if i > 0 {
                        out.push(',');
                    }
                    pad(out, inner);
                    item.write(out, indent, inner);
                }
                pad(out, depth);
                out.push(']');
            }
            Self::Obj(fields) => {
                out.push('{');
                for (i, (k, v)) in fields.iter().enumerate() {
                    if i > 0 {
                        out.push(',');
                    }
                    pad(out, inner);
                    out.push_str(&js::quote(k));
                    out.push_str(if indent > 0 { ": " } else { ":" });
                    v.write(out, indent, inner);
                }
                pad(out, depth);
                out.push('}');
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compact_keeps_key_order_and_prints_numbers_as_javascript() {
        let j = J::obj()
            .with("z", J::num(1.5))
            .with("a", J::Arr(vec![J::int(2), J::Null]));
        assert_eq!(j.compact(), r#"{"z":1.5,"a":[2,null]}"#);
    }

    #[test]
    fn pretty_with_one_space_matches_json_stringify() {
        let j = J::Arr(vec![
            J::obj().with("at", J::int(1)).with("e", J::Arr(vec![])),
        ]);
        assert_eq!(j.pretty(1), "[\n {\n  \"at\": 1,\n  \"e\": []\n }\n]");
    }
}
