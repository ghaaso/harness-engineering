//! What passes above the hard line: the calls that serve the hand-over (its files, git, the journal, the clock, a
//! successor, a hand-back), and which session a state file names as coordinating.

use crate::jsx;
use kit_core::context::Kit;
use kit_core::js;
use kit_core::paths;
use kit_core::regex::{self, Regex};
use serde_json::{Map, Value};
use std::path::{Path, PathBuf};

/// JavaScript's `\s` as a class (it holds U+FEFF and not U+0085, unlike the `regex` crate's `\s`).
const S: &str = r"[\t\n\x0B\x0C\r \xA0\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}]";
/// JavaScript's `\S`.
const N: &str = r"[^\t\n\x0B\x0C\r \xA0\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}]";
/// JavaScript's `.` (it stops at `\r`, U+2028 and U+2029 as well as `\n`).
const D: &str = r"[^\n\r\x{2028}\x{2029}]";
/// A finder of a here-document or here-string: its start and end.
type Finder = fn(&[char]) -> Option<(usize, usize)>;

/// The patterns of the hook, built once.
#[derive(Debug)]
pub struct Patterns {
    /// The commands that may run above the line, one segment at a time (`SEG_OK`; a `("?)…\1` pattern is split
    /// into its quoted and unquoted forms).
    seg_ok: Vec<Regex>,
    /// A here-document is allowed only as the message of a git commit.
    git_commit: Regex,
    /// `\s\d?>&\d`.
    dup: Regex,
    /// `\s\d?>\s*(/dev/null|$null|nul)\b`, case-insensitive.
    null_out: Regex,
    /// `\s+<<-?\s*\S+$`.
    doc_tail: Regex,
    /// The words that tell a helper to stop.
    stop_words: Regex,
}

impl Patterns {
    /// Builds the patterns.
    ///
    /// # Errors
    /// Only if a pattern of this file does not compile (a fault the unit tests catch).
    pub fn new() -> Result<Self, regex::Error> {
        let tail = format!("(?:{S}{D}*)?$");
        let journal = r"(?:N*[\\/])?tools[\\/]journal\.mjs".replace('N', N);
        let ceiling = r"(?:N*[\\/])?\.claude[\\/]hooks[\\/]window-ceiling\.mjs"
            .replace("N*", &format!("{N}*"));
        let ceiling_end = format!("{S}+(?:--test-off|--show{S}{D}*)$");
        let seg_ok = [
            format!("^cd(?:{S}+{D}*)?$"),
            format!("^git(?:{S}+-c{S}+{N}+)*{S}+(?:status|add|commit|rev-parse|log){tail}"),
            format!("^node{S}+\"{journal}\"{tail}"),
            format!("^node{S}+{journal}{tail}"),
            format!("^date{tail}"),
            format!("^node{S}+\"{ceiling}\"{ceiling_end}"),
            format!("^node{S}+{ceiling}{ceiling_end}"),
            format!("^(?:head|tail)(?:{S}+-{N}+)*$"),
        ];
        Ok(Self {
            seg_ok: seg_ok
                .iter()
                .map(|p| Regex::new(p))
                .collect::<Result<_, _>>()?,
            git_commit: Regex::new(&format!("git(?:{S}+-c{S}+{N}+)*{S}+commit(?-u:\\b)"))?,
            dup: Regex::new(&format!("{S}[0-9]?>&[0-9]"))?,
            null_out: Regex::new(&format!(
                "{S}[0-9]?>{S}*(?i-u:/dev/null|\\$null|nul)(?-u:\\b)"
            ))?,
            doc_tail: Regex::new(&format!("{S}+<<-?{S}*{N}+$"))?,
            stop_words: Regex::new(r"(?i-u)\b(?:stop|checkpoint|hand[- ]?over|limit|wrap up)\b")?,
        })
    }
}

/// Where the hook stands: the root (the clone, or the project in kit mode), the process's folder, kit mode.
#[derive(Debug)]
pub struct Where<'a> {
    /// The clone, or the project in kit mode.
    pub root: &'a Path,
    /// The process's current folder.
    pub cwd: &'a Path,
    /// Kit mode's folders.
    pub kit: Option<&'a Kit>,
}

