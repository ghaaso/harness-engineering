//! What the set-up writes besides the hook entries, each only where the file has no value of its own, and each
//! recorded in `env.HARNESS_KIT_OFF` (a JSON string) so that `--remove` takes out exactly what was added, and only
//! while it still holds the value set:
//!
//! - when the project is the clone, the archived FixFlow skills and agents the clone holds are switched off:
//!   `skillOverrides { "<skill folder>": "off" }` for every folder under `.claude/skills/` and
//!   `permissions.deny "Agent(<name>)"` for every `.claude/agents/fixflow-*.md` (its frontmatter name, else the file
//!   name); a `lean-*` name never;
//! - `env.CLAUDE_CODE_FORK_SUBAGENT = "0"`: a helper's own helpers can then run in the background (record r57-0157);
//! - `modelSettings["claude-opus-5-5"] = { "autoCompactWindow": 400000 }`: the Opus window the window ceiling's
//!   lines were measured under (record r57-0107);
//! - when the project is the clone, `skillListingMaxDescChars = 1`: the listing of the archived skills cut to almost
//!   nothing (they load about 8,000 tokens into every session, record r57-0155).

use crate::json::{self, J};
use kit_core::{js, regex::Regex};
use std::path::Path;

/// The env key that holds the record.
pub const RECORD: &str = "HARNESS_KIT_OFF";
/// The env setting the kit adds, and its value.
pub const FORK: (&str, &str) = ("CLAUDE_CODE_FORK_SUBAGENT", "0");
/// The model whose window the kit sets.
pub const OPUS: &str = "claude-opus-5-5";
/// The window it sets.
pub const WINDOW: f64 = 400_000.0;
/// The top-level setting the kit adds in the clone, and its value.
pub const LISTING: (&str, f64) = ("skillListingMaxDescChars", 1.0);

/// `{ "autoCompactWindow": 400000 }`.
#[must_use]
pub fn window_entry() -> J {
    J::Obj(vec![("autoCompactWindow".to_owned(), J::Num(WINDOW))])
}

/// The archived FixFlow material found in a clone.
#[derive(Debug, Default)]
pub struct Items {
    /// Skill folder names (no `lean-*`), sorted.
    pub skills: Vec<String>,
    /// Agent names (no `lean-*`), sorted.
    pub agents: Vec<String>,
}

/// What the kit added, as recorded.
#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct Record {
    /// Skills switched off.
    pub skills: Vec<String>,
    /// `permissions.deny` entries added.
    pub deny: Vec<String>,
    /// `env` keys added.
    pub env: Vec<String>,
    /// `modelSettings` keys added.
    pub models: Vec<String>,
    /// Top-level keys added.
    pub keys: Vec<String>,
}

impl Record {
    /// True when nothing is recorded.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.skills.is_empty() && self.deny.is_empty() && self.settings() == 0
    }

    /// How many of the three settings it added.
    #[must_use]
    pub fn settings(&self) -> usize {
        self.env
            .len()
            .saturating_add(self.models.len())
            .saturating_add(self.keys.len())
    }

    /// The settings it added, by name.
    #[must_use]
    pub fn setting_names(&self) -> Vec<String> {
        self.env
            .iter()
            .map(|k| format!("env.{k}"))
            .chain(self.models.iter().map(|m| format!("modelSettings.{m}")))
            .chain(self.keys.iter().cloned())
            .collect()
    }

    fn to_json(&self) -> J {
        let list = |v: &[String]| J::Arr(v.iter().map(|s| J::str(s)).collect());
        J::Obj(vec![
            ("skills".to_owned(), list(&self.skills)),
            ("deny".to_owned(), list(&self.deny)),
            ("env".to_owned(), list(&self.env)),
            ("modelSettings".to_owned(), list(&self.models)),
            ("settings".to_owned(), list(&self.keys)),
        ])
    }
}

fn frontmatter_name(text: &str) -> Option<String> {
    let re = Regex::new(r"(?m)^---\r?\n(?s:.)*?^name:\s*(\S+)\s*$").ok()?;
    re.captures(text)?.get(1).map(|m| m.as_str().to_owned())
}

/// The skill folders and `fixflow-*` agents of the clone.
#[must_use]
pub fn fixflow_items(root: &Path) -> Items {
    let mut items = Items::default();
    if let Ok(rd) = std::fs::read_dir(root.join(".claude").join("skills")) {
        for e in rd.flatten() {
            let name = e.file_name().to_string_lossy().into_owned();
            if e.path().is_dir() && !name.starts_with("lean-") {
                items.skills.push(name);
            }
        }
    }
    let ad = root.join(".claude").join("agents");
    if let Ok(rd) = std::fs::read_dir(&ad) {
        for e in rd.flatten() {
            let f = e.file_name().to_string_lossy().into_owned();
            let Some(stem) = f
                .strip_prefix("fixflow-")
                .and_then(|_| f.strip_suffix(".md"))
            else {
                continue;
            };
            let name = std::fs::read(ad.join(&f))
                .ok()
                .and_then(|b| frontmatter_name(&String::from_utf8_lossy(&b)))
                .unwrap_or_else(|| stem.to_owned());
            if !name.starts_with("lean-") {
                items.agents.push(name);
            }
        }
    }
    items.skills.sort_by(|a, b| js::cmp_utf16(a, b));
    items.agents.sort_by(|a, b| js::cmp_utf16(a, b));
    items
}

