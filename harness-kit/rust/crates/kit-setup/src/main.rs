//! kit-setup: builds the kit's programs (Rust) and wires its hooks into one project's per-machine settings file,
//! `<project>/.claude/settings.local.json`. Started by `harness-kit/setup.sh` (macOS, Linux) or
//! `harness-kit\setup.cmd` (Windows), which run it with `cargo run`:
//!
//! ```text
//! setup [--project <folder>] [--no-usage-tool]                 dry run: prints what it would do, changes nothing
//! setup --apply [--project <folder>] [--no-usage-tool] [--fetch]
//! setup --status [--project <folder>]                          what is wired there, built, fresh, configured
//! setup --remove [--project <folder>]                          takes out exactly what --apply added
//! ```
//!
//! The clone is `--clone=<folder>` if given, else the nearest folder above this program that holds
//! `.claude/hooks/tier-routes.json`; the project is `--project` (else the clone).
//!
//! `--apply` first builds the workspace: `cargo build --release --locked --offline` in `harness-kit/rust`, into
//! `harness-kit/rust/target` (`CARGO_TARGET_DIR` is set to it, so the wired paths hold), every crate but this one
//! (it is running). Offline, nothing is downloaded and rustup installs no toolchain (`RUSTUP_AUTO_INSTALL=0`). If a
//! crate or the pinned toolchain is not on the machine it prints what would be fetched and from where, and stops;
//! `--fetch` runs the same build without `--offline`. Then it refuses to wire a program that is not built.
//!
//! Each hook is wired as (`.exe` on Windows; paths with forward slashes, in double quotes)
//! `"<clone>/harness-kit/rust/target/release/kit-<hook>" --harness-kit "--clone=<clone>" "--project=<project>"`,
//! with `--no-usage-tool` added to the fan-out gate when asked. `--harness-kit` marks the kit's entries: `--remove`
//! takes out every hook entry that holds it as a word, drops a group or event list it left empty, and leaves every
//! other key as it was. `--apply` takes the marked entries out first, then adds them fresh.
//!
//! `--apply` also writes the settings of `own.rs` where the file has none of its own, makes `<project>/.harness/`
//! with `kit.json` (a copy of `harness-kit/parallel/kit.example.json`), `WIDTHS.md` and `briefs/`, never
//! overwriting a file there. It writes nothing else: never `.claude/settings.json`, never `.gitignore` (it prints the
//! lines git should ignore), no git setting.

mod build;
mod json;
mod own;
mod wiring;

#[cfg(test)]
mod tests;

use build::{Cargo, RealCargo, call_in, cargo_state, locked_crates, program_state, status_text};
use json::J;
use kit_core::{context::Context, paths, regex::Regex};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode};
use wiring::{COMMANDS, KIT, MARK, add_kit, command_for, kit_entries, program_path, strip_kit};

/// Files a clone must hold for `--apply`.
const NEEDS: [&str; 3] = [
    ".claude/hooks/tier-routes.json",
    "harness-kit/rust/Cargo.toml",
    "harness-kit/rust/Cargo.lock",
];

const USAGE: &str = "usage: harness-kit/setup.sh (Windows: harness-kit\\setup.cmd) [--apply [--fetch] | --status | --remove] [--project <folder>] [--no-usage-tool]";

/// What `--apply` makes under `<project>/.harness`, explained in the file it writes.
pub const WIDTHS_TEXT: &str = r#"# Declared widths and holds (read by the count gate, kit-count-gate)

This file declares nothing yet. Whatever it says, the count gate refuses a helper start that would pass the app's
limit of 20 helpers at once, helpers of helpers counted; a declaration here only narrows that.

A declaration is a line that starts at its first column (a "- " or "* " before it is allowed), in one of two forms:

    width "<pattern>" <n>: <reason>
    hold "<pattern>" while "<pattern>": <reason>

- The first form: at most n running helpers whose description matches the pattern.
- The second form: no new helper matching the first pattern starts while one matching the second runs.

