//! JavaScript's reading of JSON values where the hook relies on it: a property read that throws on `null` and
//! `undefined`, `String(v || '')`, and the identity of values as `===` and a `Map` key compare them.

use kit_core::js;
use serde_json::Value;

/// An error the JavaScript would throw; the hook's `catch` logs its message and lets the start pass.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Thrown(pub String);

/// The result of a step that can throw.
pub type Js<T> = Result<T, Thrown>;

/// `v.key`, `v` being a value or `undefined` (`None`): reading off `undefined` or `null` throws as V8 does; a
/// property of a number, string, boolean or array that the hook reads is `undefined`.
pub fn prop<'a>(v: Option<&'a Value>, key: &str) -> Js<Option<&'a Value>> {
    match v {
        None => Err(Thrown(format!(
            "Cannot read properties of undefined (reading '{key}')"
        ))),
        Some(Value::Null) => Err(Thrown(format!(
            "Cannot read properties of null (reading '{key}')"
        ))),
        Some(Value::Object(m)) => Ok(m.get(key)),
        Some(_) => Ok(None),
    }
}

/// True when `v` is defined and truthy.
#[must_use]
pub fn truthy(v: Option<&Value>) -> bool {
    v.is_some_and(js::truthy)
}

/// `String(v || '')`.
#[must_use]
pub fn text_or_empty(v: Option<&Value>) -> String {
    v.filter(|x| js::truthy(x))
        .map(js::to_string)
        .unwrap_or_default()
}

/// True when `v` is the string `s` (`v === s`).
#[must_use]
pub fn is_str(v: Option<&Value>, s: &str) -> bool {
    v.and_then(Value::as_str) == Some(s)
}

/// A value as `===` and a `Map` key compare it: primitives by value (`0` and `-0` the same), an object or array by
/// identity. Identity is the value's address together with an `origin` that names the parse it came from, so two
/// parses never share an identity even when one was dropped before the other was made.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum Key {
    /// `undefined`: the property is missing.
    Undefined,
    /// `null`.
    Null,
    /// `true` or `false`.
    Bool(bool),
    /// A number, by the bits of its double (`-0` as `0`).
    Num(u64),
    /// A string.
    Str(String),
    /// An object or array: the parse it came from and its address.
    Ref(usize, usize),
}

/// The [`Key`] of `v`, read from the parse `origin`.
#[must_use]
pub fn key(v: Option<&Value>, origin: usize) -> Key {
    match v {
        None => Key::Undefined,
        Some(Value::Null) => Key::Null,
        Some(Value::Bool(b)) => Key::Bool(*b),
        Some(Value::Number(n)) => {
            let bits = n.as_f64().map_or(0, f64::to_bits);
            // +0 and -0 differ only in the sign bit; `===` and a Map key treat them as one.
            let zero = bits & !(1u64 << 63) == 0;
            Key::Num(if zero { 0 } else { bits })
        }
        Some(Value::String(s)) => Key::Str(s.clone()),
        Some(other) => Key::Ref(origin, std::ptr::from_ref(other).addr()),
    }
}

/// A whole number as a double, exactly as JavaScript holds it (correctly rounded beyond 2^53).
#[must_use]
pub fn to_f64(n: u64) -> f64 {
    n.to_string().parse::<f64>().unwrap_or(f64::NAN)
}

/// A signed whole number as a double, as JavaScript holds it.
#[must_use]
pub fn to_f64_signed(n: i64) -> f64 {
    n.to_string().parse::<f64>().unwrap_or(f64::NAN)
}

/// `Math.max(0, x)`: NaN stays NaN.
#[must_use]
pub fn max0(x: f64) -> f64 {
    if x.is_nan() { x } else { x.max(0.0) }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn reading_off_null_throws_as_v8_says() {
        let v = json!(null);
        assert_eq!(
            prop(Some(&v), "type"),
            Err(Thrown(
                "Cannot read properties of null (reading 'type')".to_owned()
            ))
        );
    }

    #[test]
    fn a_property_of_a_string_is_undefined() {
        let v = json!("text");
        assert_eq!(prop(Some(&v), "id"), Ok(None));
    }

    #[test]
    fn plus_and_minus_zero_are_one_key() {
        let a = json!(0);
        let b: Value = serde_json::from_str("-0.0").unwrap_or_default();
        assert_eq!(key(Some(&a), 0), key(Some(&b), 0));
    }

    #[test]
    fn two_equal_objects_are_two_keys() {
        let a = json!({"x": 1});
        let b = json!({"x": 1});
        assert_ne!(key(Some(&a), 0), key(Some(&b), 0));
        assert_eq!(key(Some(&a), 0), key(Some(&a), 0));
    }

    #[test]
    fn max0_keeps_nan() {
        assert!(max0(f64::NAN).is_nan());
    }
}
