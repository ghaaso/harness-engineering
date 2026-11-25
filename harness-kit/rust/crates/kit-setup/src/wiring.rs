//! The kit's hook entries in a settings file: which programs, how each is wired, how the kit's own entries are
//! found again (the mark `--harness-kit` as a word in the command) and taken out.

use crate::json::J;
use kit_core::js;

/// The argument that marks the kit's entries.
pub const MARK: &str = "--harness-kit";
/// `.exe` on Windows.
pub const EXE: &str = std::env::consts::EXE_SUFFIX;

/// One kit hook and where it is wired.
#[derive(Debug)]
pub struct Hook {
    /// The hook event.
    pub event: &'static str,
    /// The matcher; `None` for an event without one.
    pub matcher: Option<&'static str>,
    /// The hook's name.
    pub hook: &'static str,
    /// Its program.
    pub program: &'static str,
    /// True for the hook that takes `--no-usage-tool`.
    pub usage: bool,
}

/// The kit hooks, in the order they run: count-gate before fanout-gate (count-gate reads a later hook's refusal).
pub static KIT: [Hook; 6] = [
    Hook {
        event: "SessionStart",
        matcher: None,
        hook: "kit-start",
        program: "kit-start",
        usage: false,
    },
    Hook {
        event: "PreToolUse",
        matcher: Some("*"),
        hook: "window-ceiling",
        program: "kit-window-ceiling",
        usage: false,
    },
    Hook {
        event: "PreToolUse",
        matcher: Some("*"),
        hook: "tier-hook",
        program: "kit-tier-hook",
        usage: false,
    },
    Hook {
        event: "PreToolUse",
        matcher: Some("Agent|Task|SendMessage"),
        hook: "count-gate",
        program: "kit-count-gate",
        usage: false,
    },
    Hook {
        event: "PreToolUse",
        matcher: Some("Agent|Task"),
        hook: "fanout-gate",
        program: "kit-fanout-gate",
        usage: true,
    },
    Hook {
        event: "PreToolUse",
        matcher: Some("Agent|Task"),
        hook: "creep-gate",
        program: "kit-creep-gate",
        usage: false,
    },
];

/// The kit's commands that she runs herself, by their built paths, and what each does.
pub const COMMANDS: [(&str, &str); 4] = [
    (
        "kit-unit",
        "units in their own copies of the project, and their landing",
    ),
    ("kit-check", "the project's test files side by side"),
    ("kit-queue", "the queue for heavy commands"),
    ("kit-tokens", "the tokens a session and its helpers spent"),
];

/// `<clone>/harness-kit/rust/target/release/<program>[.exe]`.
#[must_use]
pub fn program_path(clone: &str, program: &str) -> String {
    format!("{clone}/harness-kit/rust/target/release/{program}{EXE}")
}

/// The command a hook is wired with.
#[must_use]
pub fn command_for(clone: &str, project: &str, k: &Hook, no_usage: bool) -> String {
    format!(
        "\"{}\" {MARK} \"--clone={clone}\" \"--project={project}\"{}",
        program_path(clone, k.program),
        if k.usage && no_usage {
            " --no-usage-tool"
        } else {
            ""
        }
    )
}

/// True when the command holds the mark as a word (white space or an end on each side).
#[must_use]
pub fn has_mark(command: &str) -> bool {
    command.match_indices(MARK).any(|(i, _)| {
        let before = command.get(..i).and_then(|s| s.chars().next_back());
        let after = command
            .get(i.saturating_add(MARK.len())..)
            .and_then(|s| s.chars().next());
        before.is_none_or(js::is_space) && after.is_none_or(js::is_space)
    })
}

/// A kit entry: an object whose `command` is text holding the mark.
#[must_use]
pub fn is_ours(h: &J) -> bool {
    h.get("command").and_then(J::as_str).is_some_and(has_mark)
}

/// Node's `path.basename`: the last name, separators at the end ignored (`\` too on Windows).
fn basename(p: &str) -> &str {
    let sep = |c: char| c == '/' || (cfg!(windows) && c == '\\');
    let t = p.trim_end_matches(sep);
    t.rsplit(sep).next().unwrap_or(t)
}

