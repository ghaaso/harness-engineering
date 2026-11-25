//! The queue for heavy commands. One queue is one folder: `capacity.txt` (how many commands run at once, default 1),
//! `slot-<i>` folders (a slot is held by making its folder; its `owner.json` names the process, the label and the
//! time) and `log.jsonl` (a line, flushed to disk, when a command starts, times out, ends, or finds no slot).
//!
//! A hold is stale when its owner process is gone, or when it is older than the longest a command may run (its own
//! `max_s`, at least [`MAX_TIMEOUT_S`]) plus a minute: a live command is never broken below its ceiling. A slot
//! folder without a readable owner is stale after 15 seconds.
//!
//! ```no_run
//! use kit_queue::queue::{Job, Queue};
//! let q = Queue::open(std::path::Path::new(".harness/lane"), kit_queue::sys::cpus())?;
//! let ran = q.run(&Job::new("tests", vec!["node".into(), "--test".into()]));
//! assert!(ran.exit >= 0);
//! # Ok::<(), std::io::Error>(())
//! ```

use crate::sys;
use kit_core::js;
use kit_core::log::Record;
use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, ExitStatus, Stdio};
use std::time::{Duration, Instant};

/// The default ceiling on one command's timeout, in seconds; a hold made without a higher ceiling is judged by it.
pub const MAX_TIMEOUT_S: u64 = 1500;
/// The highest ceiling a command may be given (7 days).
pub const LONGEST_S: u64 = 7 * 24 * 3600;
/// The longest a command may wait for a slot, in seconds.
pub const WAIT_CEILING_S: u64 = 3000;

/// Where a queued command's output goes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Output {
    /// The queue's own standard input, output and error.
    Inherit,
    /// Standard output and error into this file (made new), standard input empty.
    File(PathBuf),
}

/// One command for the queue.
#[derive(Debug, Clone)]
pub struct Job {
    /// The name in the log and in the hold.
    pub label: String,
    /// The program and its arguments (no shell).
    pub argv: Vec<String>,
    /// The folder it runs in (default: this process's).
    pub cwd: Option<PathBuf>,
    /// Seconds before its whole process tree is ended (5 to `max_timeout_s`; default 540).
    pub timeout_s: u64,
    /// This command's ceiling on `timeout_s` (1500 to 7 days; default 1500); above 1500 the hold records it.
    pub max_timeout_s: u64,
    /// Seconds to wait for a slot (1 to 3000; default 900).
    pub wait_s: u64,
    /// The heap cap, in MB, of every Node process it starts (128 to 4096; default 1024).
    pub heap_mb: u64,
    /// Where its output goes.
    pub output: Output,
    /// Environment variables the command does not get.
    pub drop_env: Vec<String>,
}

impl Job {
    /// A job with the queue's defaults.
    #[must_use]
    pub fn new(label: &str, argv: Vec<String>) -> Self {
        Self {
            label: label.to_owned(),
            argv,
            cwd: None,
            timeout_s: 540,
            max_timeout_s: MAX_TIMEOUT_S,
            wait_s: 900,
            heap_mb: 1024,
            output: Output::Inherit,
            drop_env: Vec::new(),
        }
    }
}

/// What came of a job.
#[derive(Debug, Clone, PartialEq)]
pub struct Ran {
    /// The command's own exit code; 124 when it timed out; 75 when no slot came free; 127 when it could not start;
    /// 1 when it was ended by a signal or the queue failed.
    pub exit: i32,
    /// Seconds waited for a slot.
    pub waited_s: f64,
    /// Seconds the command ran.
    pub ran_s: f64,
    /// A line for the user when the queue itself has something to say (no slot came free, a file could not be made).
    pub note: Option<String>,
}

/// A run's verdict for a check: a timeout, no slot and a command that could not start are no result, not a fail.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Verdict {
    /// Exit 0.
    Pass,
    /// Any other exit of the command.
    Fail,
    /// Exit 124, 75 or 127.
    NoResult,
}

