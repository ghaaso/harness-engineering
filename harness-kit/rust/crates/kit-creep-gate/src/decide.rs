//! The decision for one helper start (`decide` of `creep-gate.mjs`): the reason it is refused, if any, and the line
//! of context every start that passes gets.

use crate::rules::{Patterns, Place, breaking, is_review_name};
use crate::session::Session;
use kit_core::js;
use std::collections::HashSet;

/// The start being decided.
#[derive(Debug, Clone, Copy)]
pub struct Cur<'a> {
    /// The call's id, as an id key.
    pub id: &'a str,
    /// When it was made (ms).
    pub ts: f64,
    /// `main` or the agent making it.
    pub who: &'a str,
    /// Its place among its transcript's starts, when it is in the transcript.
    pub pos: Option<u64>,
    /// Its description.
    pub desc: &'a str,
    /// Its prompt.
    pub prompt: &'a str,
}

/// What [`decide`] gives.
#[derive(Debug, Clone)]
pub struct Decision {
    /// The reason for refusing, or `None` to pass.
    pub why: Option<String>,
    /// The line of context for a start that passes.
    pub context: String,
    /// The start is a review.
    pub review: bool,
    /// The piece of work it names.
    pub target: Option<String>,
}

/// `fmtTok(n)`: `1.2 M` from a million up, else `340 k`.
#[must_use]
pub fn fmt_tok(n: f64) -> String {
    if n >= 1e6 {
        format!("{} M", js::to_fixed(n / 1e6, 1))
    } else {
        format!("{} k", js::number_to_string(js::round(n / 1e3)))
    }
}

/// `fmtMin(ms)`: whole minutes, never below 0.
#[must_use]
pub fn fmt_min(ms: f64) -> String {
    format!(
        "{} min",
        js::number_to_string(js::round(ms / 60000.0).max(0.0))
    )
}

/// A target that JavaScript would take as true (not empty).
fn some(t: Option<&String>) -> Option<&str> {
    t.map(String::as_str).filter(|t| !t.is_empty())
}

