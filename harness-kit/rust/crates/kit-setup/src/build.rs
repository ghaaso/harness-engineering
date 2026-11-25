//! The build of the hook programs with cargo, and which programs are built and fresh.

use crate::wiring::{Hook, KIT, program_path};
use kit_core::regex::Regex;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{Duration, UNIX_EPOCH};

/// One call of cargo: its arguments, its folder, the target folder it builds into, and whether rustup may install
/// a toolchain (`RUSTUP_AUTO_INSTALL=0` when not).
#[derive(Debug, Clone)]
pub struct CargoCall {
    /// The arguments after `cargo`.
    pub args: Vec<String>,
    /// The folder it runs in.
    pub cwd: PathBuf,
    /// `CARGO_TARGET_DIR`.
    pub target: PathBuf,
    /// True: `RUSTUP_AUTO_INSTALL=0`.
    pub auto_install_off: bool,
}

/// How a call of cargo ended.
#[derive(Debug, Default, Clone)]
pub struct Ran {
    /// Why it could not start (cargo not found), if so.
    pub error: Option<String>,
    /// Its exit code.
    pub status: Option<i32>,
    /// Its standard output.
    pub stdout: String,
    /// Its standard error.
    pub stderr: String,
}

/// Runs cargo; the tests put a stand-in in its place.
pub trait Cargo {
    /// Runs one call and waits for it.
    fn call(&self, c: &CargoCall) -> Ran;
}

/// The `cargo` on the path.
#[derive(Debug)]
pub struct RealCargo;

impl Cargo for RealCargo {
    fn call(&self, c: &CargoCall) -> Ran {
        let mut cmd = Command::new("cargo");
        cmd.args(&c.args)
            .current_dir(&c.cwd)
            .env("CARGO_TARGET_DIR", &c.target);
        if c.auto_install_off {
            cmd.env("RUSTUP_AUTO_INSTALL", "0");
        }
        match cmd.output() {
            Ok(o) => Ran {
                error: None,
                status: o.status.code(),
                stdout: String::from_utf8_lossy(&o.stdout).into_owned(),
                stderr: String::from_utf8_lossy(&o.stderr).into_owned(),
            },
            Err(e) => Ran {
                error: Some(format!("{:?}: {e}", e.kind())),
                ..Ran::default()
            },
        }
    }
}

/// A call of cargo in `<rust>` building into `<rust>/target`.
#[must_use]
pub fn call_in(rust_dir: &Path, args: &[&str], fetch: bool) -> CargoCall {
    CargoCall {
        args: args.iter().map(|a| (*a).to_owned()).collect(),
        cwd: rust_dir.to_path_buf(),
        target: rust_dir.join("target"),
        auto_install_off: !fetch,
    }
}