A pattern is matched against a helper's whole description, case and runs of spaces ignored; * is any text and ? one
character. The reason names the plan line or the measurement it rests on, carries a number, and is 12 characters or
more. A line that starts like a declaration but does not parse makes the gate refuse every start until it is fixed or
removed. Indented and fenced lines, like the ones in this file, are examples and are not read. Remove a line to lift it.

Examples (indented, so not read):

    width "build:*" 4: four builders at once; the test queue has 4 slots (measured on this machine, date)
    hold "refute:*" while "build:*": a refuter reads the built files, so 1 build unit finishes first
"#;

/// Lines git should ignore in the project, each with a sample path under it.
const IGNORE: [(&str, &str); 4] = [
    (".claude/settings.local.json", ".claude/settings.local.json"),
    (".claude/logs/x", ".claude/logs/"),
    (".harness/lane/x", ".harness/lane/"),
    (".harness/lane-measure/x", ".harness/lane-measure/"),
];

/// Where the set-up runs: the current folder and the cargo it calls.
pub struct Env<'a> {
    /// The current folder.
    pub cwd: PathBuf,
    /// cargo.
    pub cargo: &'a dyn Cargo,
}

/// How a run ended: its exit code and what it wrote.
#[derive(Debug)]
pub struct Ended {
    /// The exit code.
    pub code: u8,
    /// Standard output.
    pub out: String,
    /// Standard error.
    pub err: String,
}

impl Ended {
    fn finish(self) -> ExitCode {
        let mut o = std::io::stdout().lock();
        o.write_all(self.out.as_bytes())
            .and_then(|()| o.flush())
            .unwrap_or_default();
        let mut e = std::io::stderr().lock();
        e.write_all(self.err.as_bytes())
            .and_then(|()| e.flush())
            .unwrap_or_default();
        ExitCode::from(self.code)
    }
}

fn main() -> ExitCode {
    let ctx = Context::from_env();
    let env = Env {
        cwd: ctx.cwd.clone(),
        cargo: &RealCargo,
    };
    run(&ctx.args, &ctx.clone, &env).finish()
}

/// The parsed arguments.
#[derive(Debug, Default)]
struct Opts {
    apply: bool,
    remove: bool,
    status: bool,
    fetch: bool,
    no_usage: bool,
    project: Option<String>,
    bad: Vec<String>,
}

fn parse_args(argv: &[String]) -> Opts {
    let mut o = Opts::default();
    let mut it = argv.iter().peekable();
    while let Some(a) = it.next() {
        match a.as_str() {
            "--apply" => o.apply = true,
            "--remove" => o.remove = true,
            "--status" => o.status = true,
            "--fetch" => o.fetch = true,
            "--no-usage-tool" => o.no_usage = true,
            "--project" if it.peek().is_some() => o.project = it.next().cloned(),
            _ => match a.strip_prefix("--project=").filter(|v| !v.is_empty()) {
                Some(v) => o.project = Some(v.to_owned()),
                None => o.bad.push(a.clone()),
            },
        }
    }
    if [o.apply, o.remove, o.status].iter().filter(|b| **b).count() > 1 {
        o.bad
            .push("only one of --apply, --status, --remove".to_owned());
    }
    if o.fetch && !o.apply {
        o.bad.push("--fetch goes with --apply".to_owned());
    }
    o
}

/// The set-up with these arguments (after the program's name, without `--clone=`) for the clone `clone_abs`.
#[must_use]
pub fn run(args: &[String], clone_abs: &Path, env: &Env) -> Ended {
    let o = parse_args(args);
    if !o.bad.is_empty() {
        return Ended {
            code: 1,
            out: String::new(),
            err: format!("setup: {}\n{USAGE}\n", o.bad.join("; ")),
        };
    }
    let mut out = Out::default();
    match go(&o, clone_abs, env, &mut out) {
        Ok(code) => Ended {
            code,
            out: out.0,
            err: String::new(),
        },
        Err(msg) => Ended {
            code: 1,
            out: out.0,
            err: format!("setup: {msg}\n"),
        },
    }
}

