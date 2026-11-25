//! Rule 1's reading: the token limit a start states (in its prompt or in the first brief file the prompt names),
//! and the status of a cited record in the journal (and, in kit mode, in the two basis files).

use crate::Where;
use crate::fsx;
use crate::patterns::{self, Patterns};
use kit_core::{input, js};
use serde_json::Value;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

/// A limit line: where it was found, the limit, the expected figure and the record ids on it.
#[derive(Debug, Clone, PartialEq)]
pub struct Stated {
    /// `the prompt`, or the brief file's name.
    pub place: String,
    /// The limit in tokens.
    pub limit: f64,
    /// The expected figure in tokens, when the line has one.
    pub expected: Option<f64>,
    /// The record ids on the line, each once, in order.
    pub ids: Vec<String>,
}

/// `limitIn(text, where)`: the first line of `text` with a limit.
#[must_use]
pub fn limit_in(p: &Patterns, text: &str, place: &str) -> Option<Stated> {
    for line in patterns::split_lines(text) {
        let Some(m) = p.limit.captures(line) else {
            continue;
        };
        let amount = |c: &kit_core::regex::Captures<'_>| {
            let n = c.get(1).map_or(f64::NAN, |x| patterns::number(x.as_str()));
            let u = c.get(2).map_or(f64::NAN, |x| patterns::unit(x.as_str()));
            n * u
        };
        let mut ids: Vec<String> = Vec::new();
        for c in p.id.captures_iter(line) {
            if let Some(id) = c.get(1).map(|x| x.as_str().to_owned())
                && !ids.contains(&id)
            {
                ids.push(id);
            }
        }
        return Some(Stated {
            place: place.to_owned(),
            limit: amount(&m),
            expected: p.expected.captures(line).map(|e| amount(&e)),
            ids,
        });
    }
    None
}

/// `briefPaths(prompt)`: the brief files (a `.md` path with a folder named `briefs`) the prompt names that exist,
/// each once, in order.
fn brief_paths(p: &Patterns, w: &Where<'_>, prompt: &str) -> Vec<PathBuf> {
    let mut out: Vec<PathBuf> = Vec::new();
    for m in p.md_path.find_iter(prompt) {
        let s = m.as_str();
        if !p.briefs.is_match(s) {
            continue;
        }
        let absolute = s.starts_with('/') || (cfg!(windows) && s.starts_with('\\'));
        let cands: Vec<PathBuf> = if absolute || p.drive.is_match(s) {
            vec![PathBuf::from(s)]
        } else {
            match w.kit {
                Some(k) => vec![
                    kit_core::paths::resolve(&w.root, &[s]),
                    kit_core::paths::resolve(&k.state, &[s]),
                ],
                None => vec![
                    kit_core::paths::resolve(&w.root, &[s]),
                    kit_core::paths::resolve(&w.root, &["research-tree", "build", s]),
                ],
            }
        };
        if let Some(hit) = cands.into_iter().find(|c| c.is_file())
            && !out.contains(&hit)
        {
            out.push(hit);
        }
    }
    out
}

/// `statedLimit(prompt)`: the prompt's own limit line, else the first brief's.
#[must_use]
pub fn stated_limit(p: &Patterns, w: &Where<'_>, prompt: Option<&Value>) -> Option<Stated> {
    let text = crate::jsv::text_or_empty(prompt);
    if let Some(own) = limit_in(p, &text, "the prompt") {
        return Some(own);
    }
    brief_paths(p, w, &text).into_iter().find_map(|b| {
        let body = fsx::read_text(&b).unwrap_or_default();
        limit_in(p, &body, &fsx::basename(&b))
    })
}

/// The status of every record id: the journal's `.jsonl` lines (a later line of the same id wins), then in kit
/// mode the entries of the two basis files whose id the journal does not hold.
#[derive(Debug, Default)]
pub struct Journal {
    status: HashMap<String, String>,
}

impl Journal {
    /// Reads `<root>/library/journal` and, in kit mode, `<clone>/harness-kit/basis.json` and
    /// `<project>/.harness/basis.json`.
    #[must_use]
    pub fn load(p: &Patterns, w: &Where<'_>) -> Self {
        let mut j = Self::default();
        j.walk(p, &w.root.join("library").join("journal"));
        if let Some(k) = w.kit {
            let files = [
                w.clone.join("harness-kit").join("basis.json"),
                k.state.join("basis.json"),
            ];
            for f in files {
                j.basis(&f);
            }
        }
        j
    }

    fn walk(&mut self, p: &Patterns, dir: &Path) {
        for e in fsx::list(dir).unwrap_or_default() {
            let path = dir.join(&e.name);
            if e.is_dir {
                self.walk(p, &path);
            } else if e.name.ends_with(".jsonl") {
                let text = fsx::read_text(&path).unwrap_or_default();
                for l in text.split('\n') {
                    if let Some(c) = p.journal.captures(l)
                        && let Some(id) = c.get(1)
                    {
                        let st = c.get(2).map_or("", |s| s.as_str());
                        self.status.insert(id.as_str().to_owned(), st.to_owned());
                    }
                }
            }
        }
    }

    /// One basis file: a list, or an object with a list `entries`; an entry with a string `id` adds that id with
    /// `String(status || '')` unless the journal holds it.
    fn basis(&mut self, f: &Path) {
        let text = fsx::read_text(f).filter(|t| !t.is_empty());
        let b = text
            .and_then(|t| input::parse_text(&t))
            .unwrap_or(Value::Null);
        let entries = match &b {
            Value::Array(a) => a.as_slice(),
            Value::Object(o) => o
                .get("entries")
                .and_then(Value::as_array)
                .map_or(&[][..], Vec::as_slice),
            _ => &[],
        };
        for e in entries.iter().filter(|e| js::truthy(e)) {
            if let Some(id) = e.get("id").and_then(Value::as_str)
                && !self.status.contains_key(id)
            {
                let st = crate::jsv::text_or_empty(e.get("status"));
                self.status.insert(id.to_owned(), st);
            }
        }
    }

    /// The status of `id`, `None` when no record has it.
    #[must_use]
    pub fn status(&self, id: &str) -> Option<&str> {
        self.status.get(id).map(String::as_str)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_line_without_an_expected_figure_has_none() {
        let p = Patterns::new().ok();
        let s =
            p.and_then(|p| limit_in(&p, "x\r\nToken limit 12 M, basis r57-0165.", "the prompt"));
        assert_eq!(
            s,
            Some(Stated {
                place: "the prompt".to_owned(),
                limit: 12e6,
                expected: None,
                ids: vec!["r57-0165".to_owned()],
            })
        );
    }

    #[test]
    fn ids_are_kept_once_in_order() {
        let p = Patterns::new().ok();
        let s = p.and_then(|p| {
            limit_in(
                &p,
                "limit 2 M (expected ~1 M, basis b1-0002, a-0001, b1-0002)",
                "x",
            )
        });
        assert_eq!(
            s.map(|s| (s.expected, s.ids)),
            Some((Some(1e6), vec!["b1-0002".to_owned(), "a-0001".to_owned()]))
        );
    }
}
