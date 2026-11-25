//! kit-creep-gate: placeholder until its port is built (docs/program/harness-kit-2026-11-25/CONTRACT.md section 7).
//! The builder of this hook replaces this file; the crate's manifest and the workspace lock stay as they are.

use kit_core::outcome::Outcome;
use std::process::ExitCode;

fn main() -> ExitCode {
    Outcome::Fail("not ported yet".to_owned()).finish()
}