/// Standard output, a line at a time.
#[derive(Default)]
struct Out(String);

impl Out {
    fn line(&mut self, s: &str) {
        self.0.push_str(s);
        self.0.push('\n');
    }
}

/// The path as it goes into a command: forward slashes; refused if it holds a character the double quotes do not
/// hold as itself in sh (`"`, `$`, a backtick, `\`) or a line break.
fn quoted_path(abs: &Path, what: &str) -> Result<String, String> {
    let p = paths::slashes(abs);
    if p.contains(['"', '$', '`', '\\', '\r', '\n']) {
        return Err(format!(
            "{what} {p} holds a character (\" $ ` \\ or a line break) that cannot stand inside double quotes in a hook command; use a plain path"
        ));
    }
    Ok(p)
}

/// The file's path from the current folder when it lies under it, else the whole path.
fn rel_text(cwd: &Path, file: &Path) -> String {
    file.strip_prefix(cwd)
        .ok()
        .filter(|r| !r.as_os_str().is_empty())
        .map_or_else(|| file.display().to_string(), |r| r.display().to_string())
}

fn read_settings(file: &Path, rel: &str) -> Result<(J, bool), String> {
    if !file.exists() {
        return Ok((J::obj(), false));
    }
    let bytes =
        std::fs::read(file).map_err(|e| format!("{rel} cannot be read ({e}); nothing changed."))?;
    let text = String::from_utf8_lossy(&bytes);
    let before = if kit_core::js::trim(&text).is_empty() {
        J::obj()
    } else {
        json::parse(&text).map_err(|e| {
            format!(
                "{rel} is not valid JSON ({e}); nothing changed. Fix or move it, then run again."
            )
        })?
    };
    if !before.is_obj() {
        return Err(format!(
            "{rel} does not hold a JSON object; nothing changed."
        ));
    }
    if let Some(h) = before.get("hooks") {
        let ok = matches!(h, J::Obj(e) if e.iter().all(|(_, v)| matches!(v, J::Arr(_))));
        if !ok {
            return Err(format!(
                "\"hooks\" in {rel} is not an object of event lists; nothing changed."
            ));
        }
    }
    let bad: Vec<String> = ["skillOverrides", "permissions", "env", "modelSettings"]
        .iter()
        .filter(|k| {
            before.get(k).is_some_and(|v| {
                let deny_ok =
                    **k != "permissions" || matches!(v.get("deny"), None | Some(J::Arr(_)));
                !(v.is_obj() && deny_ok)
            })
        })
        .map(|k| format!("\"{k}\""))
        .collect();
    if !bad.is_empty() {
        return Err(format!(
            "{} in {rel} has an unexpected shape; nothing changed.",
            bad.join(", ")
        ));
    }
    Ok((before, true))
}

fn git_ignored(root: &Path, rel: &str) -> Option<bool> {
    let r = Command::new("git")
        .args(["check-ignore", "-q", "--no-index", rel])
        .current_dir(root)
        .output()
        .ok()?;
    match r.status.code() {
        Some(0) => Some(true),
        Some(1) => Some(false),
        _ => None,
    }
}

/// What `--apply` makes under the project: (path, a folder?, copied from, text).
fn harness_items(
    clone_abs: &Path,
) -> [(&'static str, bool, Option<PathBuf>, Option<&'static str>); 3] {
    [
        (
            ".harness/kit.json",
            false,
            Some(
                clone_abs
                    .join("harness-kit")
                    .join("parallel")
                    .join("kit.example.json"),
            ),
            None,
        ),
        (".harness/WIDTHS.md", false, None, Some(WIDTHS_TEXT)),
        (".harness/briefs", true, None, None),
    ]
}

fn matcher_text(m: &J) -> String {
    m.as_str().map_or_else(|| m.compact(), str::to_owned)
}

