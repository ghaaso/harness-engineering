//! The queue for heavy commands, and what the queue program, `kit-check` and `kit-unit` share.
//!
//! - [`queue`]: at most `capacity` commands at a time across every process that uses one queue folder (slots are
//!   folders made with `create_dir`, so the hold is atomic), each command at below-normal priority with a capped Node
//!   heap, its whole process tree ended at its timeout, and a line in the folder's `log.jsonl` when it starts and ends.
//! - [`kit`]: the project (the main checkout of a git repository), its config `<project>/.harness/kit.json`, git, the
//!   list of test files and the runs of each, and running a set of runs side by side through the project's queue.
//! - [`json`]: JSON text in the key order given, as `JSON.stringify` writes it.
//! - [`sys`]: what differs between Windows and the rest (is a process alive, end a process tree, priority).

pub mod json;
pub mod kit;
pub mod queue;
pub mod sys;
