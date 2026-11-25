//! Rule 1's cap: tokens spent by every session the state file names and their helpers, plus the rest of the limit
//! of every helper still running, plus this start's limit.

use crate::Where;
use crate::fsx;
use crate::jsadd::{self, Prim};
use crate::jsv::{self, Js, Key, key};
use crate::limit;
use crate::lines::{self, Line};
use crate::patterns::Patterns;
use crate::state::State;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::path::Path;

/// The sums of `capCheck`.
#[derive(Debug, Clone, PartialEq)]
pub struct Sums {
    /// Tokens spent, each message once (added as JavaScript adds; a plain number in real transcripts).
    pub spent: Prim,
    /// The rest of the limits of the helpers still running.
    pub reserve: f64,
    /// How many helpers are still running.
    pub running: u64,
    /// `spent + reserve + this start's limit`.
    pub total: Prim,
}

/// A JavaScript `Map` from tool-use ids: insertion order kept, a key set again keeps its place.
#[derive(Default)]
struct Starts {
    order: Vec<(Key, Option<f64>)>,
    at: HashMap<Key, usize>,
}

impl Starts {
    fn set(&mut self, k: Key, v: Option<f64>) {
        match self.at.get(&k).and_then(|&i| self.order.get_mut(i)) {
            Some(slot) => slot.1 = v,
            None => {
                self.at.insert(k.clone(), self.order.len());
                self.order.push((k, v));
            }
        }
    }

    fn get(&self, k: &Key) -> Option<Option<f64>> {
        self.at.get(k).and_then(|&i| self.order.get(i)).map(|s| s.1)
    }
}

/// A helper's file: its tokens, its `.meta.json` (parsed) and its id.
struct Meta {
    used: Prim,
    meta: Option<Value>,
    id: String,
    origin: usize,
}

/// `capCheck(st, projDir, thisTu, newLimit)`.
///
/// # Errors
/// Where the JavaScript throws (a `null` content block).
pub fn check(
    p: &Patterns,
    w: &Where<'_>,
    st: &State,
    proj_dir: &Path,
    this_tu: Option<&Value>,
    new_limit: f64,
) -> Js<Sums> {
    let mut spent = Prim::Num(0.0);
    let mut starts = Starts::default();
    let mut answered: HashSet<Key> = HashSet::new();
    let mut metas: Vec<Meta> = Vec::new();
    let mut per: HashSet<Key> = HashSet::new();
    // Each parse has its own origin, so an object id from one file never equals one from another.
    let mut origin: usize = 2;
    for s8 in &st.sessions {
        let names: Vec<String> = fsx::list(proj_dir)
            .unwrap_or_default()
            .into_iter()
            .map(|e| e.name)
            .filter(|n| n.starts_with(s8.as_str()) && n.ends_with(".jsonl"))
            .collect();
        for n in names {
            let main = proj_dir.join(&n);
            let stem = n.strip_suffix(".jsonl").unwrap_or(&n);
            let mut sub = Vec::new();
            fsx::files(
                &proj_dir.join(stem).join("subagents"),
                &|x: &str| x.ends_with(".jsonl") || x.ends_with(".meta.json"),
                &mut sub,
            );
            let helpers = sub
                .into_iter()
                .filter(|x| x.to_string_lossy().ends_with(".jsonl"));
            for (k, f) in std::iter::once(main).chain(helpers).enumerate() {
                origin = origin.saturating_add(1);
                let objs = lines::read(&f);
                let used = tokens_of(&objs, origin, &mut per);
                spent = spent.add(&used);
                for o in &objs {
                    for b in o.blocks() {
                        let t = lines::block_type(b)?;
                        if o.is_assistant() && t == Some("tool_use") {
                            let name = b.get("name");
                            if jsv::is_str(name, "Agent") || jsv::is_str(name, "Task") {
                                let input = b.get("input").filter(|i| kit_core::js::truthy(i));
                                let prompt = input.and_then(|i| i.get("prompt"));
                                let s = limit::stated_limit(p, w, prompt);
                                starts.set(key(b.get("id"), origin), s.map(|s| s.limit));
                            }
                        }
                        if o.kind() == "user" && t == Some("tool_result") {
                            answered.insert(key(b.get("tool_use_id"), origin));
                        }
                    }
                }
                if k > 0 {
                    let text = f.to_string_lossy();
                    let meta_path = text
                        .strip_suffix(".jsonl")
                        .map_or_else(|| text.to_string(), |s| format!("{s}.meta.json"));
                    let meta = fsx::read_text(Path::new(&meta_path))
                        .and_then(|t| kit_core::input::parse_text(&t));
                    let base = fsx::basename(&f);
                    let id = base.strip_prefix("agent-").unwrap_or(&base);
                    let id = id.strip_suffix(".jsonl").unwrap_or(id).to_owned();
                    origin = origin.saturating_add(1);
                    metas.push(Meta {
                        used,
                        meta,
                        id,
                        origin,
                    });
                }
            }
        }
    }
    // A helper killed by an app restart never gets "finished" (r57-0118); the count gate's hand-written end marks it.
    let mut ended: HashSet<String> = HashSet::new();
    for l in kit_core::transcript::lines(&w.logdir.join("count-gate.jsonl")) {
        let Some(o) = kit_core::input::parse_text(&l) else {
            continue;
        };
        if jsv::is_str(o.get("ev"), "end")
            && jsv::truthy(o.get("manual"))
            && jsv::truthy(o.get("agent"))
        {
            let a = o
                .get("agent")
                .map(kit_core::js::to_string)
                .unwrap_or_default();
            ended.insert(a.strip_prefix("agent-").unwrap_or(&a).to_owned());
        }
    }
    let mut reserve = 0.0_f64;
    let mut running: u64 = 0;
    let mut seen: HashSet<Key> = HashSet::new();
    for m in &metas {
        let Some(meta) = m.meta.as_ref().filter(|v| kit_core::js::truthy(v)) else {
            continue;
        };
        let tool_use = meta.get("toolUseId");
        if !jsv::truthy(tool_use) {
            continue;
        }
        let k = key(tool_use, m.origin);
        seen.insert(k.clone());
        if meta.get("finished") == Some(&Value::Bool(true)) || ended.contains(&m.id) {
            continue;
        }
        running = running.saturating_add(1);
        if let Some(Some(lim)) = starts.get(&k) {
            reserve += jsv::max0(lim - m.used.number());
        }
    }
    // A start with no helper file: refused, or answered without a helper file (ended; its tokens, if any, are counted
    // above), or not yet answered: a start of the same message a moment earlier, which runs with its whole limit.
    let this = key(this_tu, 1);
    for (tu, lim) in &starts.order {
        if *tu == this || seen.contains(tu) || answered.contains(tu) {
            continue;
        }
        running = running.saturating_add(1);
        if let Some(lim) = lim {
            reserve += lim;
        }
    }
    Ok(Sums {
        reserve,
        running,
        total: spent.add(&Prim::Num(reserve)).add(&Prim::Num(new_limit)),
        spent,
    })
}