impl Verdict {
    /// `pass`, `fail` or `none`, as the records write it.
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Pass => "pass",
            Self::Fail => "fail",
            Self::NoResult => "none",
        }
    }
}

impl Ran {
    fn ended(exit: i32, waited_ms: u64, ran_ms: u64, note: Option<String>) -> Self {
        Self {
            exit,
            waited_s: secs(waited_ms),
            ran_s: secs(ran_ms),
            note,
        }
    }

    /// The verdict of this run.
    #[must_use]
    pub fn verdict(&self) -> Verdict {
        match self.exit {
            0 => Verdict::Pass,
            124 | 75 | 127 => Verdict::NoResult,
            _ => Verdict::Fail,
        }
    }
}

fn secs(ms: u64) -> f64 {
    f64::from(u32::try_from(ms).unwrap_or(u32::MAX)) / 1000.0
}

fn ms_since(t: Instant) -> u64 {
    u64::try_from(t.elapsed().as_millis()).unwrap_or(u64::MAX)
}

fn iso_now() -> String {
    js::iso_string(i64::try_from(js::now_ms()).unwrap_or(0)).unwrap_or_default()
}

fn event(ev: &str) -> Record {
    Record::new().str("t", &iso_now()).str("ev", ev)
}

/// JavaScript's `parseInt(text, 10)`: white space, a sign and the leading digits; `None` for NaN. Saturates.
#[must_use]
pub fn parse_int(text: &str) -> Option<i64> {
    let t = text.trim_start_matches(js::is_space);
    let (neg, digits) = match t.strip_prefix('-') {
        Some(rest) => (true, rest),
        None => (false, t.strip_prefix('+').unwrap_or(t)),
    };
    let mut n: i64 = 0;
    let mut any = false;
    for d in digits.chars().map_while(|c| c.to_digit(10)) {
        any = true;
        n = n.saturating_mul(10).saturating_add(i64::from(d));
    }
    any.then(|| if neg { n.saturating_neg() } else { n })
}

/// A slot held by this process; dropping it gives the slot back.
#[derive(Debug)]
pub struct Hold {
    dir: Option<PathBuf>,
}

impl Hold {
    /// Gives the slot back now (a slot that cannot be removed is broken by the next caller as stale).
    pub fn release(&mut self) {
        if let Some(d) = self.dir.take() {
            fs::remove_dir_all(d).unwrap_or_default();
        }
    }
}

impl Drop for Hold {
    fn drop(&mut self) {
        self.release();
    }
}

/// One queue folder.
#[derive(Debug, Clone)]
pub struct Queue {
    dir: PathBuf,
    slots_max: u64,
}

impl Queue {
    /// The queue in `dir` (made when missing), with at most `slots_max` slots.
    ///
    /// # Errors
    /// When the folder cannot be made.
    pub fn open(dir: &Path, slots_max: u64) -> io::Result<Self> {
        fs::create_dir_all(dir)?;
        Ok(Self {
            dir: dir.to_path_buf(),
            slots_max: slots_max.max(1),
        })
    }

    /// The queue's folder.
    #[must_use]
    pub fn dir(&self) -> &Path {
        &self.dir
    }

    /// The most slots this queue may be given.
    #[must_use]
    pub fn slots_max(&self) -> u64 {
        self.slots_max
    }

    /// The number of slots: `capacity.txt`, 1 when missing or unreadable, never above the maximum.
    #[must_use]
    pub fn capacity(&self) -> u64 {
        let max = i64::try_from(self.slots_max).unwrap_or(i64::MAX);
        let n = fs::read_to_string(self.dir.join("capacity.txt"))
            .ok()
            .and_then(|t| parse_int(&t))
            .unwrap_or(1)
            .clamp(1, max);
        u64::try_from(n).unwrap_or(1)
    }

