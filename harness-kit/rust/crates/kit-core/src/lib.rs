//! What every hook program of the harness kit needs, each piece matching the JavaScript hook it replaces.
//!
//! A hook program reads its [`context::Context`] (arguments, the clone, kit mode) and its [`input::Input`] (the
//! hook's JSON on standard input), decides, appends a [`log::Record`] to its log, and returns an
//! [`outcome::Outcome`] whose [`outcome::Outcome::finish`] gives `main` its exit code:
//!
//! ```no_run
//! use kit_core::{context::Context, input, log::Record, outcome::Outcome};
//! use std::process::ExitCode;
//!
//! fn main() -> ExitCode {
//!     let ctx = Context::from_env();
//!     let outcome = match input::read_stdin() {
//!         input::Input::Json(_) => Outcome::Pass,
//!         input::Input::Unreadable => Outcome::Refuse("example: the input cannot be read".to_owned()),
//!     };
//!     kit_core::log::append(&ctx.logs(), "example.jsonl", &Record::new().int("t", kit_core::js::now_ms()));
//!     outcome.finish()
//! }
//! ```
//!
//! [`transcript`] reads a session's transcript line by line and [`tokens`] counts its tokens as the fan-out gate
//! does. [`js`] holds JavaScript's own behaviours (string length in UTF-16 units, `trim`, `String(x)`, number
//! formatting, `toFixed`, `Math.round`, `Date.parse`, `toISOString`, the default sort, `Object.keys` order) so that
//! a port prints what its JavaScript hook prints. [`paths`] is Node's `path.resolve` and kit-mode's real-path keys.

/// The `regex` crate (version 1), for the hook programs: `kit_core::regex::Regex`. Its classes are Unicode-wide
/// where JavaScript's are ASCII; see the crate's DESIGN.md before porting a pattern.
pub use regex;

pub mod context;
pub mod input;
pub mod js;
pub mod log;
pub mod outcome;
pub mod paths;
pub mod tokens;
pub mod transcript;