fn is_word(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '_'
}

fn is_terminator(c: char) -> bool {
    matches!(c, '\n' | '\r' | '\u{2028}' | '\u{2029}')
}

/// JavaScript's `\b` (without the `u` flag) at position `i` of `c`.
fn boundary(c: &[char], i: usize) -> bool {
    let before = i
        .checked_sub(1)
        .and_then(|k| c.get(k))
        .is_some_and(|ch| is_word(*ch));
    let after = c.get(i).is_some_and(|ch| is_word(*ch));
    before != after
}

/// `lit` (lower-case ASCII) at position `i` of `c`, ASCII letters in either case.
fn ci_at(c: &[char], i: usize, lit: &str) -> bool {
    lit.chars().enumerate().all(|(k, l)| {
        i.checked_add(k)
            .and_then(|p| c.get(p))
            .is_some_and(|ch| ch.to_ascii_lowercase() == l)
    })
}

/// `lit` at position `i` of `c`, exactly.
fn at(c: &[char], i: usize, lit: &[char]) -> bool {
    i.checked_add(lit.len())
        .and_then(|e| c.get(i..e))
        .is_some_and(|s| s == lit)
}

/// The end of the run of white space from `i`.
fn skip_space(c: &[char], mut i: usize) -> usize {
    while c.get(i).is_some_and(|ch| js::is_space(*ch)) {
        i = i.saturating_add(1);
    }
    i
}

/// The here-document pattern `<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2\s*(\n|$)` at `i`: the end of the match.
fn heredoc_at(c: &[char], i: usize) -> Option<usize> {
    let mut p = i.checked_add(2)?;
    if c.get(p) == Some(&'-') {
        p = p.saturating_add(1);
    }
    p = skip_space(c, p);
    let quote = c.get(p).copied().filter(|q| *q == '\'' || *q == '"');
    if quote.is_some() {
        p = p.saturating_add(1);
    }
    let ws = p;
    let mut we = p;
    while c.get(we).is_some_and(|ch| is_word(*ch)) {
        we = we.saturating_add(1);
    }
    if we == ws {
        return None;
    }
    let newline = c
        .get(we..)?
        .iter()
        .position(|ch| *ch == '\n')
        .and_then(|k| we.checked_add(k))?;
    let shortest = if quote.is_some() {
        we
    } else {
        ws.saturating_add(1)
    };
    let mut wend = we;
    while wend >= shortest {
        if quote.is_none_or(|q| c.get(wend) == Some(&q)) {
            let word = c.get(ws..wend)?;
            let mut k = newline.saturating_add(1);
            while k < c.len() {
                if c.get(k) == Some(&'\n') {
                    let q = skip_space(c, k.saturating_add(1));
                    if at(c, q, word) {
                        let a = q.saturating_add(word.len());
                        let e = skip_space(c, a);
                        if e == c.len() {
                            return Some(e);
                        }
                        if let Some(nl) = (a..e).rev().find(|x| c.get(*x) == Some(&'\n')) {
                            return Some(nl.saturating_add(1));
                        }
                    }
                }
                k = k.saturating_add(1);
            }
        }
        wend = wend.saturating_sub(1);
        if wend == 0 {
            break;
        }
    }
    None
}

/// The first here-document of `c`: start and end.
fn find_heredoc(c: &[char]) -> Option<(usize, usize)> {
    (0..c.len())
        .filter(|i| at(c, *i, &['<', '<']))
        .find_map(|i| heredoc_at(c, i).map(|e| (i, e)))
}

/// The first PowerShell here-string `@'\r?\n[\s\S]*?\r?\n'@` of `c`: start and end.
fn find_herestring(c: &[char]) -> Option<(usize, usize)> {
    for i in 0..c.len() {
        if !at(c, i, &['@', '\'']) {
            continue;
        }
        let mut p = i.saturating_add(2);
        if c.get(p) == Some(&'\r') {
            p = p.saturating_add(1);
        }
        if c.get(p) != Some(&'\n') {
            continue;
        }
        p = p.saturating_add(1);
        for k in p..c.len() {
            if at(c, k, &['\r', '\n', '\'', '@']) {
                return Some((i, k.saturating_add(4)));
            }
            if at(c, k, &['\n', '\'', '@']) {
                return Some((i, k.saturating_add(3)));
            }
        }
    }
    None
}