/// The record in `env.HARNESS_KIT_OFF`, or `None` when there is none or it does not parse.
#[must_use]
pub fn read_record(s: &J) -> Option<Record> {
    let text = s.get("env")?.get(RECORD)?.as_str()?;
    let r = json::parse(text).ok()?;
    if r == J::Null {
        return None;
    }
    let list = |k: &str| -> Vec<String> {
        r.get(k)
            .and_then(J::as_arr)
            .unwrap_or_default()
            .iter()
            .filter_map(|v| v.as_str().map(str::to_owned))
            .collect()
    };
    Some(Record {
        skills: list("skills"),
        deny: list("deny"),
        env: list("env"),
        models: list("modelSettings"),
        keys: list("settings"),
    })
}

/// Drops `key` when it holds an empty object.
fn drop_if_empty(s: &mut J, key: &str) {
    if s.get(key).is_some_and(J::is_empty_obj) {
        s.remove(key);
    }
}

/// Everything the record names taken out, where it still holds the value the kit set; then the record.
#[must_use]
pub fn strip_own(settings: &J) -> J {
    let mut s = settings.clone();
    let Some(rec) = read_record(&s) else {
        return s;
    };
    if let Some(so) = s.get_mut("skillOverrides").filter(|v| v.is_obj()) {
        for k in &rec.skills {
            if so.get(k) == Some(&J::str("off")) {
                so.remove(k);
            }
        }
    }
    drop_if_empty(&mut s, "skillOverrides");
    let mut had_deny = false;
    if let Some(p) = s.get_mut("permissions").filter(|v| v.is_obj())
        && let Some(J::Arr(deny)) = p.get_mut("deny")
    {
        had_deny = true;
        deny.retain(|d| !d.as_str().is_some_and(|d| rec.deny.iter().any(|r| r == d)));
        if deny.is_empty() {
            p.remove("deny");
        }
    }
    if had_deny {
        drop_if_empty(&mut s, "permissions");
    }
    let mut took_model = false;
    if let Some(ms) = s.get_mut("modelSettings").filter(|v| v.is_obj()) {
        for m in &rec.models {
            if m == OPUS && ms.get(m) == Some(&window_entry()) {
                ms.remove(m);
                took_model = true;
            }
        }
    }
    if took_model {
        drop_if_empty(&mut s, "modelSettings");
    }
    for k in &rec.keys {
        if k == LISTING.0 && s.get(k) == Some(&J::Num(LISTING.1)) {
            s.remove(k);
        }
    }
    if let Some(env) = s.get_mut("env") {
        for k in &rec.env {
            if k == FORK.0 && env.get(k) == Some(&J::str(FORK.1)) {
                env.remove(k);
            }
        }
        env.remove(RECORD);
    }
    drop_if_empty(&mut s, "env");
    s
}

/// `s[key]` made an object if it is not one (`s.k = s.k && typeof s.k === 'object' ? s.k : {}`).
fn ensure_obj(s: &mut J, key: &str) {
    if !matches!(s.get(key), Some(J::Obj(_) | J::Arr(_))) {
        s.set(key, J::obj());
    }
}

/// What the kit adds besides its hook entries, each where the file has no value of its own, recorded.
#[must_use]
pub fn add_own(settings: &J, items: &Items, is_clone: bool) -> J {
    let mut s = strip_own(settings);
    let mut rec = Record::default();
    if !items.skills.is_empty() {
        ensure_obj(&mut s, "skillOverrides");
        if let Some(so) = s.get_mut("skillOverrides") {
            for k in &items.skills {
                if !so.has(k) {
                    so.set(k, J::str("off"));
                    rec.skills.push(k.clone());
                }
            }
        }
        drop_if_empty(&mut s, "skillOverrides");
    }
    if !items.agents.is_empty() {
        ensure_obj(&mut s, "permissions");
        if let Some(p) = s.get_mut("permissions") {
            if !matches!(p.get("deny"), Some(J::Arr(_))) {
                p.set("deny", J::Arr(Vec::new()));
            }
            if let Some(J::Arr(deny)) = p.get_mut("deny") {
                for a in &items.agents {
                    let d = format!("Agent({a})");
                    if !deny.iter().any(|x| x.as_str() == Some(d.as_str())) {
                        deny.push(J::str(&d));
                        rec.deny.push(d);
                    }
                }
                if deny.is_empty() {
                    p.remove("deny");
                }
            }
        }
        drop_if_empty(&mut s, "permissions");
    }
    if !s.get("env").is_some_and(|e| e.has(FORK.0)) {
        ensure_obj(&mut s, "env");
        if let Some(env) = s.get_mut("env") {
            env.set(FORK.0, J::str(FORK.1));
            rec.env.push(FORK.0.to_owned());
        }
    }
    if !s.get("modelSettings").is_some_and(|m| m.has(OPUS)) {
        ensure_obj(&mut s, "modelSettings");
        if let Some(ms) = s.get_mut("modelSettings") {
            ms.set(OPUS, window_entry());
            rec.models.push(OPUS.to_owned());
        }
    }
    if is_clone && !s.has(LISTING.0) {
        s.set(LISTING.0, J::Num(LISTING.1));
        rec.keys.push(LISTING.0.to_owned());
    }
    if !rec.is_empty() {
        ensure_obj(&mut s, "env");
        if let Some(env) = s.get_mut("env") {
            env.set(RECORD, J::Str(rec.to_json().compact()));
        }
    }
    s
}
