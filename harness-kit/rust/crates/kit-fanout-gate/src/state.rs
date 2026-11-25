//! The session's state file: the `.md` file that names the session as `Session <first 8 characters>`, with the
//! cap, the meter line, the Fable meter line and every session it names.

use crate::Where;
use crate::fsx;
use crate::jsv::{Js, Thrown};
use crate::patterns::{self, Patterns};
use kit_core::js;
use std::path::PathBuf;
use std::time::UNIX_EPOCH;

/// What the state file says.
#[derive(Debug, Clone, PartialEq)]
pub struct State {
    /// The file.
    pub path: PathBuf,
    /// The file below the root, with forward slashes (as the messages name it).
    pub rel: String,
    /// The last `Cap ... <n> M tokens`, in tokens.
    pub cap: Option<f64>,
    /// The last `Meter line ... <n> %`.
    pub line: Option<f64>,
    /// The last `Fable meter line ... <n> %`.
    pub fable_line: Option<f64>,
    /// Every `session <8 hex digits>` it names, lower case, each once, in order.
    pub sessions: Vec<String>,
}

/// The time a file was last changed, in nanoseconds either side of 1970 (`statSync(p).mtimeMs`, finer).
fn mtime(p: &std::path::Path) -> Option<i128> {
    let t = std::fs::metadata(p).ok()?.modified().ok()?;
    match t.duration_since(UNIX_EPOCH) {
        Ok(d) => i128::try_from(d.as_nanos()).ok(),
        Err(e) => i128::try_from(e.duration().as_nanos())
            .ok()
            .and_then(i128::checked_neg),
    }
}

/// `stateFile(sess8)`: the most recently changed `.md` file of the state folder that names the session.
///
/// # Errors
/// Where the JavaScript throws: a file that matched but cannot be stat'ed while the matches are sorted.
pub fn state_file(p: &Patterns, w: &Where<'_>, sess8: &str) -> Js<Option<State>> {
    let dir = match w.kit {
        Some(k) => k.state.clone(),
        None => w.root.join("research-tree").join("build"),
    };
    let Some(entries) = fsx::list(&dir) else {
        return Ok(None);
    };
    let re =
        Patterns::session(sess8).map_err(|e| Thrown(format!("Invalid regular expression: {e}")))?;
    let hits: Vec<PathBuf> = entries
        .iter()
        .filter(|e| e.name.ends_with(".md"))
        .map(|e| dir.join(&e.name))
        .filter(|f| re.is_match(&fsx::read_text(f).unwrap_or_default()))
        .collect();
    let path = if hits.len() > 1 {
        let mut timed = Vec::with_capacity(hits.len());
        for h in hits {
            let Some(t) = mtime(&h) else {
                return Err(Thrown(format!(
                    "ENOENT: no such file or directory, stat '{}'",
                    h.display()
                )));
            };
            timed.push((t, h));
        }
        // Newest first; a stable sort keeps the listing order of equal times, as the JavaScript's does.
        timed.sort_by_key(|t| std::cmp::Reverse(t.0));
        timed.into_iter().next().map(|(_, h)| h)
    } else {
        hits.into_iter().next()
    };
    let Some(path) = path else {
        return Ok(None);
    };
    let text = fsx::read_text(&path).unwrap_or_default();
    let (mut cap, mut line, mut fable_line) = (None, None, None);
    for l in patterns::split_lines(&text) {
        let s = p.lead.find(l).map_or(l, |m| l.get(m.end()..).unwrap_or(""));
        if p.cap_line.is_match(s)
            && let Some(m) = p.cap_num.captures(s)
        {
            let n = m.get(1).map_or(f64::NAN, |x| patterns::number(x.as_str()));
            let u = m.get(2).map_or(f64::NAN, |x| patterns::unit(x.as_str()));
            cap = Some(n * u);
        }
        if let Some(m) = p.meter.captures(s).and_then(|m| m.get(1)) {
            line = Some(patterns::number(m.as_str()));
        }
        if let Some(m) = p.fable.captures(s).and_then(|m| m.get(1)) {
            fable_line = Some(patterns::number(m.as_str()));
        }
    }
    let mut sessions: Vec<String> = Vec::new();
    for c in p.sessions.captures_iter(&text) {
        if let Some(s) = c.get(1).map(|x| x.as_str().to_ascii_lowercase())
            && !sessions.contains(&s)
        {
            sessions.push(s);
        }
    }
    // `path.slice(ROOT.length + 1)`, counted in UTF-16 units as JavaScript counts.
    let root_len = js::len(&w.root.to_string_lossy()).saturating_add(1);
    let units = js::utf16(&path.to_string_lossy());
    let rel = String::from_utf16_lossy(units.get(root_len..).unwrap_or(&[])).replace('\\', "/");
    Ok(Some(State {
        path,
        rel,
        cap,
        line,
        fable_line,
        sessions,
    }))
}