    /// Sets the number of slots (written to a file beside it and renamed into place) and gives the number now read.
    ///
    /// # Errors
    /// When `n` is outside 1 to the maximum, or the file cannot be written.
    pub fn set_capacity(&self, n: u64) -> Result<u64, String> {
        if n < 1 || n > self.slots_max {
            return Err(format!(
                "--capacity takes a whole number from 1 to {}",
                self.slots_max
            ));
        }
        let file = self.dir.join("capacity.txt");
        let tmp = self
            .dir
            .join(format!("capacity.txt.{}.tmp", std::process::id()));
        fs::write(&tmp, format!("{n}\n"))
            .and_then(|()| fs::rename(&tmp, &file))
            .map_err(|e| format!("cannot write {}: {e}", file.display()))?;
        Ok(self.capacity())
    }

    /// Appends a line to `log.jsonl` and flushes it to disk; the log never stops the work.
    fn log(&self, rec: &Record) {
        let line = format!("{}\n", rec.to_json());
        let written = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(self.dir.join("log.jsonl"))
            .and_then(|mut f| f.write_all(line.as_bytes()).and_then(|()| f.sync_all()));
        written.unwrap_or_default();
    }

    fn stale(slot: &Path) -> bool {
        let owner = fs::read_to_string(slot.join("owner.json"))
            .ok()
            .and_then(|t| serde_json::from_str::<serde_json::Value>(&t).ok())
            .filter(serde_json::Value::is_object);
        let Some(o) = owner else {
            return fs::metadata(slot)
                .and_then(|m| m.modified())
                .ok()
                .and_then(|t| t.elapsed().ok())
                .is_some_and(|age| age > Duration::from_secs(15));
        };
        let gone = !o
            .get("pid")
            .and_then(serde_json::Value::as_u64)
            .is_some_and(sys::alive);
        let max_s = o
            .get("max_s")
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(0)
            .clamp(MAX_TIMEOUT_S, LONGEST_S);
        let hold_ms =
            i64::try_from(max_s.saturating_add(60).saturating_mul(1000)).unwrap_or(i64::MAX);
        let since = o
            .get("t")
            .and_then(serde_json::Value::as_str)
            .and_then(js::date_parse);
        let now = i64::try_from(js::now_ms()).unwrap_or(i64::MAX);
        gone || since.is_some_and(|t| now.saturating_sub(t) > hold_ms)
    }

    fn try_acquire(&self, label: &str, max_t: u64) -> io::Result<Option<Hold>> {
        for i in 0..self.capacity() {
            let d = self.dir.join(format!("slot-{i}"));
            for _attempt in 0..2 {
                match fs::create_dir(&d) {
                    Ok(()) => {
                        let mut own = Record::new()
                            .int("pid", u64::from(std::process::id()))
                            .str("label", label)
                            .str("t", &iso_now());
                        if max_t > MAX_TIMEOUT_S {
                            own = own.int("max_s", max_t);
                        }
                        let hold = Hold {
                            dir: Some(d.clone()),
                        };
                        fs::write(d.join("owner.json"), own.to_json())?;
                        return Ok(Some(hold));
                    }
                    Err(e) if e.kind() == io::ErrorKind::AlreadyExists => {
                        if !Self::stale(&d) || fs::remove_dir_all(&d).is_err() {
                            break;
                        }
                    }
                    Err(e) => return Err(e),
                }
            }
        }
        Ok(None)
    }

