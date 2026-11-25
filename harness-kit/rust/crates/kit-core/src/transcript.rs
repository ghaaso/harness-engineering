//! Transcript files (and any text file read by lines), one line at a time, never the whole file at once.
//!
//! [`lines`] yields exactly the pieces of the JavaScript's `(readFileSync(path, 'utf8') || '').split('\n')`: a
//! trailing `\r` stays on its line, the piece after a final newline is an empty line, and a missing or unreadable
//! file is one empty line. [`json_lines`] parses the lines that a filter keeps and skips the broken ones (the
//! JavaScript's `try { JSON.parse(l) } catch {}`).

use crate::input;
use serde_json::Value;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

/// The lines of a text file; see the module's description.
#[derive(Debug)]
pub struct Lines {
    reader: Option<BufReader<File>>,
    /// True once the last piece (the one after the last newline, perhaps empty) has been given.
    done: bool,
}

/// The lines of the file at `path`, read as they are asked for. Invalid UTF-8 becomes U+FFFD, as Node decodes it.
#[must_use]
pub fn lines(path: &Path) -> Lines {
    Lines {
        reader: File::open(path).ok().map(BufReader::new),
        done: false,
    }
}

impl Iterator for Lines {
    type Item = String;

    fn next(&mut self) -> Option<String> {
        if self.done {
            return None;
        }
        let mut buf = Vec::new();
        if let Some(r) = self.reader.as_mut() {
            // A read error ends the file here (the JavaScript reads the whole file or nothing).
            r.read_until(b'\n', &mut buf).unwrap_or_default();
        }
        if buf.last() == Some(&b'\n') {
            buf.pop();
        } else {
            // No newline: the end of the file, so this is the last piece (perhaps empty).
            self.done = true;
        }
        Some(String::from_utf8_lossy(&buf).into_owned())
    }
}

/// The lines of `path` that `keep` accepts, parsed as JSON; lines that do not parse are skipped. `keep` sees the raw
/// line (a cheap test such as `l.starts_with("{\"parentUuid\"")` saves parsing lines that cannot matter).
pub fn json_lines<F>(path: &Path, mut keep: F) -> impl Iterator<Item = Value>
where
    F: FnMut(&str) -> bool,
{
    lines(path).filter_map(move |l| {
        if keep(&l) {
            input::parse_text(&l)
        } else {
            None
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn with_file(name: &str, body: &[u8]) -> (std::path::PathBuf, Vec<String>) {
        let dir =
            std::env::temp_dir().join(format!("kit-core-lines-{}-{name}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap_or_default();
        let path = dir.join("t.jsonl");
        std::fs::write(&path, body).unwrap_or_default();
        let got: Vec<String> = lines(&path).collect();
        std::fs::remove_dir_all(&dir).unwrap_or_default();
        (path, got)
    }

    #[test]
    fn lines_are_the_pieces_of_split_newline() {
        let (_, got) = with_file("a", b"a\r\nb\n");
        assert_eq!(got, vec!["a\r", "b", ""]);
    }

    #[test]
    fn a_file_without_a_final_newline_ends_with_its_last_line() {
        let (_, got) = with_file("b", b"a\nb");
        assert_eq!(got, vec!["a", "b"]);
    }

    #[test]
    fn an_empty_file_is_one_empty_line() {
        let (_, got) = with_file("c", b"");
        assert_eq!(got, vec![""]);
    }

    #[test]
    fn a_missing_file_is_one_empty_line() {
        let got: Vec<String> = lines(Path::new("no/such/file.jsonl")).collect();
        assert_eq!(got, vec![""]);
    }

    #[test]
    fn json_lines_skips_broken_lines() {
        let dir = std::env::temp_dir().join(format!("kit-core-json-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap_or_default();
        let path = dir.join("t.jsonl");
        std::fs::write(&path, "{\"a\":1}\n{broken\nskip me\n{\"a\":2}\n").unwrap_or_default();
        let got: Vec<Value> = json_lines(&path, |l| l.starts_with('{')).collect();
        std::fs::remove_dir_all(&dir).unwrap_or_default();
        assert_eq!(
            got,
            vec![serde_json::json!({"a": 1}), serde_json::json!({"a": 2})]
        );
    }
}
