//! The two lines of a transcript: the warning line and the hard line, by the checkpoint form (every helper and
//! every session that is not a named coordinator), the hand-over W* (a named coordinator), or the compaction cap
//! alone (a Fable transcript, ruling r58-0001).

use crate::jsx;
use crate::reading::{ORIENT, State};
use kit_core::input;
use kit_core::js;
use kit_core::log::Record;
use serde_json::Value;
use std::path::PathBuf;

/// Orientation calls as a length.
const ORIENT_LEN: usize = 17;
/// r57-0171: those 17 calls cost 2.33 M tokens of context.
const R_REC: f64 = 2_330_000.0;
/// ORCHESTRATION.md section 5: 10 calls to reach a quiet point and write the checkpoint.
const K: f64 = 10.0;
/// The app compacts at 92 % of `autoCompactWindow`.
const COMPACT_AT: f64 = 0.92;
/// The builders' Q3 growth, 3.8 K a call.
const G_REC: f64 = 3_800.0;
/// "near the 1M window" for Fable and Sonnet, in this order.
const WINDOW_BY_FAMILY: [(&str, f64); 2] = [("fable", 1_000_000.0), ("sonnet", 1_000_000.0)];

/// Which form judges a transcript.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    /// A helper (its own transcript).
    Helper,
    /// A session a state file names as coordinating.
    Coordinator,
    /// Any other main session.
    Session,
}

impl Kind {
    /// The name the log and `--show` use.
    #[must_use]
    pub fn name(self) -> &'static str {
        match self {
            Self::Helper => "helper",
            Self::Coordinator => "coordinator",
            Self::Session => "session",
        }
    }
}

/// The figures of W*, for a coordinator that is not on Fable.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Hand {
    /// The context at the segment's 17th call.
    pub f: f64,
    /// The context summed over the session's first 17 calls (or the recorded 2.33 M).
    pub r: f64,
    /// W* = F + sqrt(2 R g), infinite when there is no growth yet.
    pub wstar: f64,
}

/// The lines of one transcript.
#[derive(Debug, Clone, PartialEq)]
pub struct Lines {
    /// The context of the last call.
    pub ctx: f64,
    /// Calls so far.
    pub calls: u32,
    /// Compaction segments so far.
    pub seg: u32,
    /// Calls in this segment.
    pub seg_calls: u32,
    /// The current model.
    pub model: Value,
    /// The model's window, if known.
    pub window: Option<f64>,
    /// The compaction point: 0.92 of the window (infinite without one).
    pub a: f64,
    /// The form asked for.
    pub kind: Kind,
    /// `true` when g is the segment's own growth over its last 17 calls.
    pub own: bool,
    /// The growth per call the lines use.
    pub g: f64,
    /// The hard line.
    pub hard: f64,
    /// The warning line.
    pub warn: f64,
    /// `true` for a Fable transcript.
    pub fable: bool,
    /// W*'s figures, for a coordinator not on Fable.
    pub hand: Option<Hand>,
}

/// `String(model || '').toLowerCase().startsWith('claude-fable')`.
#[must_use]
pub fn is_fable(model: &Value) -> bool {
    let m = if js::truthy(model) {
        js::to_string(model)
    } else {
        String::new()
    };
    m.to_lowercase().starts_with("claude-fable")
}

/// `ms[key]` for the value of `modelSettings`: an own key of an object, or an index of an array. (A key every
/// JavaScript object inherits gives a function, whose `autoCompactWindow` is not a number: the same as none.)
fn prop<'a>(ms: &'a Value, key: &str) -> Option<&'a Value> {
    match ms {
        Value::Object(o) => o.get(key),
        Value::Array(a) => {
            let canonical = key == "0" || (!key.starts_with('0') && !key.is_empty());
            key.parse::<usize>()
                .ok()
                .filter(|_| canonical && key.bytes().all(|b| b.is_ascii_digit()))
                .and_then(|i| a.get(i))
        }
        _ => None,
    }
}

/// The `autoCompactWindow` of the model in the first settings file that gives a positive one; else the family's
/// window; else none.
#[must_use]
pub fn window_for(model: &Value, files: &[PathBuf]) -> Option<f64> {
    let key = js::to_string(model);
    for f in files {
        let Ok(bytes) = std::fs::read(f) else {
            continue;
        };
        let Some(v) = input::parse_text(&String::from_utf8_lossy(&bytes)) else {
            continue;
        };
        let w = v
            .get("modelSettings")
            .filter(|ms| js::truthy(ms))
            .and_then(|ms| prop(ms, &key))
            .filter(|e| js::truthy(e))
            .map(|e| jsx::number_of(e.get("autoCompactWindow")));
        if let Some(w) = w
            && w > 0.0
        {
            return Some(w);
        }
    }
    let low = key.to_lowercase();
    WINDOW_BY_FAMILY
        .iter()
        .find(|(f, _)| low.contains(f))
        .map(|(_, w)| *w)
}

