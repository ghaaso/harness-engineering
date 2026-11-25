//! kit-check: the project's test files side by side, each through the project's queue with the one-file command of
//! `<project>/.harness/kit.json` (the kit's `parallel/kit.example.json`).
//! Measured in the harness project (the kit's `parallel/SPEEDUPS.md`, "The test suite", r57-0103): its suite went
//! from 596 s one file at a time to 264 s with 8 files at once and 120.4 s with its longest file cut into 4 shards.
//! Those are that project's figures; --measure gives this project's own.
//!
//!   kit-check [test file...] [--at N] [--in DIR] [--project DIR]
//!   kit-check --measure            [--in DIR] [--project DIR]
//!
//! Lists the test files (kit.json `test_files`, matched against the files git tracks or does not ignore), runs them N
//! at once (default `queue_slots`), each through the project's queue (`<project>/.harness/lane`, slots =
//! `queue_slots`) with `check_one` and its timeout; prints pass, fail or no result per file and the total seconds. A
//! file kit.json lists with shards runs as its shards and nothing else. --in: the folder to check (default: the top
//! of the checkout it is called from, so a call from a unit's copy checks that copy); the config is always the
//! project's.
//! --measure: the whole set at 1, 2, 4 and 8 at once (never above the processor count), each level through a queue
//! of its own with that many slots (`<project>/.harness/lane-measure`: run it when nothing else heavy runs); prints
//! the seconds of each and the fastest, and writes them to `<project>/.harness/check-measure.json`. It changes no
//! setting: `queue_slots` stays as kit.json says.
//! Exit: 0 all passed; 1 a file failed or got no result; 64 usage or set-up; 70 internal error.

use kit_core::paths;
use kit_queue::json::J;
use kit_queue::kit::{self, Config, KitError, KitResult, Member};
use kit_queue::queue::{Queue, Ran, Verdict};
use kit_queue::sys;
use std::path::Path;
use std::process::ExitCode;
use std::time::Instant;

const LEVELS: [u64; 4] = [1, 2, 4, 8];

fn say(s: &str) {
    sys::err(&format!("check: {s}\n"));
}

fn main() -> ExitCode {
    let argv: Vec<String> = std::env::args_os()
        .skip(1)
        .map(|a| a.to_string_lossy().into_owned())
        .collect();
    match run(&argv) {
        Ok(code) => ExitCode::from(code),
        Err(e) => {
            say(&e.msg);
            ExitCode::from(e.code)
        }
    }
}

struct SetResult {
    s: f64,
    pass: usize,
    fail: usize,
    none: usize,
}

fn count(rs: &[Ran], v: Verdict) -> usize {
    rs.iter().filter(|r| r.verdict() == v).count()
}

fn run_set(
    cfg: &Config,
    q: &Queue,
    members: &[Member],
    at: u64,
    cwd: &Path,
    logs: &Path,
    print: bool,
) -> SetResult {
    let t0 = Instant::now();
    let pid = std::process::id();
    let log_of = |m: &Member| logs.join(format!("{}.log", kit::safe(&m.id)));
    let rs = kit::pool(
        members,
        usize::try_from(at).unwrap_or(1),
        |m| {
            let label = format!("check-{}-{pid}", kit::safe(&m.id));
            kit::lane_run(q, &label, &m.argv, cwd, cfg.check_one_timeout_s, &log_of(m))
        },
        |m, r| {
            if !print {
                return;
            }
            let v = r.verdict();
            let word = if v == Verdict::NoResult {
                "no result"
            } else {
                v.as_str()
            };
            let tail = if v == Verdict::Pass {
                String::new()
            } else {
                format!("  (exit {}; log {})", r.exit, log_of(m).display())
            };
            sys::out(&format!(
                "{}{}  {}{tail}\n",
                kit::pad_end(word, 10),
                kit::pad_start(&format!("{} s", kit::r1s(r.ran_s)), 9),
                m.id
            ));
        },
    );
    SetResult {
        s: t0.elapsed().as_secs_f64(),
        pass: count(&rs, Verdict::Pass),
        fail: count(&rs, Verdict::Fail),
        none: count(&rs, Verdict::NoResult),
    }
}

fn int(n: usize) -> J {
    J::int(i64::try_from(n).unwrap_or(i64::MAX))
}

