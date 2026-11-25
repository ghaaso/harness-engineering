//! Where a hook program runs: its arguments, the clone of the harness repository, and kit mode, as
//! `.claude/hooks/kit-mode.mjs` works kit mode out.
//!
//! The program is wired as
//! `"<clone>/harness-kit/rust/target/release/kit-<hook>" --harness-kit "--clone=<clone>" "--project=<project>"
//! [--no-usage-tool]`. Without `--harness-kit` it behaves as its JavaScript hook does on the owner's PC.

use crate::paths;
use std::path::{Path, PathBuf};

/// The argument that turns kit mode on.
pub const MARK: &str = "--harness-kit";

/// The file whose folder marks a clone when `--clone=` is not given: `<clone>/.claude/hooks/tier-routes.json`.
const CLONE_MARK: [&str; 3] = [".claude", "hooks", "tier-routes.json"];

/// What a hook program knows before it reads its input.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Context {
    /// The program's arguments after its name, as text, without the `--clone=` ones.
    pub args: Vec<String>,
    /// The clone: the last `--clone=<folder>` (resolved as Node's `path.resolve` does, not made real); without it the
    /// nearest folder above the program that holds `.claude/hooks/tier-routes.json`; without that the program's
    /// own folder (files read from the clone are then missing, and the hook fails as its JavaScript one does when
    /// they are).
    pub clone: PathBuf,
    /// The current folder, against which relative paths are resolved.
    pub cwd: PathBuf,
    /// `Some` with `--harness-kit`.
    pub kit: Option<Kit>,
}

/// Kit mode's folders (CONTRACT.md section 2). Every path is absolute.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Kit {
    /// `--project=<folder>` or `--project <folder>` (the last one; trimmed; resolved), else the clone.
    pub project: PathBuf,
    /// `<project>/.harness`: state files, `WIDTHS.md`, `basis.json`, `kit.json`.
    pub state: PathBuf,
    /// `<project>/.harness/briefs`.
    pub briefs: PathBuf,
    /// `<project>/.claude/logs`.
    pub logs: PathBuf,
    /// `false` with `--no-usage-tool`.
    pub usage_tool: bool,
}

impl Context {
    /// The context of the running program: `std::env::args_os` (text that is not UTF-8 is replaced, never a
    /// panic), the program's own path, and the current folder.
    #[must_use]
    pub fn from_env() -> Self {
        let args: Vec<String> = std::env::args_os()
            .skip(1)
            .map(|a| a.to_string_lossy().into_owned())
            .collect();
        let exe = std::env::current_exe().ok();
        Self::from_parts(args, exe.as_deref(), &paths::cwd())
    }

    /// The context for the given arguments (after the program's name), program path and current folder.
    #[must_use]
    pub fn from_parts(raw: Vec<String>, exe: Option<&Path>, cwd: &Path) -> Self {
        let mut clone_arg: Option<String> = None;
        let mut args = Vec::with_capacity(raw.len());
        for a in raw {
            match a.strip_prefix("--clone=") {
                Some(v) if !v.is_empty() => clone_arg = Some(v.to_owned()),
                Some(_) => {}
                None => args.push(a),
            }
        }
        let clone = match clone_arg {
            Some(c) => paths::resolve(cwd, &[&c]),
            None => find_clone(exe, cwd),
        };
        let kit = args
            .iter()
            .any(|a| a == MARK)
            .then(|| kit_of(&args, &clone, cwd));
        Self {
            args,
            clone,
            cwd: cwd.to_path_buf(),
            kit,
        }
    }

    /// True when `flag` is one of the arguments, exactly.
    #[must_use]
    pub fn has(&self, flag: &str) -> bool {
        self.args.iter().any(|a| a == flag)
    }

    /// `<clone>/.claude/hooks`: where the JavaScript hooks and the files that ship beside them (`tier-routes.json`)
    /// are.
    #[must_use]
    pub fn hooks_dir(&self) -> PathBuf {
        self.clone.join(".claude").join("hooks")
    }

