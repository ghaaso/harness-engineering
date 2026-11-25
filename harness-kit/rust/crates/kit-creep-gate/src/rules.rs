//! What a helper start is and what it names, read as `creep-gate.mjs` reads it: its kind, whether it is a review,
//! a repair round, whether its findings are breaking, the piece of work its prompt names, the deliverable a message
//! states and the owner's record a prompt names.
//!
//! JavaScript patterns without the `u` flag are ASCII in `\b`, `\d`, `[a-z]` and in what `i` folds; `\s` is
//! JavaScript's white space. The patterns below keep that: letters are matched with `(?i-u:...)`, boundaries with
//! `(?-u:\b)`, white space with [`JS_SPACE`] or `js::is_space`. Look-behind and multi-line anchors are matched by
//! hand.

use kit_core::context::Kit;
use kit_core::js;
use kit_core::paths;
use kit_core::regex::{self, Regex};
use std::path::{Path, PathBuf};

/// JavaScript's `\s` as a class of the `regex` crate.
const JS_SPACE: &str = r"[\t\n\x0B\x0C\r \x{A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}]";

/// Kinds of job that build or fetch: a description of one of these kinds is not a review whatever words it holds.
const NOT_REVIEW: [&str; 6] = [
    "build",
    "build-invariant",
    "locate",
    "extract",
    "collect",
    "orchestrate",
];

/// The patterns the hook matches with the `regex` crate.
#[derive(Debug)]
pub struct Patterns {
    /// `WORDS`: the words that make a description a review.
    words: Regex,
    /// `\bkind\s+refute\b` (in a prompt).
    kind_refute: Regex,
    /// `FOLD`: fold, fix or address findings.
    fold: Regex,
    /// `\b(fix|repair)\s+round\b` (in a description).
    fix_round: Regex,
    /// `PATH_RE`: a repository path in a text.
    path: Regex,
    /// `agent-<id>.meta.json` or `agent-<id>.jsonl`.
    agent_file: Regex,
}

impl Patterns {
    /// The compiled patterns.
    ///
    /// # Errors
    /// When a pattern does not compile (they are fixed, so only a fault in this file can cause it).
    pub fn new() -> Result<Self, regex::Error> {
        let s = JS_SPACE;
        Ok(Self {
            words: Regex::new(
                r"(?i-u)\b(?:review(?:s|ed|ing|er|ers)?|critiques?|audit(?:s|ed|ing)?|verif(?:y|ies|ied|ying|ication)|check(?:s|ed|ing|er)?|adversarial|lens(?:es)?|refut(?:e|es|ed|ing|ation)|blind[- ]check)\b",
            )?,
            kind_refute: Regex::new(&format!(r"(?-u:\b)(?i-u:kind){s}+(?i-u:refute)(?-u:\b)"))?,
            fold: Regex::new(&format!(
                r"(?-u:\b)(?:(?i-u:fold)|(?i-u:fix)(?i-u:ing)?{s}+(?:(?i-u:the){s}+)?(?i-u:findings)|(?i-u:address)(?i-u:ing)?{s}+(?:(?i-u:the){s}+)?(?i-u:findings))(?-u:\b)"
            ))?,
            fix_round: Regex::new(&format!(
                r"(?-u:\b)(?i-u:fix|repair){s}+(?i-u:round)(?-u:\b)"
            ))?,
            path: Regex::new(
                r"[A-Za-z0-9_.:-]+(?:[\\/][A-Za-z0-9_.-]+)+\.[A-Za-z0-9]{1,6}(?-u:\b)",
            )?,
            agent_file: Regex::new(r"^agent-([^\n\r\x{2028}\x{2029}]+)\.(meta\.json|jsonl)$")?,
        })
    }

    /// `isReview(d, p)`: kind refute (in the description or "kind refute" in the prompt), or a review word in a
    /// description whose kind does not build or fetch.
    #[must_use]
    pub fn is_review(&self, desc: &str, prompt: &str) -> bool {
        let k = kind_of(desc);
        if k == "refute" || self.kind_refute.is_match(prompt) {
            return true;
        }
        !NOT_REVIEW.contains(&k.as_str()) && self.words.is_match(desc)
    }

    /// `FOLD.test(text)`.
    #[must_use]
    pub fn is_fold(&self, text: &str) -> bool {
        self.fold.is_match(text)
    }

