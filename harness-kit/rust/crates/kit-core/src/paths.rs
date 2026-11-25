//! Paths as the JavaScript hooks work them out: Node's `path.resolve`, and `realOf`, `key` and `under` of
//! `.claude/hooks/kit-mode.mjs`.

use std::path::{Component, Path, PathBuf};

/// The process's current folder, or `.` when it cannot be read.
#[must_use]
pub fn cwd() -> PathBuf {
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

/// Node's `path.resolve(base, ...parts)`: each part joined in turn (an absolute part starts again; on Windows a part
/// rooted without a drive keeps the drive), then `.` and `..` removed by text alone, no trailing separator. Empty
/// parts are skipped. Nothing is read from the disk. `base` is absolute (normally [`cwd`]).
#[must_use]
pub fn resolve(base: &Path, parts: &[&str]) -> PathBuf {
    let mut joined = base.to_path_buf();
    for part in parts.iter().filter(|p| !p.is_empty()) {
        joined.push(part);
    }
    normalize(&joined)
}

/// `.` and `..` removed by text alone; `..` above the root is dropped as Node drops it.
#[must_use]
pub fn normalize(path: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    let mut names = 0usize;
    for c in path.components() {
        match c {
            Component::Prefix(_) | Component::RootDir => out.push(c.as_os_str()),
            Component::CurDir => {}
            Component::ParentDir => {
                if names > 0 {
                    out.pop();
                    names = names.saturating_sub(1);
                } else if !out.has_root() {
                    out.push("..");
                }
            }
            Component::Normal(name) => {
                out.push(name);
                names = names.saturating_add(1);
            }
        }
    }
    if out.as_os_str().is_empty() {
        out.push(".");
    }
    out
}

/// The path as text with every `\` turned into `/` (the JavaScript's `.replace(/\\/g, '/')`).
#[must_use]
pub fn slashes(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

/// Windows gives real paths as `\\?\C:\...` or `\\?\UNC\server\...`; Node's `realpathSync.native` gives them
/// without that prefix.
fn plain_form(path: PathBuf) -> PathBuf {
    let text = path.to_string_lossy();
    if let Some(rest) = text.strip_prefix(r"\\?\UNC\") {
        return PathBuf::from(format!(r"\\{rest}"));
    }
    if let Some(rest) = text.strip_prefix(r"\\?\") {
        return PathBuf::from(rest);
    }
    path
}

/// kit-mode's `realOf`: the real path of `path` (links followed, the true case of each name on Windows), or, when it
/// does not exist yet, the real path of its deepest existing folder joined with the rest. A relative path is taken
/// from [`cwd`].
#[must_use]
pub fn real_of(path: &Path) -> PathBuf {
    let start = resolve(&cwd(), &[&path.to_string_lossy()]);
    let mut cur = start.clone();
    let mut rest: Vec<std::ffi::OsString> = Vec::new();
    for _ in 0..256 {
        if let Ok(real) = std::fs::canonicalize(&cur) {
            let mut out = plain_form(real);
            for name in rest.iter().rev() {
                out.push(name);
            }
            return out;
        }
        let (Some(up), Some(name)) = (cur.parent(), cur.file_name()) else {
            return start;
        };
        rest.push(name.to_os_string());
        cur = up.to_path_buf();
    }
    start
}

/// kit-mode's `key`: a form of a path that compares equal for the same file: real, forward slashes, no trailing
/// slash, lower case except on Linux (Windows and macOS usually ignore case).
#[must_use]
pub fn key(path: &Path) -> String {
    let mut text = slashes(&real_of(path));
    if text.encode_utf16().count() > 1 {
        text = text.trim_end_matches('/').to_owned();
    }
    if cfg!(target_os = "linux") {
        text
    } else {
        text.to_lowercase()
    }
}

/// kit-mode's `under`: `Some(rest)` when `path` is `dir` (`Some("")`) or lies under it, `rest` being the path below
/// `dir` with forward slashes, compared through [`key`] (so in lower case off Linux); `None` otherwise.
#[must_use]
pub fn under(path: &Path, dir: &Path) -> Option<String> {
    let a = key(path);
    let d = key(dir);
    if a == d {
        return Some(String::new());
    }
    let prefix = if d.ends_with('/') { d } else { format!("{d}/") };
    a.strip_prefix(&prefix).map(str::to_owned)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_removes_dots_and_joins_parts_as_node_does() {
        let base = cwd();
        let got = resolve(&base, &["a/./b", "..", "c"]);
        assert_eq!(got, base.join("a").join("c"));
    }

    #[test]
    fn resolve_starts_again_at_an_absolute_part() {
        let root = cwd()
            .ancestors()
            .last()
            .map(Path::to_path_buf)
            .unwrap_or_default();
        let abs = root.join("x").join("y");
        let got = resolve(&cwd(), &["ignored", &abs.to_string_lossy(), ".."]);
        assert_eq!(got, root.join("x"));
    }

    #[test]
    fn parent_of_the_root_is_the_root() {
        let root = cwd()
            .ancestors()
            .last()
            .map(Path::to_path_buf)
            .unwrap_or_default();
        assert_eq!(resolve(&root, &["..", ".."]), normalize(&root));
    }

    #[test]
    fn under_gives_the_rest_with_forward_slashes() {
        let dir = cwd();
        let inner = dir.join("not-yet").join("file.md");
        assert_eq!(under(&inner, &dir).as_deref(), Some("not-yet/file.md"));
    }

    #[test]
    fn under_refuses_a_sibling_with_the_same_start() {
        let dir = cwd().join("abc");
        assert_eq!(under(&cwd().join("abcd"), &dir), None);
    }

    #[test]
    fn key_of_a_missing_file_keeps_its_name() {
        let k = key(&cwd().join("No-Such-File.TXT"));
        let want = if cfg!(target_os = "linux") {
            "No-Such-File.TXT"
        } else {
            "no-such-file.txt"
        };
        assert!(k.ends_with(&format!("/{want}")));
    }
}