    /// The logs folder: `<project>/.claude/logs` in kit mode, else `<clone>/.claude/logs` (beside the hooks, where a
    /// JavaScript hook in `.claude/hooks/` writes `../logs`).
    #[must_use]
    pub fn logs(&self) -> PathBuf {
        match &self.kit {
            Some(k) => k.logs.clone(),
            None => self.clone.join(".claude").join("logs"),
        }
    }
}

/// The nearest folder above the program holding `.claude/hooks/tier-routes.json`, else the program's folder.
fn find_clone(exe: Option<&Path>, cwd: &Path) -> PathBuf {
    let Some(dir) = exe.and_then(Path::parent) else {
        return cwd.to_path_buf();
    };
    let dir = paths::resolve(cwd, &[&dir.to_string_lossy()]);
    dir.ancestors()
        .find(|d| {
            CLONE_MARK
                .iter()
                .fold(d.to_path_buf(), |p, n| p.join(n))
                .is_file()
        })
        .map_or_else(|| dir.clone(), Path::to_path_buf)
}

/// kit-mode.mjs's `kitMode`: the project from `--project=<f>` or `--project <f>` (the second form only when the next
/// argument is not empty and does not start with `--`); the last one counts; blank means the clone.
fn kit_of(args: &[String], clone: &Path, cwd: &Path) -> Kit {
    let mut project: Option<&str> = None;
    for (i, a) in args.iter().enumerate() {
        if let Some(v) = a.strip_prefix("--project=") {
            project = Some(v);
        } else if a == "--project" {
            let next = i.checked_add(1).and_then(|n| args.get(n));
            if let Some(n) = next.filter(|n| !n.is_empty() && !n.starts_with("--")) {
                project = Some(n);
            }
        }
    }
    let project = match project.map(crate::js::trim).filter(|p| !p.is_empty()) {
        Some(p) => paths::resolve(cwd, &[p]),
        None => clone.to_path_buf(),
    };
    let state = project.join(".harness");
    Kit {
        briefs: state.join("briefs"),
        logs: project.join(".claude").join("logs"),
        state,
        usage_tool: !args.iter().any(|a| a == "--no-usage-tool"),
        project,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ctx(args: &[&str]) -> Context {
        let cwd = paths::cwd();
        let mut all = vec![format!("--clone={}", cwd.join("clone").display())];
        all.extend(args.iter().map(|a| (*a).to_owned()));
        Context::from_parts(all, None, &cwd)
    }

    #[test]
    fn without_the_mark_there_is_no_kit_mode() {
        let c = ctx(&["--project=x"]);
        assert!(c.kit.is_none());
        assert_eq!(
            c.logs(),
            paths::cwd().join("clone").join(".claude").join("logs")
        );
    }

    #[test]
    fn kit_mode_puts_logs_and_state_under_the_project() {
        let c = ctx(&[MARK, "--project=her"]);
        let p = paths::cwd().join("her");
        assert_eq!(c.logs(), p.join(".claude").join("logs"));
        assert_eq!(c.kit.map(|k| k.state), Some(p.join(".harness")));
    }

    #[test]
    fn project_as_two_arguments_and_the_last_one_counts() {
        let c = ctx(&[MARK, "--project=a", "--project", "b"]);
        assert_eq!(c.kit.map(|k| k.project), Some(paths::cwd().join("b")));
    }

    #[test]
    fn project_followed_by_a_flag_is_not_taken() {
        let c = ctx(&[MARK, "--project", "--no-usage-tool"]);
        let k = c.kit;
        assert_eq!(
            k.as_ref().map(|k| k.project.clone()),
            Some(paths::cwd().join("clone"))
        );
        assert_eq!(k.map(|k| k.usage_tool), Some(false));
    }

    #[test]
    fn a_blank_project_means_the_clone() {
        let c = ctx(&[MARK, "--project=  "]);
        assert_eq!(c.kit.map(|k| k.project), Some(paths::cwd().join("clone")));
    }

    #[test]
    fn the_clone_argument_is_not_left_among_the_arguments() {
        let c = ctx(&[MARK]);
        assert_eq!(c.args, vec![MARK.to_owned()]);
        assert!(c.has(MARK));
    }
}
