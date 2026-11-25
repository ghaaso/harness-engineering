//! kit-queue: the one queue for heavy commands of a project.
//!
//!   kit-queue [--dir DIR] [--label NAME] [--heap MB] [--timeout-s N] [--max-timeout-s N] [--wait-s N] -- <program> [args...]
//!   kit-queue [--dir DIR] --capacity [N]          (read the number of slots, or set it to N; prints the number)
//!
//! Every test run, script run and smoke run of several agents goes through one queue, so the machine does not stall
//! under bursts of processes. It
//!   - lets only `capacity` commands run at a time across all agents (`<dir>/capacity.txt`, default 1),
//!   - runs the command and everything it starts at below-normal priority,
//!   - caps the heap of every Node process the command starts (`NODE_OPTIONS`),
//!   - ends the command's whole process tree at its timeout (its own child, nothing else): on Windows with
//!     `taskkill /T`; elsewhere the command starts in a process group of its own and the group is signalled, so a
//!     test runner's workers end with it (and a watcher ends the group when the queue itself is killed),
//!   - writes a line to `<dir>/log.jsonl`, flushed to disk, when a command starts and when it ends.
//!
//! --dir DIR: the folder of the slots, capacity.txt and log.jsonl (default: `<project>/.harness/lane`, the project
//!   being the main checkout of the git repository this runs in, the queue `kit-check` and `kit-unit` use). At most
//!   the processor count of slots.
//! --max-timeout-s N: raises this call's ceiling on --timeout-s above 1500 s (up to 7 days). The hold then records
//!   its own ceiling, and a hold is stale only after that ceiling plus a minute.
//! Exit code: the command's own; 124 on timeout; 75 when no slot came free within --wait-s; 127 when the command
//! could not start; 64 on bad usage.

use kit_core::paths;
use kit_queue::kit;
use kit_queue::queue::{self, Job, Output, Queue};
use kit_queue::sys;
use std::process::ExitCode;

const USAGE: &str = "kit-queue: usage: kit-queue [--dir DIR] [--label L] [--heap MB] [--timeout-s N] [--max-timeout-s N] [--wait-s N] -- <program> [args...]\n       kit-queue [--dir DIR] --capacity [N]\n";

fn main() -> ExitCode {
    let argv: Vec<String> = std::env::args_os()
        .skip(1)
        .map(|a| a.to_string_lossy().into_owned())
        .collect();
    run(&argv)
}

fn say(text: &str) -> ExitCode {
    sys::err(&format!("kit-queue: {text}\n"));
    ExitCode::from(64)
}

fn run(argv: &[String]) -> ExitCode {
    let sep = argv.iter().position(|a| a == "--");
    let (opts, cmd): (&[String], &[String]) = match sep {
        Some(i) => (
            argv.get(..i).unwrap_or_default(),
            argv.get(i.saturating_add(1)..).unwrap_or_default(),
        ),
        None => (argv, &[]),
    };
    let has = |name: &str| opts.iter().any(|a| a == name);
    let opt = |name: &str| -> Option<&str> {
        let i = opts.iter().position(|a| a == name)?;
        opts.get(i.saturating_add(1)).map(String::as_str)
    };
    let number = |name: &str, dflt: i64, lo: u64, hi: u64| -> u64 {
        let n = opt(name)
            .and_then(queue::parse_int)
            .filter(|n| *n != 0)
            .unwrap_or(dflt);
        u64::try_from(n).unwrap_or(0).clamp(lo, hi)
    };

    let dir = match opt("--dir").filter(|d| has("--dir") && !d.is_empty()) {
        Some(d) => paths::resolve(&paths::cwd(), &[d]),
        None => match kit::resolve_project(None) {
            Ok(p) => kit::queue_dir(&p, "lane"),
            Err(e) => return say(&format!("{}; or give --dir DIR", e.msg)),
        },
    };
    let q = match Queue::open(&dir, sys::cpus()) {
        Ok(q) => q,
        Err(e) => {
            sys::err(&format!("kit-queue: cannot make {}: {e}\n", dir.display()));
            return ExitCode::from(1);
        }
    };

    if sep.is_none() && has("--capacity") {
        if let Some(v) = opt("--capacity").filter(|v| !v.starts_with("--")) {
            let set = kit::whole(v)
                .ok_or_else(|| {
                    format!(
                        "--capacity takes a whole number from 1 to {}",
                        q.slots_max()
                    )
                })
                .and_then(|n| q.set_capacity(n));
            if let Err(e) = set {
                return say(&e);
            }
        }
        sys::out(&format!("{}\n", q.capacity()));
        return ExitCode::SUCCESS;
    }
    if cmd.is_empty() {
        sys::err(USAGE);
        return ExitCode::from(64);
    }

    let mut job = Job::new(opt("--label").unwrap_or("unnamed"), cmd.to_vec());
    job.heap_mb = number("--heap", 1024, 128, 4096);
    job.max_timeout_s = number(
        "--max-timeout-s",
        1500,
        queue::MAX_TIMEOUT_S,
        queue::LONGEST_S,
    );
    job.timeout_s = number("--timeout-s", 540, 5, job.max_timeout_s);
    job.wait_s = number("--wait-s", 900, 1, queue::WAIT_CEILING_S);
    job.output = Output::Inherit;
    let ran = q.run(&job);
    if let Some(note) = &ran.note {
        sys::err(&format!("kit-queue: {note}\n"));
    }
    sys::exit_code(ran.exit)
}