/// The first word of a command in double quotes (`^\s*"([^"]+)"`), or empty.
fn quoted_target(command: &str) -> String {
    command
        .trim_start_matches(kit_core::js::is_space)
        .strip_prefix('"')
        .and_then(|r| r.split_once('"'))
        .map(|(t, _)| t.to_owned())
        .unwrap_or_default()
}

fn write_settings(file: &Path, after: &J) -> Result<(), String> {
    let mut tmp = file.as_os_str().to_owned();
    tmp.push(".harness-kit-tmp");
    let tmp = PathBuf::from(tmp);
    std::fs::write(&tmp, format!("{}\n", after.pretty()))
        .and_then(|()| std::fs::rename(&tmp, file))
        .map_err(|e| format!("could not write {}: {e}", paths::slashes(file)))
}

fn go(o: &Opts, clone_abs: &Path, env: &Env, out: &mut Out) -> Result<u8, String> {
    let clone = quoted_path(clone_abs, "the clone's path")?;
    let mut project_abs = clone_abs.to_path_buf();
    if let Some(p) = &o.project {
        project_abs = paths::resolve(&env.cwd, &[p]);
        if !project_abs.is_dir() {
            return Err(format!(
                "the project {} is not a folder; nothing changed.",
                paths::slashes(&project_abs)
            ));
        }
    }
    let project = quoted_path(&project_abs, "the project's path")?;
    let is_clone = paths::key(&project_abs) == paths::key(clone_abs);
    let rust_dir = clone_abs.join("harness-kit").join("rust");
    let file = project_abs.join(".claude").join("settings.local.json");
    if o.status {
        return status(clone_abs, &clone, &project_abs, &project, &file, out);
    }
    if !o.remove {
        let missing: Vec<&str> = NEEDS
            .iter()
            .copied()
            .filter(|f| !clone_abs.join(f).exists())
            .collect();
        if !missing.is_empty() {
            return Err(format!(
                "not found in {clone}: {}. Run this from a clone that holds the kit.",
                missing.join(", ")
            ));
        }
    }
    let (before, existed) = read_settings(&file, &rel_text(&env.cwd, &file))?;
    let items = if o.remove || !is_clone {
        own::Items::default()
    } else {
        own::fixflow_items(clone_abs)
    };
    let after = if o.remove {
        own::strip_own(&strip_kit(&before))
    } else {
        own::add_own(
            &add_kit(&before, &clone, &project, o.no_usage),
            &items,
            is_clone,
        )
    };
    let rec_of = |s: &J| own::read_record(s).unwrap_or_default();
    let fslash = paths::slashes(&file);

    out.line(&format!("clone: {clone}"));
    out.line(&format!(
        "project: {project}{}",
        if is_clone { " (the clone)" } else { "" }
    ));
    out.line(&format!(
        "settings file: {fslash} ({})",
        if existed { "exists, merged" } else { "new" }
    ));

    let found = kit_entries(&before).len();
    if o.remove {
        let r = rec_of(&before);
        out.line(&format!(
            "kit entries found: {found}; FixFlow switched off by the kit: {} skills, {} agents; settings added by the kit: {}; all taken out, every other entry stays.",
            r.skills.len(),
            r.deny.len(),
            r.settings()
        ));
        out.line(&format!("{project}/.harness/ is left as it is: it is yours (delete it by hand if you want it gone)."));
        if !existed {
            out.line("nothing to remove: no settings file.");
            return Ok(0);
        }
        if found == 0 && own::read_record(&before).is_none() {
            out.line("nothing to remove: no kit entries; the file is unchanged.");
            return Ok(0);
        }
        if after.is_empty_obj() {
            std::fs::remove_file(&file).map_err(|e| format!("could not delete {fslash}: {e}"))?;
            out.line("removed: the file held only the kit entries, so it is deleted.");
            return Ok(0);
        }
        write_settings(&file, &after)?;
        out.line("removed: the kit entries are out.");
        return Ok(0);
    }

    // ---- what would be wired ----
    let progs = program_state(clone_abs, &clone);
    out.line(&format!(
        "kit entries: {} (marked {MARK}; {found} old ones replaced){}",
        KIT.len(),
        if o.no_usage {
            "; --no-usage-tool: the fan-out gate's meter rule is off"
        } else {
            ""
        }
    ));
    for p in &progs {
        let k = p.hook;
        let m = k
            .matcher
            .map(|m| format!("  matcher \"{m}\""))
            .unwrap_or_default();
        out.line(&format!(
            "  {}{m}  {}",
            k.event,
            command_for(&clone, &project, k, o.no_usage)
        ));
        let state = match (p.built, p.fresh) {
            (true, true) => "built, newer than its sources",
            (true, false) => "built, older than its sources",
            _ => "not built",
        };
        out.line(&format!("      program: {state}"));
    }
    let r = rec_of(&after);
    if is_clone {
        out.line(&format!(
            "archived FixFlow material switched off: {} skills (skillOverrides \"off\"), {} agents (permissions.deny) of {} skill folders and {} fixflow-* agents found; any you had set already are left as yours.",
            r.skills.len(),
            r.deny.len(),
            items.skills.len(),
            items.agents.len()
        ));
    } else {
        out.line("FixFlow: the project is not the clone; there is nothing of the archived FixFlow material to switch off there.");
    }
    let state = |added: bool| {
        if added {
            "added"
        } else {
            "yours, left as it is"
        }
    };
    out.line(
        "settings the kit adds where the file has none of its own (--remove takes them out again):",
    );
    out.line(&format!(
        "  env.{} \"{}\": a helper's own helpers can run in the background  [{}]",
        own::FORK.0,
        own::FORK.1,
        state(!r.env.is_empty())
    ));
    out.line(&format!(
        "  modelSettings.{} {}: the Opus window the window ceiling's lines were measured under  [{}]",
        own::OPUS,
        own::window_entry().compact(),
        state(!r.models.is_empty())
    ));
    out.line(&format!(
        "  {} 1: the archived skills' listing cut to almost nothing (it costs about 8,000 tokens a session)  [{}]",
        own::LISTING.0,
        if is_clone { state(!r.keys.is_empty()) } else { "the clone only: not set here" }
    ));
    let make: Vec<String> = harness_items(clone_abs)
        .iter()
        .filter(|it| !project_abs.join(it.0).exists())
        .map(|it| format!("{}{}", it.0, if it.1 { "/" } else { "" }))
        .collect();
    if make.is_empty() {
        out.line("the project's .harness/ already holds kit.json, WIDTHS.md and briefs/; nothing there is touched.");
    } else {
        out.line(&format!(
            "to make in the project (never overwritten): {}",
            make.join(", ")
        ));
    }

    let cs = cargo_state(env.cargo, &rust_dir);
    let mut build_args = vec!["build", "--release", "--locked"];
    if !o.fetch {
        build_args.push("--offline");
    }
    build_args.extend(["--workspace", "--exclude", "kit-setup"]);
    out.line(&format!("cargo: {}", cs.text));
    out.line(&format!(
        "build: cargo {}  (in {clone}/harness-kit/rust, into its target/)",
        build_args.join(" ")
    ));
    out.line("commands, run by their built paths (built by --apply):");
    for (name, what) in COMMANDS {
        out.line(&format!(
            "  {name:<10}  \"{}\"  {what}",
            program_path(&clone, name)
        ));
    }

    for (path, line) in IGNORE {
        match git_ignored(&project_abs, path) {
            Some(false) => out.line(&format!(
                "git does not ignore {line}: add this line to the project's .gitignore (this script does not edit it):  {line}"
            )),
            None => out.line(&format!("could not ask git whether {line} is ignored in the project; make sure it is.")),
            Some(true) => {}
        }
    }
    out.line(".harness/ (kit.json, WIDTHS.md, briefs/, state files) is yours to commit or not.");

    if !o.apply {
        out.line("dry run: nothing changed. Run with --apply to build and write it, --status to see what is wired, --remove to undo it.");
        return Ok(0);
    }

    // ---- --apply: build, check, write ----
    if !cs.ok && !(cs.toolchain && o.fetch) {
        return Err(format!("{}\nnothing changed.", cs.text));
    }
    let crates = locked_crates(&rust_dir);
    let crate_list = |sep: &str, lead: &str| {
        crates
            .iter()
            .map(|c| format!("{lead}{} {}", c.name, c.version))
            .collect::<Vec<_>>()
            .join(sep)
    };
    if o.fetch {
        out.line(&format!(
            "--fetch: cargo may download {} crates that Cargo.lock names, from crates.io ({}), and rustup the pinned toolchain if it is missing.",
            crates.len(),
            crate_list(", ", "")
        ));
    }
    out.line("building the hook programs (the first build takes a minute or two) ...");
    let b = env.cargo.call(&call_in(&rust_dir, &build_args, o.fetch));
    if b.error.is_some() || b.status != Some(0) {
        let t = format!("{}{}", b.stderr, b.stdout);
        let t = t.trim();
        let lines: Vec<&str> = t.split('\n').collect();
        let tail = lines
            .get(lines.len().saturating_sub(12)..)
            .unwrap_or_default()
            .join("\n");
        let needs = Regex::new(r"(?i)offline|no matching package|failed to (?:download|load source)|toolchain .*not installed")
            .is_ok_and(|re| re.is_match(t));
        if !o.fetch && needs {
            let source = crates.first().map_or("registry", |c| c.source.as_str());
            return Err(format!(
                "the build needs something that is not on this machine (offline, nothing is downloaded):\n{tail}\nCargo.lock names {} crates; they come from crates.io ({source}):\n{}\nRun again with --apply --fetch to download them. Nothing changed.",
                crates.len(),
                crate_list("\n", "  ")
            ));
        }
        let why = b
            .error
            .unwrap_or_else(|| format!("exit {}", status_text(b.status)));
        return Err(format!(
            "the build failed ({why}):\n{tail}\nNothing changed."
        ));
    }
    let built = program_state(clone_abs, &clone);
    let not_built: Vec<&str> = built
        .iter()
        .filter(|p| !p.built)
        .map(|p| p.file.as_str())
        .collect();
    if !not_built.is_empty() {
        return Err(format!(
            "the build ran but these programs are not there, so they are not wired: {}. Nothing changed.",
            not_built.join(", ")
        ));
    }
    out.line(&format!(
        "built: {} programs in {clone}/harness-kit/rust/target/release",
        built.len()
    ));

    if let Some(dir) = file.parent() {
        std::fs::create_dir_all(dir)
            .map_err(|e| format!("could not make {}: {e}", paths::slashes(dir)))?;
    }
    write_settings(&file, &after)?;
    out.line(&format!("wrote {fslash}"));
    for (rel, is_dir, from, text) in harness_items(clone_abs) {
        let dest = project_abs.join(rel);
        if dest.exists() {
            continue;
        }
        let made = if is_dir {
            std::fs::create_dir_all(&dest)
        } else {
            if let Some(from) = from.as_ref().filter(|f| !f.exists()) {
                out.line(&format!(
                    "not made: {rel} (its example {} is missing)",
                    paths::slashes(from)
                ));
                continue;
            }
            let body = match (&from, text) {
                (Some(f), _) => std::fs::read(f),
                (None, t) => Ok(t.unwrap_or_default().as_bytes().to_vec()),
            };
            dest.parent()
                .map_or(Ok(()), std::fs::create_dir_all)
                .and(body)
                .and_then(|b| {
                    std::fs::OpenOptions::new()
                        .write(true)
                        .create_new(true)
                        .open(&dest)
                        .and_then(|mut f| f.write_all(&b))
                })
        };
        made.map_err(|e| format!("could not make {project}/{rel}: {e}"))?;
        out.line(&format!(
            "made: {project}/{rel}{}",
            if is_dir { "/" } else { "" }
        ));
    }
    out.line("applied: start a new Claude Code session in the project for the hooks to load. Check it with --status.");
    Ok(0)
}