/// `c.split(/&&|\|\||;|\||\n/)`.
fn split_segments(c: &str) -> Vec<String> {
    let mut segs = Vec::new();
    let mut cur = String::new();
    let mut it = c.chars().peekable();
    while let Some(ch) = it.next() {
        match ch {
            '&' if it.peek() == Some(&'&') => {
                it.next();
                segs.push(std::mem::take(&mut cur));
            }
            '|' => {
                it.next_if_eq(&'|');
                segs.push(std::mem::take(&mut cur));
            }
            ';' | '\n' => segs.push(std::mem::take(&mut cur)),
            _ => cur.push(ch),
        }
    }
    segs.push(cur);
    segs
}

/// A command that may run above the line: git status, add, commit, rev-parse or log; cd; date; the journal tool;
/// `head`/`tail` behind a pipe; ending a live check. A here-document or here-string only as a commit's message.
#[must_use]
pub fn command_ok(cmd: Option<&Value>, pats: &Patterns) -> bool {
    let text = cmd
        .filter(|v| js::truthy(v))
        .map(js::to_string)
        .unwrap_or_default();
    let mut c: Vec<char> = text.chars().collect();
    let finders: [Finder; 2] = [find_heredoc, find_herestring];
    for find in finders {
        while let Some((s, e)) = find(&c) {
            let before = c.get(..s).unwrap_or_default();
            let line_start = before
                .iter()
                .rposition(|ch| *ch == '\n')
                .map_or(0, |k| k.saturating_add(1));
            let head: String = c.get(line_start..s).unwrap_or_default().iter().collect();
            if !pats.git_commit.is_match(&head) {
                return false;
            }
            let mut next: Vec<char> = c.get(..s).unwrap_or_default().to_vec();
            next.extend(" HEREDOC\n".chars());
            next.extend_from_slice(c.get(e..).unwrap_or_default());
            c = next;
        }
    }
    let c: String = c.iter().collect();
    if c.contains("$(") || c.contains('`') {
        return false;
    }
    let c = pats.dup.replace_all(&c, " ").into_owned();
    let c = pats.null_out.replace_all(&c, " ").into_owned();
    if c.contains('>') {
        return false;
    }
    let plain: Vec<char> = c.replace(" HEREDOC", "").chars().collect();
    let lone_lt = plain
        .iter()
        .enumerate()
        .any(|(i, ch)| *ch == '<' && plain.get(i.saturating_add(1)) != Some(&'<'));
    if lone_lt {
        return false;
    }
    let segs: Vec<String> = split_segments(&c)
        .iter()
        .map(|s| js::trim(s).to_owned())
        .filter(|s| !s.is_empty())
        .collect();
    if segs.is_empty() {
        return false;
    }
    segs.iter().all(|sg| {
        let x = sg.strip_suffix(" HEREDOC").unwrap_or(sg);
        let x = pats.doc_tail.replacen(x, 1, "");
        let x = js::trim(&x);
        pats.seg_ok.iter().any(|re| re.is_match(x))
    })
}

/// `resolve(cwd || root, x)` or `resolve(x)` on the path text `p`, with forward slashes; `/c/...` read as `c:/...`
/// when `drive` is set.
///
/// # Errors
/// A `cwd` that is not a string where it is needed (JavaScript's `resolve` throws there).
fn abs_of(p: &str, j: &Value, w: &Where<'_>, drive: bool) -> Result<String, String> {
    let mut x = js::trim(p).replace('\\', "/");
    let b = x.as_bytes();
    if drive
        && b.first() == Some(&b'/')
        && b.get(1).is_some_and(u8::is_ascii_alphabetic)
        && b.get(2) == Some(&b'/')
    {
        let letter = b.get(1).copied().map(char::from).unwrap_or_default();
        x = format!("{letter}:/{}", x.get(3..).unwrap_or_default());
    }
    let b = x.as_bytes();
    let absolute = (b.first().is_some_and(u8::is_ascii_alphabetic)
        && b.get(1) == Some(&b':')
        && b.get(2) == Some(&b'/'))
        || x.starts_with('/');
    let out = if absolute {
        paths::resolve(w.cwd, &[&x])
    } else {
        let base = match j.get("cwd").filter(|v| js::truthy(v)) {
            None => w.root.to_string_lossy().into_owned(),
            Some(Value::String(s)) => s.clone(),
            Some(_) => {
                return Err(
                    "The \"paths[0]\" argument must be of type string (cwd is not a string)"
                        .to_owned(),
                );
            }
        };
        paths::resolve(w.cwd, &[&base, &x])
    };
    Ok(paths::slashes(&out))
}