/// `decide(S, cur, T, refused, escape)`.
#[must_use]
pub fn decide(
    place: &Place<'_>,
    rx: &Patterns,
    s: &Session,
    cur: &Cur<'_>,
    t: f64,
    refused: &HashSet<String>,
    escape: bool,
) -> Decision {
    let earlier = |x: &&crate::session::Start| {
        x.id != cur.id
            && match cur.pos {
                Some(p) if x.who == cur.who => x.pos < p,
                _ => x.ts <= cur.ts,
            }
    };
    let prior: Vec<_> = s
        .starts
        .iter()
        .filter(earlier)
        .filter(|x| !refused.contains(&x.id))
        .collect();
    let reviews: Vec<_> = prior.iter().copied().filter(|x| x.review).collect();
    let agents_of = |keep: &dyn Fn(&crate::session::Start) -> bool| -> HashSet<&str> {
        s.starts
            .iter()
            .filter(|x| keep(x))
            .filter_map(|x| x.agent.as_deref())
            .collect()
    };
    let review_agents = agents_of(&|x| x.review);
    let gone_agents = agents_of(&|x| refused.contains(&x.id));
    let deliv: Vec<_> = s
        .writes
        .iter()
        .filter(|w| {
            w.ts <= t
                && !review_agents.contains(w.who.as_str())
                && !gone_agents.contains(w.who.as_str())
        })
        .collect();
    let review_written: HashSet<&str> = s
        .writes
        .iter()
        .filter(|w| review_agents.contains(w.who.as_str()))
        .map(|w| w.path.as_str())
        .collect();
    let review = rx.is_review(cur.desc, cur.prompt);
    let target = place.target_of(rx, cur.prompt);
    let tgt = some(target.as_ref());
    let finished: Vec<_> = reviews
        .iter()
        .filter(|x| x.end.is_some_and(|e| e <= t))
        .collect();
    let d = s.deliverable.as_deref().filter(|d| !d.is_empty());
    let in_d = |p: Option<&str>| match (d, p.filter(|p| !p.is_empty())) {
        (Some(d), Some(p)) => p == d || p.strip_prefix(d).is_some_and(|r| r.starts_with('/')),
        _ => false,
    };
    let mut d_last: Option<f64> = None;
    for w in &deliv {
        if in_d(Some(&w.path)) && d_last.is_none_or(|l| w.ts > l) {
            d_last = Some(w.ts);
        }
    }
    if let (Some(_), Some(m), Some(first)) = (d, s.d_mtime, s.first)
        && m > first
        && m <= t
        && d_last.is_none_or(|l| m > l)
    {
        d_last = Some(m);
    }

    let why = (|| {
        if escape {
            return None;
        }
        if review {
            if let Some(running) = reviews.iter().find(|x| x.end.is_none_or(|e| e > t)) {
                return Some(format!(
                    "another review (\"{}\") is still running; one review at a time, no panels or lenses.",
                    running.desc
                ));
            }
            if let Some(d) = d
                && d_last.is_none()
                && !in_d(tgt)
            {
                return Some(format!(
                    "the deliverable ({d}) has not changed in this session yet: build it first; a review or check aimed at {} waits until it has.",
                    tgt.unwrap_or("no named file")
                ));
            }
            if let Some(tg) = tgt
                && (is_review_name(tg) || review_written.contains(tg))
            {
                return Some(format!(
                    "{tg} is a review's output; a review of a review is refused."
                ));
            }
            let same = reviews
                .iter()
                .filter(|x| match (tgt, some(x.target.as_ref())) {
                    (Some(a), Some(b)) => a == b,
                    _ => true,
                })
                .count();
            if same >= 2 {
                return Some(format!(
                    "this would be the third review of {}; fix what breaks it, list the rest, and finish.",
                    tgt.unwrap_or("the same work")
                ));
            }
            let last_end = finished
                .iter()
                .filter_map(|x| x.end)
                .fold(None, |m: Option<f64>, e| match m {
                    Some(x) if e <= x => Some(x),
                    _ => Some(e),
                });
            if let Some(last_end) = last_end {
                let first_of_piece = tgt.is_some() && same == 0;
                if !first_of_piece && !deliv.iter().any(|w| w.ts > last_end) {
                    return Some(
                        "nothing was written since the last review finished: ship it or fix it, do not review it again."
                            .to_owned(),
                    );
                }
            }
        }
        let fold = rx.is_fold(&format!("{}\n{}", cur.desc, cur.prompt))
            || (rx.is_fix_round(cur.desc) && !finished.is_empty());
        (fold && !breaking(cur.prompt)).then(|| {
            "a repair round on review findings is refused unless the findings break the work; list the rest at the end of the work."
                .to_owned()
        })
    })();

    let last_any = deliv
        .iter()
        .fold(None, |a: Option<&&crate::session::Write>, w| match a {
            Some(x) if w.ts <= x.ts => Some(x),
            _ => Some(w),
        });
    let change_ts = if d.is_some() {
        d_last
    } else {
        last_any.map(|w| w.ts)
    };
    let (mut total, mut after) = (0.0, 0.0);
    for m in s.msgs.iter().filter(|m| m.ts <= t) {
        total += m.n;
        if change_ts.is_some_and(|c| m.ts > c) {
            after += m.n;
        }
    }
    let pct = if total != 0.0 && !total.is_nan() {
        js::round((100.0 * after) / total)
    } else {
        0.0
    };
    let share = format!(
        "{} of the session's {} tokens ({} %) came after that.",
        fmt_tok(after),
        fmt_tok(total),
        js::number_to_string(pct)
    );
    let state = match (d, change_ts) {
        (Some(d), Some(c)) => format!(
            "the deliverable ({d}) last changed {} ago; {share}",
            fmt_min(t - c)
        ),
        (Some(d), None) => format!(
            "the deliverable ({d}) has not changed in this session yet; all {} tokens so far went elsewhere.",
            fmt_tok(total)
        ),
        (None, c) => {
            let what = match (c, last_any) {
                (Some(c), Some(w)) => format!(
                    "a file last changed {} ago ({}); {share}",
                    fmt_min(t - c),
                    w.path
                ),
                _ => format!("no file changed yet; {} tokens so far.", fmt_tok(total)),
            };
            format!(
                "{what} No deliverable stated: a line \"Deliverable: <path>\" in the brief or a message names it."
            )
        }
    };
    let rule = if place.kit.is_some() {
        " Build the deliverable, one targeted check, finish (the kit's rules)."
    } else {
        " Build the deliverable, one targeted check, finish (CLAUDE.md rule 8)."
    };
    let context = format!(
        "creep gate: {} helpers started in this session, {} of them reviews; {state}{rule}",
        prior.len().saturating_add(1),
        reviews.len().saturating_add(usize::from(review))
    );
    Decision {
        why,
        context,
        review,
        target,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tokens_print_as_thousands_below_a_million() {
        assert_eq!(fmt_tok(1_500.0), "2 k");
        assert_eq!(fmt_tok(2_500.0), "3 k");
        assert_eq!(fmt_tok(1_250_000.0), "1.3 M");
    }

    #[test]
    fn minutes_never_go_below_zero() {
        assert_eq!(fmt_min(-90_000.0), "0 min");
        assert_eq!(fmt_min(90_000.0), "2 min");
    }
}