fn run(argv: &[String]) -> KitResult<u8> {
    let a = kit::parse_args(argv, &["project", "in", "at"], &["measure"])?;
    let project = kit::resolve_project(a.value("project"))?;
    let cfg = kit::load_config(&project)?;
    kit::notice_once(&project, "check", kit::NOTICE);
    let top = match a.value("in").filter(|v| !v.is_empty()) {
        Some(d) => d.to_owned(),
        None => kit::git_out(&paths::cwd(), &["rev-parse", "--show-toplevel"])?,
    };
    let cwd = paths::resolve(&paths::cwd(), &[&top]);
    if !cwd.exists() {
        return Err(KitError::new(64, format!("no folder {}", cwd.display())));
    }
    let files: Vec<String> = if a.pos.is_empty() {
        kit::list_tests(&cwd, &cfg.test_files)?
    } else {
        let mut fs: Vec<String> = Vec::new();
        for f in a.pos.iter().map(|f| kit::norm_path(f)) {
            if !fs.contains(&f) {
                fs.push(f);
            }
        }
        for f in &fs {
            if !cwd.join(f).exists() {
                return Err(KitError::new(
                    64,
                    format!("no file {f} in {}", cwd.display()),
                ));
            }
        }
        fs
    };
    if files.is_empty() {
        return Err(KitError::new(
            64,
            format!(
                "no test files match {} in {}",
                J::strs(&cfg.test_files).compact(),
                cwd.display()
            ),
        ));
    }
    let logs = kit::harness_dir(&project).join("check").join(format!(
        "{}-{}",
        kit::stamp(),
        std::process::id()
    ));

    if a.flag("measure") {
        if a.value("at").is_some_and(|v| !v.is_empty()) {
            return Err(KitError::new(
                64,
                "--measure runs its own levels; give no --at",
            ));
        }
        return measure(&cfg, &project, &files, &cwd, &logs);
    }

    let at = match a.value("at") {
        Some(v) => kit::whole(v)
            .filter(|n| (1..=256).contains(n))
            .ok_or_else(|| KitError::new(64, "--at takes a whole number from 1 to 256"))?,
        None => cfg.queue_slots,
    };
    if at > cfg.queue_slots {
        say(&format!(
            "--at {at}, but the queue runs at most {} at once (queue_slots in kit.json)",
            cfg.queue_slots
        ));
    }
    let q = kit::set_slots(&kit::queue_dir(&project, "lane"), cfg.queue_slots)?;
    let ms = kit::members_of(&cfg, &files);
    let r = run_set(&cfg, &q, &ms, at, &cwd, &logs, true);
    sys::out(&format!(
        "{} passed, {} failed, {} no result; {} file(s) in {} run(s), {at} at once; {} s in all\n",
        r.pass,
        r.fail,
        r.none,
        files.len(),
        ms.len(),
        kit::r1s(r.s)
    ));
    Ok(u8::from(r.fail > 0 || r.none > 0))
}

struct Row {
    at: u64,
    s: f64,
    pass: usize,
    fail: usize,
    none: usize,
}

fn measure(
    cfg: &Config,
    project: &Path,
    files: &[String],
    cwd: &Path,
    logs: &Path,
) -> KitResult<u8> {
    let cpus = sys::cpus();
    let levels: Vec<u64> = LEVELS.iter().copied().filter(|n| *n <= cpus).collect();
    let dir = kit::queue_dir(project, "lane-measure");
    let n = kit::members_of(cfg, files).len();
    let joined: Vec<String> = levels.iter().map(u64::to_string).collect();
    say(&format!(
        "measuring {} file(s) ({n} run(s)) at {} at once in {}; {cpus} processors",
        files.len(),
        joined.join(", "),
        cwd.display()
    ));
    let mut rows: Vec<Row> = Vec::new();
    for &at in &levels {
        let q = kit::set_slots(&dir, at)?;
        let r = run_set(
            cfg,
            &q,
            &kit::members_of(cfg, files),
            at,
            cwd,
            &logs.join(format!("at-{at}")),
            false,
        );
        let s = kit::r1(r.s);
        sys::out(&format!(
            "at {} at once: {} s   {} passed, {} failed, {} no result\n",
            kit::pad_start(&at.to_string(), 2),
            kit::pad_start(&kit::r1s(s), 8),
            r.pass,
            r.fail,
            r.none
        ));
        rows.push(Row {
            at,
            s,
            pass: r.pass,
            fail: r.fail,
            none: r.none,
        });
    }
    let clean: Vec<&Row> = rows.iter().filter(|r| r.fail == 0 && r.none == 0).collect();
    let all_failed = clean.is_empty();
    let candidates: Vec<&Row> = if all_failed {
        rows.iter().collect()
    } else {
        clean
    };
    let Some(best) = candidates
        .iter()
        .copied()
        .reduce(|a, b| if b.s < a.s { b } else { a })
    else {
        return Err(KitError::new(70, "internal error: no level was measured"));
    };
    let first = rows.first().map_or(0.0, |r| r.s);
    sys::out(&format!(
        "fastest: {} at once, {} s (1 at once: {} s){}\n",
        best.at,
        js_num(best.s),
        js_num(first),
        if all_failed {
            "; every level had a failure, so the times are not comparable"
        } else {
            ""
        }
    ));
    sys::out(&format!(
        "queue_slots in kit.json is {}; this run changed nothing\n",
        cfg.queue_slots
    ));
    let level_rows: Vec<J> = rows
        .iter()
        .map(|r| {
            J::obj()
                .with("at", J::Num(r.at.to_string()))
                .with("s", J::num(r.s))
                .with("pass", int(r.pass))
                .with("fail", int(r.fail))
                .with("no_result", int(r.none))
        })
        .collect();
    let out = J::obj()
        .with("t", J::str(&kit::iso_now()))
        .with("in", J::str(&cwd.display().to_string()))
        .with("files", int(files.len()))
        .with("runs", int(n))
        .with("cpus", J::Num(cpus.to_string()))
        .with("levels", J::Arr(level_rows))
        .with("fastest", J::Num(best.at.to_string()))
        .with("queue_slots", J::Num(cfg.queue_slots.to_string()));
    std::fs::write(
        kit::harness_dir(project).join("check-measure.json"),
        format!("{}\n", out.pretty(1)),
    )?;
    Ok(u8::from(rows.iter().any(|r| r.fail > 0 || r.none > 0)))
}

fn js_num(x: f64) -> String {
    kit_core::js::number_to_string(x)
}