    /// Runs `job`: waits for a slot, runs the command, ends its whole process tree at its timeout, logs, and gives
    /// the slot back.
    #[must_use]
    pub fn run(&self, job: &Job) -> Ran {
        let max_t = job.max_timeout_s.clamp(MAX_TIMEOUT_S, LONGEST_S);
        let timeout_s = job.timeout_s.clamp(5, max_t);
        let wait_s = job.wait_s.clamp(1, WAIT_CEILING_S);
        let heap = job.heap_mb.clamp(128, 4096);
        let label = job.label.as_str();

        let files = match &job.output {
            Output::Inherit => None,
            Output::File(p) => {
                let made = p
                    .parent()
                    .map_or(Ok(()), fs::create_dir_all)
                    .and_then(|()| File::create(p));
                match made {
                    Ok(f) => Some(f),
                    Err(e) => {
                        return Ran::ended(
                            127,
                            0,
                            0,
                            Some(format!("cannot make {}: {e}", p.display())),
                        );
                    }
                }
            }
        };

        let t0 = Instant::now();
        let mut hold = loop {
            match self.try_acquire(label, max_t) {
                Ok(Some(h)) => break h,
                Ok(None) => {}
                Err(e) => {
                    return Ran::ended(
                        1,
                        ms_since(t0),
                        0,
                        Some(format!("cannot take a slot in {}: {e}", self.dir.display())),
                    );
                }
            }
            if t0.elapsed() > Duration::from_secs(wait_s) {
                self.log(&event("busy").str("label", label).int("waited_s", wait_s));
                return Ran::ended(
                    75,
                    ms_since(t0),
                    0,
                    Some(format!("no slot came free within {wait_s} s; try again")),
                );
            }
            std::thread::sleep(Duration::from_millis(700));
        };

        let waited_ms = ms_since(t0);
        let started = Instant::now();
        self.log(
            &event("start")
                .str("label", label)
                .int("pid", u64::from(std::process::id()))
                .int("waited_ms", waited_ms)
                .cut("cmd", &job.argv.join(" "), 400),
        );
        let mut child = match spawn(job, heap, files.as_ref()) {
            Ok(c) => c,
            Err(e) => {
                self.log(
                    &event("end")
                        .str("label", label)
                        .str("error", &e.to_string())
                        .int("ms", ms_since(started)),
                );
                hold.release();
                return Ran::ended(127, waited_ms, ms_since(started), None);
            }
        };
        let watch = sys::watch(child.id());
        let mut timed_out = false;
        let status = self.wait(&mut child, label, timeout_s, started, &mut timed_out);
        drop(watch);
        let ran_ms = ms_since(started);
        let (exit, signal) = match &status {
            Ok(st) => (
                if timed_out {
                    124
                } else {
                    st.code().unwrap_or(1)
                },
                sys::signal_name(st),
            ),
            Err(_) => (if timed_out { 124 } else { 1 }, None),
        };
        self.log(
            &event("end")
                .str("label", label)
                .raw("exit", exit.to_string())
                .opt_str("signal", signal.as_deref())
                .int("ms", ran_ms),
        );
        std::thread::sleep(Duration::from_millis(300));
        hold.release();
        Ran::ended(exit, waited_ms, ran_ms, None)
    }

    fn wait(
        &self,
        child: &mut Child,
        label: &str,
        timeout_s: u64,
        started: Instant,
        timed_out: &mut bool,
    ) -> io::Result<ExitStatus> {
        loop {
            if let Some(st) = child.try_wait()? {
                return Ok(st);
            }
            if !*timed_out && started.elapsed() >= Duration::from_secs(timeout_s) {
                *timed_out = true;
                self.log(
                    &event("timeout")
                        .str("label", label)
                        .int("child", u64::from(child.id()))
                        .int("after_s", timeout_s),
                );
                sys::kill_tree(child);
            }
            std::thread::sleep(Duration::from_millis(50));
        }
    }
}

/// Starts the command at below-normal priority with the Node heap cap; off Windows through `nice` when it is there.
fn spawn(job: &Job, heap: u64, file: Option<&File>) -> io::Result<Child> {
    let wrapped = sys::wrap(&job.argv);
    match start(&wrapped, job, heap, file) {
        Err(e) if e.kind() == io::ErrorKind::NotFound && wrapped.len() != job.argv.len() => {
            start(&job.argv, job, heap, file)
        }
        other => other,
    }
}