/// The lines of `s` judged as `kind`, the window read from `settings`.
#[must_use]
pub fn lines(s: &State, kind: Kind, settings: &[PathBuf]) -> Lines {
    let ctx = s.seg_last;
    let window = window_for(&s.model, settings);
    let a = window.map_or(f64::INFINITY, |w| COMPACT_AT * w);
    let rc = &s.recent;
    let own = rc.len() > ORIENT_LEN;
    // fix B1: the recorded growth until the segment has 17 growth steps of its own, then its own over them
    let g_c = match (own, rc.first(), rc.last()) {
        (true, Some(first), Some(last)) => jsx::max((last - first) / f64::from(ORIENT), 0.0),
        _ => G_REC,
    };
    let hard_c = a - K * g_c;
    let warn_c = hard_c - K * g_c;
    let mut out = Lines {
        ctx,
        calls: s.n,
        seg: s.seg,
        seg_calls: s.seg_n,
        model: s.model.clone(),
        window,
        a,
        kind,
        own,
        g: g_c,
        hard: hard_c,
        warn: warn_c,
        fable: false,
        hand: None,
    };
    if is_fable(&s.model) {
        out.fable = true;
        return out;
    }
    if kind != Kind::Coordinator {
        return out;
    }
    let r = match s.first17.get(..ORIENT_LEN) {
        Some(first) => first.iter().fold(0.0, |acc, x| acc + x),
        None => R_REC,
    };
    let f = s.seg_f;
    let work = s.seg_n.saturating_sub(s.seg_n.min(ORIENT));
    let g_work = (work > 0).then(|| (ctx - f) / f64::from(work));
    let wstar = match g_work {
        Some(g) if g > 0.0 => f + (2.0 * r * g).sqrt(),
        _ => f64::INFINITY,
    };
    out.hand = Some(Hand { f, r, wstar });
    let gw = g_work.unwrap_or(0.0);
    if wstar + K * gw < hard_c {
        out.g = gw;
        out.hard = wstar + K * gw;
    }
    out.warn = jsx::min(wstar, warn_c);
    out
}

/// `${Math.round(x / 1000)} K`, or `none` for a value that is not finite.
#[must_use]
pub fn kfmt(x: f64) -> String {
    if x.is_finite() {
        format!("{} K", js::number_to_string(js::round(x / 1000.0)))
    } else {
        "none".to_owned()
    }
}

impl Lines {
    /// What `--show` prints: the lines' fields in the JavaScript's order, then `warnK`, `hardK`, `WstarK`.
    #[must_use]
    pub fn show_json(&self) -> String {
        let mut r = Record::new()
            .num("ctx", self.ctx)
            .int("calls", u64::from(self.calls))
            .int("seg", u64::from(self.seg))
            .int("segCalls", u64::from(self.seg_calls))
            .raw("model", jsx::stringify(&self.model));
        r = match self.window {
            Some(w) => r.num("window", w),
            None => r.null("window"),
        };
        r = r
            .num("A", self.a)
            .str("kind", self.kind.name())
            .str("gFrom", if self.own { "own" } else { "recorded" })
            .num("g", self.g)
            .num("hard", self.hard)
            .num("warn", self.warn);
        if self.fable {
            r = r.str("form", "fable");
        }
        if let Some(h) = self.hand {
            r = r.num("F", h.f).num("R", h.r).num("Wstar", h.wstar);
        }
        r.str("warnK", &kfmt(self.warn))
            .str("hardK", &kfmt(self.hard))
            .str("WstarK", &kfmt(self.hand.map_or(f64::NAN, |h| h.wstar)))
            .to_json()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state(ctxs: &[f64]) -> State {
        let mut s = State::fresh("x");
        let mut text = String::new();
        for (i, c) in ctxs.iter().enumerate() {
            text.push_str(&format!(
                "{{\"type\":\"assistant\",\"message\":{{\"id\":\"m{i}\",\"model\":\"claude-other\",\"usage\":{{\"input_tokens\":{c}}}}}}}\n"
            ));
        }
        crate::reading::scan_text(&mut s, &text, false);
        s
    }

    #[test]
    fn a_coordinator_line_is_w_star_plus_ten_calls_of_its_growth() {
        let orient: Vec<f64> = (0..17)
            .map(|i| js::round(80_000.0 + f64::from(i) * 90_000.0 / 16.0))
            .collect();
        let mut all = orient;
        all.extend((1..=30).map(|i| 170_000.0 + 2_300.0 * f64::from(i)));
        let l = lines(&state(&all), Kind::Coordinator, &[]);
        let w = l.hand.map_or(0.0, |h| h.wstar);
        assert!((w - 268_900.0).abs() < 600.0 && (l.hard - 291_900.0).abs() < 600.0);
    }

    #[test]
    fn an_unknown_window_puts_no_compaction_cap() {
        let l = lines(&state(&[1000.0]), Kind::Session, &[]);
        assert!(l.window.is_none() && l.hard.is_infinite());
    }

    #[test]
    fn kfmt_rounds_to_thousands_and_names_infinity_none() {
        assert_eq!(
            (kfmt(291_900.0), kfmt(f64::INFINITY)),
            ("292 K".to_owned(), "none".to_owned())
        );
    }

    #[test]
    fn an_array_settings_entry_is_found_by_its_index_only() {
        let ms = serde_json::json!([{"autoCompactWindow": 5}]);
        assert!(prop(&ms, "0").is_some() && prop(&ms, "00").is_none() && prop(&ms, "+0").is_none());
    }
}
