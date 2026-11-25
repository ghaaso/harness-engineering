//! The one way a hook program ends. `main` returns `outcome.finish()`; nothing else writes to standard output or
//! standard error and nothing calls `std::process::exit` (the workspace's lints deny both).

use crate::js;
use std::io::Write;
use std::process::ExitCode;

/// How a hook ends, and what it writes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Outcome {
    /// Exit 0, nothing written (the JavaScript's `process.exit(0)`).
    Pass,
    /// Exit 0, the text written to standard output as it is (no newline added).
    Say(String),
    /// Exit 2, the reason and a newline on standard error (`process.stderr.write(why + '\n'); process.exit(2)`).
    Refuse(String),
    /// Exit 0, `{"hookSpecificOutput":{"hookEventName":<event>,"additionalContext":<text>}}` on standard output with
    /// no newline, written as `JSON.stringify` writes it. The text is in UTF-16 units so that a text cut by
    /// JavaScript's `slice` (perhaps inside a surrogate pair) is written exactly as `JSON.stringify` writes it.
    Context {
        /// The hook event, for example `SessionStart`.
        event: String,
        /// The context text, as UTF-16 units (see [`js::utf16`]).
        text: Vec<u16>,
    },
    /// Exit 1, the text and a newline on standard error: the hook's own error, where its JavaScript one throws an
    /// uncaught exception (Node then exits 1 and Claude Code treats the hook as failed but not refusing).
    Fail(String),
}

impl Outcome {
    /// A [`Outcome::Context`] from ordinary text.
    #[must_use]
    pub fn context(event: &str, text: &str) -> Self {
        Self::Context {
            event: event.to_owned(),
            text: js::utf16(text),
        }
    }

    /// The exit code; also writes the outcome's text. A failed write (a closed pipe) is ignored, as Node ignores it.
    pub fn finish(self) -> ExitCode {
        let (code, out, err) = self.parts();
        if !out.is_empty() {
            let mut stdout = std::io::stdout().lock();
            stdout
                .write_all(out.as_bytes())
                .and_then(|()| stdout.flush())
                .unwrap_or_default();
        }
        if !err.is_empty() {
            let mut stderr = std::io::stderr().lock();
            stderr
                .write_all(err.as_bytes())
                .and_then(|()| stderr.flush())
                .unwrap_or_default();
        }
        ExitCode::from(code)
    }

    /// The exit code, the text for standard output and the text for standard error.
    #[must_use]
    pub fn parts(&self) -> (u8, String, String) {
        match self {
            Self::Pass => (0, String::new(), String::new()),
            Self::Say(text) => (0, text.clone(), String::new()),
            Self::Refuse(why) => (2, String::new(), format!("{why}\n")),
            Self::Context { event, text } => {
                let json = format!(
                    "{{\"hookSpecificOutput\":{{\"hookEventName\":{},\"additionalContext\":{}}}}}",
                    js::quote(event),
                    js::quote_utf16(text)
                );
                (0, json, String::new())
            }
            Self::Fail(why) => (1, String::new(), format!("{why}\n")),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_refusal_is_exit_two_with_one_line_on_stderr() {
        assert_eq!(
            Outcome::Refuse("no".to_owned()).parts(),
            (2, String::new(), "no\n".to_owned())
        );
    }

    #[test]
    fn a_context_is_the_session_start_object() {
        let (code, out, _) = Outcome::context("SessionStart", "a\"b\n").parts();
        assert_eq!(code, 0);
        assert_eq!(
            out,
            r#"{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"a\"b\n"}}"#
        );
    }

    #[test]
    fn a_context_cut_inside_a_pair_writes_the_lone_surrogate_escaped() {
        let mut text = js::utf16("x\u{1f600}");
        text.truncate(2);
        let (_, out, _) = Outcome::Context {
            event: "E".to_owned(),
            text,
        }
        .parts();
        assert!(out.ends_with(r#""additionalContext":"x\ud83d"}}"#));
    }
}