/// `tokensOf(objs, per)`: the tokens of the file's messages whose ids `per` has not counted yet, each id with the
/// usage of its last line in the file, in the order ids first appear (a JavaScript `Map`). An id is any truthy
/// value, compared as a `Map` key compares it (`origin` names this file's parse).
fn tokens_of(objs: &[Line], origin: usize, per: &mut HashSet<Key>) -> Prim {
    let mut mine: Vec<(Key, Prim)> = Vec::new();
    let mut at: HashMap<Key, usize> = HashMap::new();
    for o in objs.iter().filter(|o| o.is_assistant()) {
        let Some(m) = o.message().filter(|m| kit_core::js::truthy(m)) else {
            continue;
        };
        let Some(u) = m.get("usage").filter(|u| kit_core::js::truthy(u)) else {
            continue;
        };
        let Some(id) = m.get("id").filter(|i| kit_core::js::truthy(i)) else {
            continue;
        };
        let k = key(Some(id), origin);
        let v = jsadd::usage_sum(u);
        match at.get(&k).and_then(|&i| mine.get_mut(i)) {
            Some(slot) => slot.1 = v,
            None => {
                at.insert(k.clone(), mine.len());
                mine.push((k, v));
            }
        }
    }
    let mut s = Prim::Num(0.0);
    for (k, v) in mine {
        if per.insert(k) {
            s = s.add(&v);
        }
    }
    s
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn line(id: &Value, input: &Value) -> Line {
        Line::Msg(
            json!({"type": "assistant", "message": {"id": id, "usage": {"input_tokens": input}}}),
        )
    }

    #[test]
    fn the_last_usage_of_an_id_counts_and_a_seen_id_counts_once() {
        let mut per = HashSet::new();
        let a = [
            line(&json!("m1"), &json!(10)),
            line(&json!("m1"), &json!(20)),
            line(&json!(5), &json!(1)),
            line(&json!("5"), &json!(2)),
        ];
        assert_eq!(tokens_of(&a, 3, &mut per), Prim::Num(23.0));
        let b = [
            line(&json!("m1"), &json!(99)),
            line(&json!("m2"), &json!(4)),
        ];
        assert_eq!(tokens_of(&b, 4, &mut per), Prim::Num(4.0));
    }

    #[test]
    fn a_usage_given_as_text_joins_as_javascript_joins_it() {
        let mut per = HashSet::new();
        let a = [
            line(&json!("m1"), &json!(7)),
            line(&json!("m2"), &json!("12")),
        ];
        // 0 + 7 is 7; 7 + ("12" + 0 + 0 + 0, which is "12000") is "712000".
        assert_eq!(tokens_of(&a, 3, &mut per), Prim::Str("712000".to_owned()));
    }
}
