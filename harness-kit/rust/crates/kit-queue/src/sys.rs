//! What differs between Windows and the rest: whether a process is alive, ending a command's whole process tree,
//! below-normal priority, and the watch that ends a command's process group when the queue itself is killed.
//! No `unsafe` and no system bindings: each is done with the system's own small programs (`tasklist` and `taskkill`
//! on Windows, `kill`, `nice` and `sh` elsewhere).

use std::io::Write;
use std::process::{Child, Command, ExitCode, ExitStatus, Stdio};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// Windows `CREATE_NO_WINDOW`, for the system's own small programs.
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;
/// Windows `BELOW_NORMAL_PRIORITY_CLASS`; a process of this class passes it on to the processes it starts.
#[cfg(windows)]
const BELOW_NORMAL_PRIORITY_CLASS: u32 = 0x0000_4000;

/// The number of processors (Node's `os.availableParallelism()`), at least 1.
#[must_use]
pub fn cpus() -> u64 {
    std::thread::available_parallelism().map_or(1, |n| u64::try_from(n.get()).unwrap_or(1))
}

/// Node's `process.kill(pid, 0)` in a `try`: true when the process exists (also when it belongs to someone else).
/// This process is alive without asking. When the system cannot be asked, the answer is "alive", so a live hold is
/// never broken.
#[must_use]
pub fn alive(pid: u64) -> bool {
    if u64::from(std::process::id()) == pid {
        return true;
    }
    alive_other(pid)
}

#[cfg(windows)]
fn alive_other(pid: u64) -> bool {
    let filter = format!("PID eq {pid}");
    let out = Command::new("C:/Windows/System32/tasklist.exe")
        .args(["/FI", &filter, "/NH", "/FO", "CSV"])
        .stdin(Stdio::null())
        .stderr(Stdio::null())
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    match out {
        Ok(o) => String::from_utf8_lossy(&o.stdout).contains(&format!("\",\"{pid}\",\"")),
        Err(_) => true,
    }
}

#[cfg(not(windows))]
fn alive_other(pid: u64) -> bool {
    let out = Command::new("kill")
        .args(["-0", &pid.to_string()])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .output();
    match out {
        Ok(o) => {
            o.status.success()
                || String::from_utf8_lossy(&o.stderr)
                    .to_lowercase()
                    .contains("not permitted")
        }
        Err(_) => true,
    }
}

/// Sets what every queued command gets: below-normal priority on Windows; elsewhere a process group of its own, so
/// that its whole group can be ended (the priority there comes from `nice`, see [`wrap`]).
pub fn prepare(cmd: &mut Command) {
    #[cfg(windows)]
    {
        cmd.creation_flags(BELOW_NORMAL_PRIORITY_CLASS);
    }
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt as _;
        cmd.process_group(0);
    }
}

/// The program and arguments that start `argv` at below-normal priority: off Windows `nice -n 10 <argv>` (Node's
/// `PRIORITY_BELOW_NORMAL` is 10), on Windows `argv` itself (the priority is a creation flag there).
#[must_use]
pub fn wrap(argv: &[String]) -> Vec<String> {
    if cfg!(windows) {
        return argv.to_vec();
    }
    let mut out = vec!["nice".to_owned(), "-n".to_owned(), "10".to_owned()];
    out.extend(argv.iter().cloned());
    out
}

/// Ends `child` and every process it started: `taskkill /T /F` on Windows; elsewhere `SIGKILL` to its process group
/// (it leads one, see [`prepare`]). When that cannot be done, the child alone is killed.
pub fn kill_tree(child: &mut Child) {
    let pid = child.id().to_string();
    #[cfg(windows)]
    let ended = Command::new("C:/Windows/System32/taskkill.exe")
        .args(["/PID", &pid, "/T", "/F"])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .is_ok_and(|s| s.success());
    #[cfg(not(windows))]
    let ended = Command::new("kill")
        .args(["-KILL", "--", &format!("-{pid}")])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .is_ok_and(|s| s.success());
    if !ended {
        child.kill().unwrap_or_default();
    }
}

/// A small watcher off Windows: when this process ends without ending its command (a signal killed it), the
/// watcher ends the command's process group within a second. Dropping it stops the watcher.
#[derive(Debug)]
pub struct Watch(Option<Child>);

/// Starts the watcher for the command whose process group is `group` (nothing on Windows, where the command is not
/// in a group of its own and `taskkill /T` is used at a timeout).
#[must_use]
pub fn watch(group: u32) -> Watch {
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt as _;
        let script =
            "while kill -0 \"$1\" 2>/dev/null; do sleep 1; done; kill -KILL -- \"-$2\" 2>/dev/null";
        let child = Command::new("sh")
            .args([
                "-c",
                script,
                "kit-queue-watch",
                &std::process::id().to_string(),
                &group.to_string(),
            ])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .process_group(0)
            .spawn()
            .ok();
        Watch(child)
    }
    #[cfg(not(unix))]
    {
        let _unused = group;
        Watch(None)
    }
}

impl Drop for Watch {
    fn drop(&mut self) {
        if let Some(child) = self.0.as_mut() {
            child.kill().unwrap_or_default();
            child.wait().map(drop).unwrap_or_default();
        }
    }
}

/// The name of the signal that ended a process (`SIGTERM`), or `None` (always on Windows).
#[must_use]
pub fn signal_name(status: &ExitStatus) -> Option<String> {
    #[cfg(unix)]
    {
        use std::os::unix::process::ExitStatusExt as _;
        status.signal().map(|n| {
            match n {
                1 => "SIGHUP",
                2 => "SIGINT",
                3 => "SIGQUIT",
                6 => "SIGABRT",
                9 => "SIGKILL",
                11 => "SIGSEGV",
                13 => "SIGPIPE",
                15 => "SIGTERM",
                _ => return format!("SIG{n}"),
            }
            .to_owned()
        })
    }
    #[cfg(not(unix))]
    {
        let _unused = status;
        None
    }
}

/// Writes `text` to standard output as it is; a closed pipe is ignored, as Node ignores it.
pub fn out(text: &str) {
    let mut o = std::io::stdout().lock();
    o.write_all(text.as_bytes())
        .and_then(|()| o.flush())
        .unwrap_or_default();
}

/// Writes `text` to standard error as it is.
pub fn err(text: &str) {
    let mut e = std::io::stderr().lock();
    e.write_all(text.as_bytes())
        .and_then(|()| e.flush())
        .unwrap_or_default();
}

/// The exit code for a command's exit code: itself from 0 to 255, else 1.
pub fn exit_code(code: i32) -> ExitCode {
    u8::try_from(code).map_or_else(|_| ExitCode::from(1), ExitCode::from)
}