fn status(
    clone_abs: &Path,
    clone: &str,
    project_abs: &Path,
    project: &str,
    file: &Path,
    out: &mut Out,
) -> Result<u8, String> {
    let (before, existed) = read_settings(file, &file.display().to_string())?;
    let ents = kit_entries(&before);
    let progs = program_state(clone_abs, clone);
    let mut bad = 0usize;
    let mut add_bad = || bad = bad.saturating_add(1);
    out.line(&format!("clone: {clone}"));
    out.line(&format!("project: {project}"));
    out.line(&format!(
        "settings file: {} ({}); kit entries: {}",
        paths::slashes(file),
        if existed { "exists" } else { "missing" },
        ents.len()
    ));
    for p in &progs {
        let k = p.hook;
        let mine: Vec<&wiring::Entry> = ents.iter().filter(|e| e.hook == Some(k.hook)).collect();
        if mine.is_empty() {
            add_bad();
            out.line(&format!("  {:<15} NOT WIRED", k.hook));
            continue;
        }
        for e in &mine {
            let target = quoted_target(&e.command);
            let exists = !target.is_empty() && Path::new(&target).exists();
            let is_prog = target == p.file;
            let ok_match = e.event == k.event
                && e.matcher.as_ref().and_then(J::as_str) == k.matcher
                && (k.matcher.is_some() || e.matcher.is_none());
            let state = if !exists {
                "its program file is MISSING".to_owned()
            } else if !is_prog {
                format!("runs {target}, not the kit's program")
            } else if p.fresh {
                "built, newer than its sources".to_owned()
            } else {
                "built, OLDER than its sources (run --apply to rebuild)".to_owned()
            };
            if !exists || !is_prog || !p.fresh || !ok_match {
                add_bad();
            }
            out.line(&format!(
                "  {:<15} wired  {}{}{}  {state}{}",
                k.hook,
                e.event,
                e.matcher
                    .as_ref()
                    .map(|m| format!(" \"{}\"", matcher_text(m)))
                    .unwrap_or_default(),
                if ok_match {
                    ""
                } else {
                    " (WRONG event or matcher)"
                },
                if e.command.contains("--no-usage-tool") {
                    "  --no-usage-tool"
                } else {
                    ""
                }
            ));
        }
        if mine.len() > 1 {
            add_bad();
            out.line(&format!("  {:<15} wired {} times", k.hook, mine.len()));
        }
    }
    for e in ents.iter().filter(|e| e.hook.is_none()) {
        out.line(&format!("  marked entry for no kit hook: {}", e.command));
    }
    for (rel, ..) in harness_items(clone_abs) {
        let there = project_abs.join(rel).exists();
        if !there {
            add_bad();
        }
        out.line(&format!(
            "config {rel}: {}",
            if there { "there" } else { "MISSING" }
        ));
    }
    match own::read_record(&before) {
        Some(r) => {
            out.line(&format!(
                "FixFlow switched off by the kit: {} skills, {} agents",
                r.skills.len(),
                r.deny.len()
            ));
            let names = r.setting_names();
            out.line(&format!(
                "settings added by the kit: {}",
                if names.is_empty() {
                    "none".to_owned()
                } else {
                    names.join(", ")
                }
            ));
        }
        None => {
            out.line("FixFlow switched off by the kit: none");
            out.line("settings added by the kit: none");
        }
    }
    let n = bad;
    out.line(&if n > 0 {
        format!("status: {n} thing(s) not as --apply leaves them.")
    } else {
        "status: every kit hook is wired, built and fresh; the config is there.".to_owned()
    });
    Ok(u8::from(n > 0))
}