/// The toolchain `rust-toolchain.toml` pins.
#[must_use]
pub fn pinned(rust_dir: &Path) -> Option<String> {
    let text = std::fs::read_to_string(rust_dir.join("rust-toolchain.toml")).ok()?;
    let re = Regex::new(r#"channel\s*=\s*"([^"]+)""#).ok()?;
    re.captures(&text)?.get(1).map(|m| m.as_str().to_owned())
}

/// Whether cargo can be used, found without downloading anything.
#[derive(Debug)]
pub struct CargoState {
    /// True when `cargo --version` worked.
    pub ok: bool,
    /// Its version line, or why not.
    pub text: String,
    /// True when the pinned toolchain is what is missing.
    pub toolchain: bool,
}

fn first_line(t: &str, n: usize) -> String {
    t.split('\n')
        .next()
        .unwrap_or_default()
        .chars()
        .take(n)
        .collect()
}

/// `cargo --version` in the workspace, offline.
pub fn cargo_state(cargo: &dyn Cargo, rust_dir: &Path) -> CargoState {
    let r = cargo.call(&call_in(rust_dir, &["--version"], false));
    let pin = pinned(rust_dir).unwrap_or_else(|| "the pinned version".to_owned());
    if let Some(e) = r.error {
        return CargoState {
            ok: false,
            toolchain: false,
            text: format!(
                "cargo was not found ({e}). Install Rust with rustup (https://rustup.rs; on macOS and Linux: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh), open a new terminal, and run this again; the toolchain {pin} pinned in harness-kit/rust/rust-toolchain.toml is then installed by rustup for that folder (run with --fetch to let it download it)."
            ),
        };
    }
    if r.status != Some(0) {
        let t = format!("{}{}", r.stderr, r.stdout).trim().to_owned();
        let low = t.to_lowercase();
        if low.contains("toolchain")
            || low.contains("not installed")
            || low.contains("auto-install")
        {
            return CargoState {
                ok: false,
                toolchain: true,
                text: format!(
                    "the Rust toolchain {pin} pinned in harness-kit/rust/rust-toolchain.toml is not installed. Run: rustup toolchain install {pin} --profile minimal -c clippy -c rustfmt  (a download from static.rust-lang.org), or run this again with --fetch to let rustup install it. ({})",
                    first_line(&t, 160)
                ),
            };
        }
        return CargoState {
            ok: false,
            toolchain: false,
            text: format!(
                "cargo --version failed (exit {}): {}",
                status_text(r.status),
                first_line(&t, 200)
            ),
        };
    }
    CargoState {
        ok: true,
        toolchain: false,
        text: r.stdout.trim().to_owned(),
    }
}

/// An exit code as text (`null` when the process was stopped by a signal).
#[must_use]
pub fn status_text(s: Option<i32>) -> String {
    s.map_or_else(|| "null".to_owned(), |c| c.to_string())
}

/// A crate `Cargo.lock` names from a registry.
#[derive(Debug)]
pub struct Crate {
    /// Its name.
    pub name: String,
    /// Its version.
    pub version: String,
    /// Its source.
    pub source: String,
}

/// The crates `Cargo.lock` names that come from a registry.
#[must_use]
pub fn locked_crates(rust_dir: &Path) -> Vec<Crate> {
    let Ok(text) = std::fs::read_to_string(rust_dir.join("Cargo.lock")) else {
        return Vec::new();
    };
    let (Ok(split), Ok(name), Ok(version), Ok(source)) = (
        Regex::new(r"\r?\n\[\[package\]\]\r?\n"),
        Regex::new(r#"(?m)^name\s*=\s*"([^"]*)""#),
        Regex::new(r#"(?m)^version\s*=\s*"([^"]*)""#),
        Regex::new(r#"(?m)^source\s*=\s*"([^"]*)""#),
    ) else {
        return Vec::new();
    };
    let get = |re: &Regex, block: &str| {
        re.captures(block)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().to_owned())
    };
    split
        .split(&text)
        .skip(1)
        .filter_map(|block| {
            let src = get(&source, block)?;
            src.starts_with("registry+").then(|| Crate {
                name: get(&name, block).unwrap_or_else(|| "null".to_owned()),
                version: get(&version, block).unwrap_or_else(|| "null".to_owned()),
                source: src,
            })
        })
        .collect()
}

fn mtime(m: &std::fs::Metadata) -> Duration {
    m.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .unwrap_or_default()
}

/// The newest change time under `p` (a file's own), skipping `target` and names starting with `.`.
fn newest(p: &Path) -> Duration {
    let Ok(m) = std::fs::metadata(p) else {
        return Duration::ZERO;
    };
    if !m.is_dir() {
        return mtime(&m);
    }
    let Ok(rd) = std::fs::read_dir(p) else {
        return Duration::ZERO;
    };
    rd.flatten()
        .filter(|e| {
            let n = e.file_name();
            let n = n.to_string_lossy();
            n != "target" && !n.starts_with('.')
        })
        .map(|e| newest(&e.path()))
        .max()
        .unwrap_or_default()
}

/// A kit program: built (its file exists) and fresh (newer than its crate, kit-core, Cargo.toml and Cargo.lock).
#[derive(Debug)]
pub struct Program {
    /// The hook it runs.
    pub hook: &'static Hook,
    /// Its path as wired.
    pub file: String,
    /// True when its file exists.
    pub built: bool,
    /// True when built and not older than its sources.
    pub fresh: bool,
}

/// The state of every kit program.
#[must_use]
pub fn program_state(clone_abs: &Path, clone: &str) -> Vec<Program> {
    let rd = clone_abs.join("harness-kit").join("rust");
    let common = [
        newest(&rd.join("crates").join("kit-core")),
        newest(&rd.join("Cargo.toml")),
        newest(&rd.join("Cargo.lock")),
    ]
    .into_iter()
    .max()
    .unwrap_or_default();
    KIT.iter()
        .map(|k| {
            let file = program_path(clone, k.program);
            let (built, time) = match std::fs::metadata(&file) {
                Ok(m) => (m.is_file(), mtime(&m)),
                Err(_) => (false, Duration::ZERO),
            };
            let src = common.max(newest(&rd.join("crates").join(k.program)));
            Program {
                hook: k,
                file,
                built,
                fresh: built && time >= src,
            }
        })
        .collect()
}