/// `norm`: [`abs_of`] in lower case (`/c/` always read as a drive outside kit mode, only on Windows in it).
fn norm(p: &str, j: &Value, w: &Where<'_>) -> Result<String, String> {
    let drive = w.kit.is_none() || cfg!(windows);
    abs_of(p, j, w, drive).map(|x| x.to_lowercase())
}

/// A non-empty rest after a prefix whose first character is not a line terminator (`.+`).
fn some_line(rest: &str) -> bool {
    rest.chars().next().is_some_and(|c| !is_terminator(c))
}

/// `[^/]+\.md$` for the rest of a path.
fn brief_name(rest: &str) -> bool {
    !rest.contains('/') && rest.len() > 3 && rest.ends_with(".md")
}

/// Kit mode: a hand-over file of the project, by its path relative to it (real paths compared).
fn kit_handover(p: &str, j: &Value, w: &Where<'_>, kit: &Kit) -> Result<bool, String> {
    let abs = abs_of(p, j, w, cfg!(windows))?;
    let Some(rel) = paths::under(Path::new(&abs), &kit.project) else {
        return Ok(false);
    };
    let r = rel.to_lowercase();
    Ok(r.strip_prefix(".harness/").is_some_and(|rest| {
        (!rest.contains('/') && rest.ends_with("state.md"))
            || rest.strip_prefix("briefs/").is_some_and(brief_name)
            || rest.strip_prefix("units/").is_some_and(some_line)
    }))
}

/// `/\/appdata\/local\/claude-data\/[^/]+\/side-session-notes\/./`.
fn side_notes(x: &str) -> bool {
    const PRE: &str = "/appdata/local/claude-data/";
    x.char_indices().any(|(i, _)| {
        x.get(i..)
            .and_then(|s| s.strip_prefix(PRE))
            .is_some_and(|rest| {
                rest.find('/').filter(|k| *k > 0).is_some_and(|k| {
                    rest.get(k..)
                        .and_then(|s| s.strip_prefix("/side-session-notes/"))
                        .is_some_and(some_line)
                })
            })
    })
}

/// A hand-over file: a state file, a brief or a unit's result, the session's scratchpad, its side notes.
fn handover_path(p: Option<&Value>, j: &Value, w: &Where<'_>) -> Result<bool, String> {
    let Some(p) = p.filter(|v| js::truthy(v)) else {
        return Ok(false);
    };
    let p = js::to_string(p);
    if let Some(kit) = w.kit
        && kit_handover(&p, j, w, kit)?
    {
        return Ok(true);
    }
    let x = norm(&p, j, w)?;
    let r = format!("{}/", paths::slashes(w.root).to_lowercase());
    if let Some(sd) = j.get("scratchpad_dir").filter(|v| js::truthy(v)) {
        let sd = format!("{}/", norm(&js::to_string(sd), j, w)?.trim_end_matches('/'));
        if x.starts_with(&sd) {
            return Ok(true); // the session's own scratchpad (a commit message file)
        }
    }
    if side_notes(&x) {
        return Ok(true);
    }
    let Some(rel) = x.strip_prefix(&r) else {
        return Ok(false);
    };
    Ok(rel
        .strip_prefix("research-tree/build/")
        .is_some_and(|rest| {
            rest.strip_suffix("state.md").is_some_and(|pre| {
                pre.chars()
                    .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
            }) || rest.strip_prefix("briefs/").is_some_and(brief_name)
                || rest.strip_prefix("units/").is_some_and(some_line)
        }))
}