/// Which kit hook a command runs: its first word's file name, `kit-<hook>[.exe]` or (old) `<hook>.mjs`; an optional
/// `node` and spaces before it; the word in double quotes or up to white space.
#[must_use]
pub fn hook_of(command: &str) -> Option<&'static str> {
    let t = command.trim_start_matches(js::is_space);
    let after_node = t.strip_prefix("node").and_then(|rest| {
        let r = rest.trim_start_matches(js::is_space);
        (r.len() < rest.len()).then_some(r)
    });
    let first = after_node.unwrap_or(t);
    let quoted = first
        .strip_prefix('"')
        .and_then(|r| r.split_once('"'))
        .map(|(inside, _)| inside)
        .filter(|s| !s.is_empty());
    let word = quoted.or_else(|| {
        let from = match after_node {
            Some(r) if !r.is_empty() => r,
            _ => t,
        };
        from.split(js::is_space).next().filter(|w| !w.is_empty())
    })?;
    let b = basename(word);
    let b = if b.to_ascii_lowercase().ends_with(".exe") {
        b.get(..b.len().saturating_sub(4)).unwrap_or(b)
    } else {
        b
    };
    let b = b.strip_suffix(".mjs").unwrap_or(b);
    KIT.iter()
        .find(|k| k.program == b || k.hook == b)
        .map(|k| k.hook)
}

/// Every marked entry taken out; a group or event list that only the marked entries filled is dropped, and `hooks`
/// too when they emptied it. Every other key stays as it was.
#[must_use]
pub fn strip_kit(settings: &J) -> J {
    let mut s = settings.clone();
    let mut took = false;
    let emptied = {
        let Some(J::Obj(events)) = s.get_mut("hooks") else {
            return s;
        };
        let mut out = Vec::with_capacity(events.len());
        for (ev, groups) in std::mem::take(events) {
            let J::Arr(gs) = groups else {
                out.push((ev, groups));
                continue;
            };
            let n = gs.len();
            let mut kept = Vec::with_capacity(n);
            for g in gs {
                let Some(hooks) = g.get("hooks").and_then(J::as_arr) else {
                    kept.push(g);
                    continue;
                };
                let hs: Vec<J> = hooks.iter().filter(|h| !is_ours(h)).cloned().collect();
                if hs.len() == hooks.len() {
                    kept.push(g);
                    continue;
                }
                took = true;
                if !hs.is_empty() {
                    let mut g2 = g;
                    g2.set("hooks", J::Arr(hs));
                    kept.push(g2);
                }
            }
            if !kept.is_empty() || n == 0 {
                out.push((ev, J::Arr(kept)));
            }
        }
        *events = out;
        events.is_empty()
    };
    if took && emptied {
        s.remove("hooks");
    }
    s
}

/// The marked entries taken out, then the six added fresh.
#[must_use]
pub fn add_kit(settings: &J, clone: &str, project: &str, no_usage: bool) -> J {
    let mut s = strip_kit(settings);
    if !matches!(s.get("hooks"), Some(J::Obj(_) | J::Arr(_))) {
        s.set("hooks", J::obj());
    }
    for k in &KIT {
        let hooks = J::Arr(vec![J::Obj(vec![
            ("type".to_owned(), J::str("command")),
            (
                "command".to_owned(),
                J::Str(command_for(clone, project, k, no_usage)),
            ),
        ])]);
        let entry = match k.matcher {
            None => J::Obj(vec![("hooks".to_owned(), hooks)]),
            Some(m) => J::Obj(vec![
                ("matcher".to_owned(), J::str(m)),
                ("hooks".to_owned(), hooks),
            ]),
        };
        if let Some(h) = s.get_mut("hooks") {
            if !matches!(h.get(k.event), Some(J::Arr(_))) {
                h.set(k.event, J::Arr(Vec::new()));
            }
            if let Some(J::Arr(list)) = h.get_mut(k.event) {
                list.push(entry);
            }
        }
    }
    s
}

/// A marked entry as found in a settings file.
#[derive(Debug)]
pub struct Entry {
    /// Its event.
    pub event: String,
    /// Its group's matcher (`None` when missing or `null`).
    pub matcher: Option<J>,
    /// Its command.
    pub command: String,
    /// The kit hook it runs, if any.
    pub hook: Option<&'static str>,
}

/// Every marked entry, in the file's order.
#[must_use]
pub fn kit_entries(s: &J) -> Vec<Entry> {
    let mut out = Vec::new();
    let Some(J::Obj(events)) = s.get("hooks") else {
        return out;
    };
    for (ev, groups) in events {
        for g in groups.as_arr().unwrap_or_default() {
            for h in g.get("hooks").and_then(J::as_arr).unwrap_or_default() {
                if let (true, Some(command)) = (is_ours(h), h.get("command").and_then(J::as_str)) {
                    out.push(Entry {
                        event: ev.clone(),
                        matcher: g.get("matcher").filter(|m| **m != J::Null).cloned(),
                        command: command.to_owned(),
                        hook: hook_of(command),
                    });
                }
            }
        }
    }
    out
}