    /// `/\b(fix|repair)\s+round\b/i.test(desc)`.
    #[must_use]
    pub fn is_fix_round(&self, desc: &str) -> bool {
        self.fix_round.is_match(desc)
    }

    /// Every repository path in `text`, in order (`text.matchAll(PATH_RE)`).
    pub fn paths_in<'t>(&self, text: &'t str) -> impl Iterator<Item = &'t str> {
        self.path.find_iter(text).map(|m| m.as_str())
    }

    /// The agent id and the file's kind (`meta.json` or `jsonl`) of a file in a session's `subagents` folder.
    #[must_use]
    pub fn agent_file<'n>(&self, name: &'n str) -> Option<(&'n str, &'n str)> {
        let c = self.agent_file.captures(name)?;
        Some((c.get(1)?.as_str(), c.get(2)?.as_str()))
    }
}

/// A word character of an ASCII `\b`.
fn is_word(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '_'
}

/// `kindOf(d)`: the kind named before a colon at the start of a description, in lower case; empty for none.
#[must_use]
pub fn kind_of(desc: &str) -> String {
    let rest = desc.trim_start_matches(js::is_space);
    if !rest.chars().next().is_some_and(|c| c.is_ascii_alphabetic()) {
        return String::new();
    }
    let end = rest
        .find(|c: char| !(c.is_ascii_alphabetic() || c == '-'))
        .unwrap_or(rest.len());
    let (name, after) = rest.split_at_checked(end).unwrap_or((rest, ""));
    if after.trim_start_matches(js::is_space).starts_with(':') {
        name.to_ascii_lowercase()
    } else {
        String::new()
    }
}

/// `/(?<!non-)(?<!non )\bbreaking\b/i.test(prompt)`: the findings are said to be breaking.
#[must_use]
pub fn breaking(prompt: &str) -> bool {
    let low = prompt.to_ascii_lowercase();
    low.match_indices("breaking").any(|(at, word)| {
        let before = low.get(..at).unwrap_or("");
        let after = low.get(at.saturating_add(word.len())..).unwrap_or("");
        !before.chars().next_back().is_some_and(is_word)
            && !after.chars().next().is_some_and(is_word)
            && !before.ends_with("non-")
            && !before.ends_with("non ")
    })
}

/// `REVIEW_NAME.test(path)`: a path that says refute, review, critique, audit, verdict or findings.
#[must_use]
pub fn is_review_name(path: &str) -> bool {
    let low = path.to_ascii_lowercase();
    [
        "refute", "review", "critique", "audit", "verdict", "findings",
    ]
    .iter()
    .any(|w| low.contains(w))
}

/// The byte offsets where a line starts for JavaScript's multi-line `^`: 0 and after each `\n`, `\r`, U+2028 and
/// U+2029.
fn line_starts(text: &str) -> impl Iterator<Item = usize> + '_ {
    std::iter::once(0).chain(
        text.char_indices()
            .filter(|&(_, c)| matches!(c, '\n' | '\r' | '\u{2028}' | '\u{2029}'))
            .map(|(i, c)| i.saturating_add(c.len_utf8())),
    )
}

/// `text` without its first `word.len()` bytes when they are `word` in any ASCII case.
fn strip_ascii_ci<'t>(text: &'t str, word: &str) -> Option<&'t str> {
    let head = text.get(..word.len())?;
    if head.eq_ignore_ascii_case(word) {
        text.get(word.len()..)
    } else {
        None
    }
}

/// The path of `` /^[\s>*#-]*deliverable\s*:\s*`?([^\s`'",;]+)/im `` in `text`, from its first match.
#[must_use]
pub fn deliverable_of(text: &str) -> Option<&str> {
    line_starts(text).find_map(|at| {
        let rest = text
            .get(at..)?
            .trim_start_matches(|c: char| js::is_space(c) || matches!(c, '>' | '*' | '#' | '-'));
        let rest = strip_ascii_ci(rest, "deliverable")?;
        let rest = rest.trim_start_matches(js::is_space).strip_prefix(':')?;
        let rest = rest.trim_start_matches(js::is_space);
        let rest = rest.strip_prefix('`').unwrap_or(rest);
        let end = rest
            .find(|c: char| js::is_space(c) || matches!(c, '`' | '\'' | '"' | ',' | ';'))
            .unwrap_or(rest.len());
        rest.get(..end).filter(|p| !p.is_empty())
    })
}