/// Why a call serves the hand-over, or `None` when it does not.
///
/// # Errors
/// Where the JavaScript throws (a `cwd` that is not a string, where a relative path needs it).
pub fn handover_call(
    j: &Value,
    w: &Where<'_>,
    pats: &Patterns,
) -> Result<Option<&'static str>, String> {
    let tool = j
        .get("tool_name")
        .filter(|v| js::truthy(v))
        .map(js::to_string)
        .unwrap_or_default();
    let empty = Value::Object(Map::new());
    let ti = j
        .get("tool_input")
        .filter(|v| v.is_object() || v.is_array())
        .unwrap_or(&empty);
    let named = |names: &[&str]| {
        names
            .iter()
            .any(|n| tool == *n || tool.strip_suffix(n).is_some_and(|h| h.ends_with("__")))
    };
    let file = |key: &str, why: &'static str| -> Result<Option<&'static str>, String> {
        Ok(handover_path(ti.get(key), j, w)?.then_some(why))
    };
    match tool.as_str() {
        "Write" | "Edit" | "MultiEdit" => return file("file_path", "hand-over file"),
        "NotebookEdit" => return file("notebook_path", "hand-over file"),
        "Read" => return file("file_path", "read of a hand-over file"),
        "Bash" | "PowerShell" => {
            return Ok(command_ok(ti.get("command"), pats).then_some("git, journal, clock"));
        }
        _ => {}
    }
    if named(&["start_session", "hand_off_to_session"]) {
        return Ok(Some("successor"));
    }
    if named(&["wrap_up", "update_plan"]) {
        return Ok(Some("closing box"));
    }
    Ok(match tool.as_str() {
        "SubagentHandback" => Some("helper hand-back"),
        "TaskStop" => Some("ending a helper"),
        "ToolSearch" => Some("loading a hand-over tool"),
        "AskUserQuestion" => Some("question to the owner"),
        "SendMessage" => {
            let text = match ti.get("message") {
                Some(Value::String(s)) => s.clone(),
                m => jsx::stringify(
                    m.filter(|v| js::truthy(v))
                        .or_else(|| ti.get("content").filter(|v| js::truthy(v)))
                        .unwrap_or(&Value::String(String::new())),
                ),
            };
            pats.stop_words
                .is_match(&text)
                .then_some("telling a helper to stop")
        }
        _ => None,
    })
}

/// A line that names the session (its first 8 characters `s8`) as `session <id>` and, before any other `kind`,
/// `kind orchestrate`: `\bsession\s+<s8>[0-9a-f-]*\b(?:(?!\bkind\b).)*\bkind\s+orchestrate`, case-insensitive.
fn names_coordinator(line: &str, s8: &str) -> bool {
    let c: Vec<char> = line.chars().collect();
    let kind_word =
        |k: usize| boundary(&c, k) && ci_at(&c, k, "kind") && boundary(&c, k.saturating_add(4));
    // From r: up to the first `\bkind\b` (no line terminator on the way), and there `kind\s+orchestrate`.
    let rest = |r: usize| {
        let mut k = r;
        loop {
            if kind_word(k) {
                break;
            }
            match c.get(k) {
                Some(ch) if !is_terminator(*ch) => k = k.saturating_add(1),
                _ => return false,
            }
        }
        let a = k.saturating_add(4);
        let q = skip_space(&c, a);
        q > a && ci_at(&c, q, "orchestrate")
    };
    (0..c.len()).any(|p| {
        if !boundary(&c, p) || !ci_at(&c, p, "session") {
            return false;
        }
        let a = p.saturating_add(7);
        let q = skip_space(&c, a);
        if q == a || !ci_at(&c, q, s8) {
            return false;
        }
        let r0 = q.saturating_add(8);
        let mut rmax = r0;
        while c
            .get(rmax)
            .is_some_and(|ch| ch.is_ascii_hexdigit() || *ch == '-')
        {
            rmax = rmax.saturating_add(1);
        }
        (r0..=rmax).any(|r| boundary(&c, r) && rest(r))
    })
}

