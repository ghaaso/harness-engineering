//! Files and folders read as the JavaScript hook reads them (`readFileSync` in a `try`, `readdirSync`).

use std::path::{Path, PathBuf};

/// `readFileSync(p, 'utf8')` in a `try`: `None` where it throws (missing, a folder, no access). Invalid UTF-8
/// becomes U+FFFD, as Node decodes it.
#[must_use]
pub fn read_text(p: &Path) -> Option<String> {
    std::fs::read(p)
        .ok()
        .map(|b| String::from_utf8_lossy(&b).into_owned())
}

/// One entry of a folder.
#[derive(Debug, Clone)]
pub struct Entry {
    /// Its name.
    pub name: String,
    /// True for a folder (not a link to one: `Dirent.isDirectory()`).
    pub is_dir: bool,
}

/// `readdirSync(dir, { withFileTypes: true })`: `None` where it throws. Node (libuv) sorts the names by their bytes
/// everywhere but on Windows, where it keeps the file system's order; so does this.
#[must_use]
pub fn list(dir: &Path) -> Option<Vec<Entry>> {
    let rd = std::fs::read_dir(dir).ok()?;
    let mut out: Vec<Entry> = rd
        .filter_map(Result::ok)
        .map(|e| Entry {
            name: e.file_name().to_string_lossy().into_owned(),
            is_dir: e.file_type().is_ok_and(|t| t.is_dir()),
        })
        .collect();
    if !cfg!(windows) {
        out.sort_by(|a, b| a.name.as_bytes().cmp(b.name.as_bytes()));
    }
    Some(out)
}

/// The fan-out gate's `files(dir, pred)`: every file below `dir` (folders walked depth first, in listing order)
/// whose name `pred` accepts.
pub fn files<F>(dir: &Path, pred: &F, out: &mut Vec<PathBuf>)
where
    F: Fn(&str) -> bool,
{
    for e in list(dir).unwrap_or_default() {
        let p = dir.join(&e.name);
        if e.is_dir {
            files(&p, pred, out);
        } else if pred(&e.name) {
            out.push(p);
        }
    }
}

/// Node's `path.basename(p)` for the paths this hook sees: the last name, `""` when there is none.
#[must_use]
pub fn basename(p: &Path) -> String {
    p.file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default()
}

/// Node's `path.dirname(p)` for the paths this hook sees: the folder above, `.` for a bare name or an empty text,
/// the path itself for a root.
#[must_use]
pub fn dirname(p: &str) -> PathBuf {
    if p.is_empty() {
        return PathBuf::from(".");
    }
    match Path::new(p).parent() {
        Some(up) if up.as_os_str().is_empty() => PathBuf::from("."),
        Some(up) => up.to_path_buf(),
        None => PathBuf::from(p),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dirname_of_a_bare_name_is_dot() {
        assert_eq!(dirname("x.jsonl"), PathBuf::from("."));
        assert_eq!(dirname(""), PathBuf::from("."));
    }

    #[test]
    fn a_missing_folder_lists_nothing() {
        assert!(list(Path::new("no/such/folder/here")).is_none());
    }
}