/// The record id of `/^\s*owner:\s*(r57-\d{4})\b/m` in a prompt, from its first match.
#[must_use]
pub fn owner_id(prompt: &str) -> Option<&str> {
    line_starts(prompt).find_map(|at| {
        let rest = prompt
            .get(at..)?
            .trim_start_matches(js::is_space)
            .strip_prefix("owner:")?
            .trim_start_matches(js::is_space);
        let id = rest.get(..8)?;
        let digits = id.strip_prefix("r57-")?;
        let next = rest.get(8..)?.chars().next();
        (digits.bytes().all(|b| b.is_ascii_digit()) && !next.is_some_and(is_word)).then_some(id)
    })
}

/// Where paths are read from: the root (the project in kit mode, else `CREEP_GATE_ROOT` or the clone) and kit mode.
#[derive(Debug)]
pub struct Place<'k> {
    /// `ROOT`.
    pub root: PathBuf,
    /// `ROOTS`: the root (and in kit mode its real path) with forward slashes, in lower case, with a final `/`.
    roots: Vec<String>,
    /// Kit mode's folders, with `--harness-kit`.
    pub kit: Option<&'k Kit>,
}

impl<'k> Place<'k> {
    /// The place for a root and kit mode.
    #[must_use]
    pub fn new(root: PathBuf, kit: Option<&'k Kit>) -> Self {
        let mut all = vec![root.clone()];
        if kit.is_some() {
            all.push(paths::real_of(&root));
        }
        let roots = all
            .iter()
            .map(|r| format!("{}/", paths::slashes(r).to_lowercase()))
            .collect();
        Self { root, roots, kit }
    }

    /// `norm(p)`: forward slashes, lower case, the root taken off the front, a leading `./` dropped.
    #[must_use]
    pub fn norm(&self, p: &str) -> String {
        let mut s = p.replace('\\', "/").to_lowercase();
        let hit = if self.kit.is_some() {
            self.roots.iter().find(|r| s.starts_with(r.as_str()))
        } else {
            self.roots.first().filter(|r| s.starts_with(r.as_str()))
        };
        if let Some(r) = hit {
            s = s.get(r.len()..).unwrap_or("").to_owned();
        } else if self.kit.is_some() && (s.starts_with('/') || is_drive_path(&s)) {
            // An absolute path through another link to the project.
            if let Some(rel) = paths::under(Path::new(p), &self.root) {
                s = rel.to_lowercase();
            }
        }
        match s.strip_prefix("./") {
            Some(rest) => rest.to_owned(),
            None => s,
        }
    }

    /// `isBrief(p)`: a path in a `brief/` or `briefs/` folder, or a file whose name holds `brief` and ends `.md`.
    #[must_use]
    pub fn is_brief(&self, p: &str) -> bool {
        let n = self.norm(p);
        let in_folder = ["brief/", "briefs/"]
            .iter()
            .any(|f| n.starts_with(f) || n.contains(&format!("/{f}")));
        let named = n.strip_suffix(".md").is_some_and(|stem| {
            let name = stem.rsplit('/').next().unwrap_or(stem);
            name.contains("brief")
        });
        in_folder || named
    }

    /// `isContext(p)`: a record-book file, or `CLAUDE.md`, `AGENTS.md`, `START-HERE.md`, `INDEX.md` anywhere.
    #[must_use]
    pub fn is_context(&self, p: &str) -> bool {
        let n = self.norm(p);
        n.starts_with("library/")
            || ["claude.md", "agents.md", "start-here.md", "index.md"]
                .iter()
                .any(|f| n == *f || n.ends_with(&format!("/{f}")))
    }

    /// `targetOf(prompt)`: the first path in the prompt that is not a brief or a context file, else the first such
    /// path in a brief the prompt names; `None` when there is none.
    #[must_use]
    pub fn target_of(&self, rx: &Patterns, prompt: &str) -> Option<String> {
        let ps: Vec<&str> = rx
            .paths_in(prompt)
            .filter(|p| !self.is_context(p))
            .collect();
        if let Some(t) = ps.iter().find(|p| !self.is_brief(p)) {
            return Some(self.norm(t));
        }
        for b in ps.iter().filter(|p| self.is_brief(p)) {
            for f in self.brief_files(b) {
                let text = read_text(&f);
                let found = rx
                    .paths_in(&text)
                    .find(|p| !self.is_brief(p) && !self.is_context(p));
                if let Some(bt) = found {
                    return Some(self.norm(bt));
                }
            }
        }
        None
    }