/// The name of the file in `build` that names the session as coordinating, or `None`. Outside kit mode every
/// `.md` file directly in it is read; in kit mode only the `*state.md` files (any case).
#[must_use]
pub fn is_coordinator(session_id: Option<&Value>, build: &Path, kit: bool) -> Option<String> {
    let sid = session_id
        .filter(|v| js::truthy(v))
        .map(js::to_string)
        .unwrap_or_default();
    let head: Vec<char> = sid.chars().take(8).collect();
    if head.len() != 8 || !head.iter().all(char::is_ascii_hexdigit) {
        return None;
    }
    let s8: String = head.iter().map(char::to_ascii_lowercase).collect();
    let mut names: Vec<String> = std::fs::read_dir(build)
        .ok()?
        .filter_map(|e| e.ok().map(|e| e.file_name().to_string_lossy().into_owned()))
        .filter(|n| {
            if kit {
                n.len() >= 8
                    && n.get(n.len().saturating_sub(8)..)
                        .is_some_and(|t| t.eq_ignore_ascii_case("state.md"))
            } else {
                n.ends_with(".md")
            }
        })
        .collect();
    if !cfg!(windows) {
        names.sort(); // Node lists a folder sorted by bytes off Windows
    }
    for n in names {
        let Ok(bytes) = std::fs::read(build.join(&n)) else {
            continue;
        };
        let t = String::from_utf8_lossy(&bytes);
        if !t.to_lowercase().contains(&s8) {
            continue;
        }
        let pieces: Vec<&str> = t.split('\n').collect();
        let last = pieces.len().saturating_sub(1);
        for (i, l) in pieces.iter().enumerate() {
            let l = if i < last {
                l.strip_suffix('\r').unwrap_or(l)
            } else {
                l
            };
            if names_coordinator(l, &s8) {
                return Some(n);
            }
        }
    }
    None
}

/// The root as a path buffer (for callers that hold text).
#[must_use]
pub fn root_of(kit: Option<&Kit>, clone: &Path) -> PathBuf {
    kit.map_or_else(|| clone.to_path_buf(), |k| k.project.clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ok(cmd: &str) -> bool {
        Patterns::new().is_ok_and(|p| command_ok(Some(&Value::String(cmd.to_owned())), &p))
    }

    #[test]
    fn the_patterns_compile() {
        assert!(Patterns::new().is_ok());
    }

    #[test]
    fn git_journal_clock_and_a_commit_message_pass() {
        for c in [
            "git status",
            "git -c core.longpaths=true commit -F - <<'EOF'\nhand-over; it's done > here\n\nx\nEOF",
            "node tools/journal.mjs add --dry-run 2>&1",
            "git log --oneline -3 | head -3",
            "date -u",
            "git commit -m @'\nhand-over\n'@",
            "node \"C:/x/.claude/hooks/window-ceiling.mjs\" --show \"C:/x/y.jsonl\"",
            "cd /x && git add a && git commit -F msg.txt",
        ] {
            assert!(ok(c), "{c}");
        }
    }

    #[test]
    fn other_commands_and_redirections_are_refused() {
        for c in [
            "npm test",
            "git status; rm -rf x",
            "git commit -m \"$(cat x)\"",
            "cat foo > x",
            "cat <<'EOF' > x\nx\nEOF",
            "git log | head file.txt",
            "git push",
            "node .claude/hooks/window-ceiling.mjs --test x 0.9 600",
            "",
        ] {
            assert!(!ok(c), "{c}");
        }
    }

    #[test]
    fn a_heredoc_needs_a_line_before_its_end_word() {
        // JavaScript's pattern wants "\n" after the header line and again before the end word.
        assert!(!ok("git commit -F - <<EOF\nEOF"));
        assert!(ok("git commit -F - <<EOF\nx\nEOF"));
    }

    #[test]
    fn a_coordinator_line_is_found_and_a_later_kind_is_not() {
        assert!(names_coordinator(
            "Session 11111111 (test), Opus, kind orchestrate. Brief: x.",
            "11111111"
        ));
        assert!(names_coordinator(
            "Root session 44444444-2222-3333-4444-555555555555 (Opus, kind orchestrate)",
            "44444444"
        ));
        assert!(!names_coordinator(
            "Session 22222222 (test), Opus, kind build-invariant; started by session 11111111, kind orchestrate.",
            "22222222"
        ));
        assert!(!names_coordinator(
            "Session 11111111\u{2028} kind orchestrate",
            "11111111"
        ));
    }
}