fn start(argv: &[String], job: &Job, heap: u64, file: Option<&File>) -> io::Result<Child> {
    let (program, args) = argv
        .split_first()
        .ok_or_else(|| io::Error::other("no command given"))?;
    let mut cmd = Command::new(program);
    cmd.args(args);
    if let Some(d) = &job.cwd {
        cmd.current_dir(d);
    }
    for k in &job.drop_env {
        cmd.env_remove(k);
    }
    let node = std::env::var("NODE_OPTIONS").unwrap_or_default();
    if !node.contains("max-old-space-size") {
        let set = format!("{node} --max-old-space-size={heap}");
        cmd.env("NODE_OPTIONS", js::trim(&set));
    }
    if let Some(f) = file {
        cmd.stdin(Stdio::null())
            .stdout(Stdio::from(f.try_clone()?))
            .stderr(Stdio::from(f.try_clone()?));
    }
    sys::prepare(&mut cmd);
    cmd.spawn()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("kit-queue-{name}-{}", std::process::id()));
        fs::remove_dir_all(&d).unwrap_or_default();
        d
    }

    #[test]
    fn parse_int_reads_leading_digits_as_javascript_does() {
        assert_eq!(
            [
                parse_int(" 12x"),
                parse_int("-3"),
                parse_int("x"),
                parse_int("")
            ],
            [Some(12), Some(-3), None, None]
        );
    }

    #[test]
    fn capacity_is_one_when_missing_and_never_above_the_maximum() -> io::Result<()> {
        let d = temp("cap");
        let q = Queue::open(&d, 3)?;
        let first = q.capacity();
        fs::write(d.join("capacity.txt"), "9\n")?;
        let clamped = q.capacity();
        let refused = q.set_capacity(4).is_err();
        let set = q.set_capacity(2);
        fs::remove_dir_all(&d).unwrap_or_default();
        assert_eq!((first, clamped, refused, set), (1, 3, true, Ok(2)));
        Ok(())
    }

    #[test]
    fn a_run_gives_the_command_exit_and_frees_its_slot() -> io::Result<()> {
        let d = temp("run");
        let q = Queue::open(&d, 2)?;
        let log = d.join("out").join("git.log");
        let mut job = Job::new("t", vec!["git".to_owned(), "--version".to_owned()]);
        job.output = Output::File(log.clone());
        let ran = q.run(&job);
        let out = fs::read_to_string(&log).unwrap_or_default();
        let freed = !d.join("slot-0").exists();
        let lines = fs::read_to_string(d.join("log.jsonl")).unwrap_or_default();
        fs::remove_dir_all(&d).unwrap_or_default();
        assert_eq!(
            (
                ran.verdict(),
                out.starts_with("git version"),
                freed,
                lines.lines().count()
            ),
            (Verdict::Pass, true, true, 2)
        );
        Ok(())
    }

    #[test]
    fn a_missing_program_is_no_result() -> io::Result<()> {
        let d = temp("missing");
        let q = Queue::open(&d, 1)?;
        let ran = q.run(&Job::new("t", vec!["kit-queue-no-such-program".to_owned()]));
        fs::remove_dir_all(&d).unwrap_or_default();
        assert_eq!(ran.verdict(), Verdict::NoResult);
        Ok(())
    }

    #[test]
    fn a_hold_of_a_live_process_is_not_stale_and_a_dead_one_is() -> io::Result<()> {
        let d = temp("stale");
        fs::create_dir_all(d.join("live"))?;
        fs::create_dir_all(d.join("dead"))?;
        let me = std::process::id();
        let now = iso_now();
        fs::write(
            d.join("live").join("owner.json"),
            format!("{{\"pid\":{me},\"label\":\"x\",\"t\":\"{now}\"}}"),
        )?;
        fs::write(
            d.join("dead").join("owner.json"),
            format!("{{\"pid\":4294967290,\"label\":\"x\",\"t\":\"{now}\"}}"),
        )?;
        let got = (Queue::stale(&d.join("live")), Queue::stale(&d.join("dead")));
        fs::remove_dir_all(&d).unwrap_or_default();
        assert_eq!(got, (false, true));
        Ok(())
    }
}