    /// The files a brief named in a prompt may be.
    fn brief_files(&self, b: &str) -> Vec<PathBuf> {
        if is_drive_path(b) {
            return vec![PathBuf::from(b)];
        }
        match self.kit {
            Some(k) => {
                let name = Path::new(b)
                    .file_name()
                    .map(|n| n.to_string_lossy().into_owned())
                    .unwrap_or_default();
                vec![
                    paths::resolve(&self.root, &[b]),
                    paths::resolve(&k.state, &[b]),
                    paths::resolve(&k.briefs, &[&name]),
                ]
            }
            None => vec![
                paths::resolve(&self.root, &[b]),
                paths::resolve(&self.root, &["research-tree", "build", b]),
            ],
        }
    }
}

/// A path that starts with a drive letter and a colon (`/^[A-Za-z]:/`).
fn is_drive_path(s: &str) -> bool {
    let mut b = s.bytes();
    b.next().is_some_and(|c| c.is_ascii_alphabetic()) && b.next() == Some(b':')
}

/// `readFileSync(p, 'utf8')` in a `try`: the text, or empty when it cannot be read.
#[must_use]
pub fn read_text(p: &Path) -> String {
    std::fs::read(p)
        .map(|b| String::from_utf8_lossy(&b).into_owned())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rx() -> Option<Patterns> {
        Patterns::new().ok()
    }

    #[test]
    fn the_patterns_compile() {
        assert!(rx().is_some());
    }

    #[test]
    fn kind_is_read_before_the_colon_in_ascii_only() {
        assert_eq!(kind_of("  Build-Invariant : x"), "build-invariant");
        assert_eq!(kind_of("\u{FEFF}refute: x"), "refute");
        assert_eq!(kind_of("\u{85}refute: x"), "");
        assert_eq!(kind_of("no colon here"), "");
    }

    #[test]
    fn review_words_fold_only_ascii_letters() {
        let Some(r) = rx() else { return };
        assert!(r.is_review("analyse: CHECK the page", ""));
        // The Kelvin sign and the long s fold to k and s in Unicode, not in a JavaScript pattern without `u`.
        assert!(!r.is_review("analyse: chec\u{212A} the page", ""));
        assert!(!r.is_review("analyse: lense\u{17F}", ""));
        assert!(!r.is_review("build: check the page", ""));
        assert!(r.is_review("build: x", "kind  refute"));
    }

    #[test]
    fn breaking_is_not_counted_after_non() {
        assert!(breaking("Fold the breaking findings"));
        assert!(!breaking("Fold the non-breaking findings"));
        assert!(!breaking("Fold the NON BREAKING findings"));
        assert!(!breaking("unbreaking"));
        assert!(breaking("non-breaking, and one breaking"));
    }

    #[test]
    fn deliverable_line_is_found_at_any_line_start() {
        assert_eq!(
            deliverable_of("Build it.\r> **Deliverable:** x"),
            Some("**")
        );
        assert_eq!(
            deliverable_of("Build it.\u{2028}- Deliverable : `docs/x/page.html`, then"),
            Some("docs/x/page.html")
        );
        assert_eq!(deliverable_of("say deliverable: x"), None);
        assert_eq!(deliverable_of("deliverable: ``x"), None);
    }

    #[test]
    fn owner_record_id_needs_four_digits_and_a_boundary() {
        assert_eq!(owner_id("x\n  owner: r57-0071\nmore"), Some("r57-0071"));
        assert_eq!(owner_id("owner: r57-00712"), None);
        assert_eq!(owner_id("Owner: r57-0071"), None);
    }

    #[test]
    fn a_brief_is_a_briefs_folder_or_a_brief_markdown_file() {
        let p = Place::new(paths::cwd().join("root"), None);
        assert!(p.is_brief("research-tree/build/briefs/X.md"));
        assert!(p.is_brief("docs/MY-BRIEF-2.md"));
        assert!(!p.is_brief("docs/brief-notes/x.md"));
        assert!(p.is_context("library/INDEX.md"));
        assert!(p.is_context("x/CLAUDE.md"));
    }
}
