//! Counting a session's helpers from the app's own files (the hook's `count`, `since`, `lines`, `tailAllows`,
//! `manualEnds`, `refusedStarts`, `readMeta`), and the lock.

use crate::text::{key_of, norm_agent, number_or_zero, to_number, truthy, uf};
use kit_core::regex::Regex;
use kit_core::{input, js, paths};
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::io::{self, Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

/// Longest silence of a running helper (t8-0100).
pub const T_QUIET_MS: f64 = 10.8 * 60000.0;
/// A transcript written this long after its meta means the helper was revived (t8-0101).
pub const REVIVED_MS: f64 = 100.0;
/// An admitted start counts as pending this long or until its meta shows (t8-0102).
pub const PENDING_MS: f64 = 16.7 * 1000.0;
/// The app's limit when `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` is not set (t7-0603).
pub const APP_LIMIT: u64 = 20;
/// A lock older than this is a crashed check: 420 ms.
const LOCK_STALE_MS: u64 = 420; // (APP_LIMIT + 1) * HOLD_MAX_MS
/// How long a check waits for the lock: 840 ms.
const LOCK_WAIT_MS: u64 = 840; // 2 * LOCK_STALE_MS
/// `since` reads the file back in pieces of this size (a read size only).
const PIECE: u64 = 1 << 20;

/// `Date.now()` during one run: the time given to `run`, moved on by the time that has passed since.
#[derive(Debug, Clone, Copy)]
pub struct Clock {
    base: u64,
    at: Instant,
}

impl Clock {
    /// A clock that reads `now` at this moment.
    #[must_use]
    pub fn new(now: u64) -> Self {
        Self {
            base: now,
            at: Instant::now(),
        }
    }

    /// Milliseconds since 1970, as `Date.now()`.
    #[must_use]
    pub fn ms(&self) -> u64 {
        let passed = u64::try_from(self.at.elapsed().as_millis()).unwrap_or(u64::MAX);
        self.base.saturating_add(passed)
    }
}

/// `ms` milliseconds of sleep (the hook's `Atomics.wait`).
pub fn sleep(ms: u64) {
    std::thread::sleep(Duration::from_millis(ms));
}

/// `stat.mtimeMs` of a time.
fn ms_of(t: SystemTime) -> f64 {
    let of = |d: Duration| uf(d.as_secs()).mul_add(1000.0, f64::from(d.subsec_nanos()) / 1e6);
    match t.duration_since(UNIX_EPOCH) {
        Ok(d) => of(d),
        Err(e) => -of(e.duration()),
    }
}

/// `statSync(p).mtimeMs`, or `None`.
#[must_use]
pub fn mtime(p: &Path) -> Option<f64> {
    std::fs::metadata(p)
        .and_then(|m| m.modified())
        .ok()
        .map(ms_of)
}

/// The meta of a helper: `JSON.parse` of `<d>/agent-<id>.meta.json`, tried twice 20 ms apart. A value that
/// JavaScript finds false is `None` (every use of it is behind `m &&` or `m ?`).
#[must_use]
pub fn read_meta(d: &Path, id: &str) -> Option<Value> {
    let p = d.join(format!("agent-{id}.meta.json"));
    for k in 0..2 {
        let got = std::fs::read(&p)
            .ok()
            .and_then(|b| input::parse_text(&String::from_utf8_lossy(&b)));
        if let Some(v) = got {
            return js::truthy(&v).then_some(v);
        }
        if k == 0 {
            sleep(20);
        }
    }
    None
}

/// Reads as much of `buf` as the file gives from `pos` (Node's `readSync`: a short read leaves zeros).
fn read_at(f: &mut File, pos: u64, buf: &mut [u8]) -> io::Result<()> {
    f.seek(SeekFrom::Start(pos))?;
    let mut filled = 0usize;
    while let Some(rest) = buf.get_mut(filled..) {
        if rest.is_empty() {
            break;
        }
        let n = f.read(rest)?;
        if n == 0 {
            break;
        }
        filled = filled.saturating_add(n);
    }
    Ok(())
}

/// The hook's `since`: the end of a file back to the first line older than `t_min` (whole lines), read in pieces
/// of 1 MiB from the end as the JavaScript reads it. `when` gives the time a line's text starts with. A missing
/// file is `""`.
pub fn since(path: &Path, t_min: f64, when: &dyn Fn(&str) -> Option<f64>) -> io::Result<String> {
    let mut f = match File::open(path) {
        Ok(f) => f,
        Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(String::new()),
        Err(e) => return Err(e),
    };
    let mut pos = f.metadata()?.len();
    let mut parts: Vec<Vec<u8>> = Vec::new();
    while pos > 0 {
        let n = PIECE.min(pos);
        pos = pos.saturating_sub(n);
        let mut b = vec![0u8; usize::try_from(n).unwrap_or(0)];
        read_at(&mut f, pos, &mut b)?;
        let first = b.iter().position(|&c| c == b'\n');
        let stop = first.and_then(|first| {
            let from = first.saturating_add(1);
            let to = b.len().min(first.saturating_add(4097));
            b.get(from..to)
                .filter(|s| !s.is_empty())
                .and_then(|s| when(&String::from_utf8_lossy(s)))
        });
        parts.push(b);
        if stop.is_some_and(|t| t < t_min) {
            break;
        }
    }
    let all: Vec<u8> = parts.into_iter().rev().flatten().collect();
    let s = String::from_utf8_lossy(&all).into_owned();
    if pos > 0 {
        let from = s.find('\n').map_or(0, |k| k.saturating_add(1));
        return Ok(s.get(from..).unwrap_or("").to_owned());
    }
    Ok(s)
}

/// The count gate's own log, read once per run (the JavaScript's `logCache`).
#[derive(Debug)]
pub struct Logbook {
    path: PathBuf,
    cache: Option<Vec<Value>>,
    t_re: Option<Regex>,
}

impl Logbook {
    /// The log at `path`, not read yet.
    #[must_use]
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            cache: None,
            t_re: Regex::new(r#"^\{"t":([0-9]+)"#).ok(),
        }
    }

    /// The hook's `lines(now)`: the objects of the log's lines from `max(T_QUIET, PENDING)` before `now` (the
    /// first call's `now`; later calls give the same lines).
    pub fn lines(&mut self, now: f64) -> io::Result<&[Value]> {
        if self.cache.is_none() {
            let re = self.t_re.clone();
            let when = move |s: &str| -> Option<f64> {
                let c = re.as_ref()?.captures(s)?;
                Some(crate::text::str_to_number(c.get(1)?.as_str()))
            };
            let text = since(&self.path, now - T_QUIET_MS.max(PENDING_MS), &when)?;
            let out: Vec<Value> = text
                .split('\n')
                .filter(|l| !js::trim(l).is_empty())
                .filter_map(input::parse_text)
                .filter(|o| o.is_object() || o.is_array())
                .collect();
            self.cache = Some(out);
        }
        Ok(self.cache.as_deref().unwrap_or(&[]))
    }

    /// The hook's `manualEnds(now)`: the time of the last hand-written end of each helper.
    pub fn manual_ends(&mut self, now: f64) -> io::Result<HashMap<String, f64>> {
        let mut m: HashMap<String, f64> = HashMap::new();
        for o in self.lines(now)? {
            if o.get("ev").and_then(Value::as_str) != Some("end") {
                continue;
            }
            // Only a text agent can equal a helper's id (a Map compares by value and type).
            let Some(agent) = truthy(o.get("agent")).and_then(Value::as_str) else {
                continue;
            };
            let t = number_or_zero(o.get("t"));
            if !m.get(agent).is_some_and(|&had| had >= t) {
                m.insert(agent.to_owned(), t);
            }
        }
        Ok(m)
    }

    /// The hook's `tailAllows(now)`: admissions of the last `PENDING_MS`.
    fn tail_allows(&mut self, now: f64) -> io::Result<Vec<Value>> {
        Ok(self
            .lines(now)?
            .iter()
            .filter(|o| {
                o.get("ev").and_then(Value::as_str) == Some("allow")
                    && now - number_or_zero(o.get("t")) <= PENDING_MS
            })
            .cloned()
            .collect())
    }
}

/// A helper that runs, or a start admitted but not shown yet.
#[derive(Debug, Clone, PartialEq)]
pub struct Entry {
    /// The helper's id (running helpers only).
    pub id: Option<String>,
    /// Its description (`String(m.description || '')`, `String(a.desc || '')`).
    pub desc: String,
    /// `m.spawnDepth` (running helpers; `None` where it is undefined or the meta is missing).
    pub depth: Option<Value>,
    /// The admission's `tu` (pending only).
    pub tu: Option<Value>,
    /// The admission's `agent`, a revival (pending only; `None` is `null`).
    pub agent: Option<Value>,
    /// Milliseconds since it or a helper below it wrote (running only).
    pub silent: f64,
}

impl Entry {
    /// `r.id || r.tu || r.agent` as text.
    #[must_use]
    pub fn label(&self) -> String {
        if let Some(id) = self.id.as_deref().filter(|s| !s.is_empty()) {
            return id.to_owned();
        }
        truthy(self.tu.as_ref())
            .or(self.agent.as_ref())
            .map_or_else(|| "null".to_owned(), js::to_string)
    }

    /// `(r.depth ?? 1) > 1`.
    #[must_use]
    pub fn nested(&self) -> bool {
        match self.depth.as_ref().filter(|d| !d.is_null()) {
            None => false,
            Some(d) => to_number(Some(d)) > 1.0,
        }
    }
}

/// What a count found.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct Count {
    /// Helpers running, in the order the JavaScript finds them.
    pub running: Vec<Entry>,
    /// Admissions that have not shown yet.
    pub pending: Vec<Entry>,
    /// Admissions whose start a later hook or the app refused.
    pub refused: usize,
    /// Meta files seen.
    pub seen: usize,
}

/// A helper's two file times.
#[derive(Debug, Clone, Copy)]
struct Info {
    mm: f64,
    tm: Option<f64>,
}

impl Info {
    fn last(self) -> f64 {
        self.tm.map_or(self.mm, |t| self.mm.max(t))
    }
}

/// `agent-<id>.meta.json` with `<id>` of 1 to 80 of `[A-Za-z0-9_-]`: the id.
fn meta_id(name: &str) -> Option<&str> {
    name.strip_prefix("agent-")
        .and_then(|r| r.strip_suffix(".meta.json"))
        .filter(|id| crate::text::is_agent_id(id))
}

/// The hook's `count(d, now, ends, sid)`.
pub fn count(
    d: &Path,
    now: f64,
    ends: &HashMap<String, f64>,
    sid: &str,
    book: &mut Logbook,
) -> io::Result<Count> {
    let names: Vec<String> = match std::fs::read_dir(d) {
        Ok(rd) => rd
            .map(|e| e.map(|e| e.file_name().to_string_lossy().into_owned()))
            .collect::<io::Result<_>>()?,
        Err(e) if e.kind() == io::ErrorKind::NotFound => Vec::new(),
        Err(e) => return Err(e),
    };
    let mut info: Vec<(String, Info)> = Vec::new();
    let mut at: HashMap<String, usize> = HashMap::new();
    for n in &names {
        let Some(id) = meta_id(n) else { continue };
        let Some(mm) = mtime(&d.join(n)) else {
            continue;
        };
        let tm = mtime(&d.join(format!("agent-{id}.jsonl")));
        match at.get(id) {
            Some(&k) => {
                if let Some(slot) = info.get_mut(k) {
                    slot.1 = Info { mm, tm };
                }
            }
            None => {
                at.insert(id.to_owned(), info.len());
                info.push((id.to_owned(), Info { mm, tm }));
            }
        }
    }
    let info_of = |id: &str| at.get(id).and_then(|&k| info.get(k)).map(|x| x.1);
    let mut metas: HashMap<String, Option<Value>> = HashMap::new();
    let mut meta_of = |id: &str| -> Option<Value> {
        metas
            .entry(id.to_owned())
            .or_insert_with(|| read_meta(d, id))
            .clone()
    };

    // The last write of each helper or of any helper below it.
    let mut tree: Vec<(String, f64)> = Vec::new();
    let mut tree_at: HashMap<String, usize> = HashMap::new();
    for (id, i) in &info {
        if now - i.last() > T_QUIET_MS {
            continue;
        }
        let w = i.last();
        let mut cur = Some(id.clone());
        for _ in 0..12 {
            let Some(c) = cur.take().filter(|c| !c.is_empty() && at.contains_key(c)) else {
                break;
            };
            match tree_at.get(&c) {
                Some(&k) => {
                    if let Some(slot) = tree.get_mut(k)
                        && slot.1 < w
                    {
                        slot.1 = w;
                    }
                }
                None => {
                    tree_at.insert(c.clone(), tree.len());
                    tree.push((c.clone(), w));
                }
            }
            cur = meta_of(&c)
                .and_then(|m| truthy(m.get("parentAgentId")).map(js::to_string))
                .map(|p| norm_agent(&p));
        }
    }

    let mut running = Vec::new();
    for (id, w) in &tree {
        let Some(i) = info_of(id) else { continue };
        let m = meta_of(id);
        if now - w > T_QUIET_MS {
            continue;
        }
        let revived = i.tm.is_some_and(|tm| tm > i.mm + REVIVED_MS);
        let finished = m
            .as_ref()
            .is_some_and(|m| m.get("finished") == Some(&Value::Bool(true)));
        if finished && !revived {
            continue;
        }
        if ends.get(id).is_some_and(|&te| i.last() <= te) {
            continue; // ended by hand and not written since
        }
        let desc = m
            .as_ref()
            .and_then(|m| truthy(m.get("description")))
            .map(js::to_string)
            .unwrap_or_default();
        running.push(Entry {
            id: Some(id.clone()),
            desc,
            depth: m.as_ref().and_then(|m| m.get("spawnDepth")).cloned(),
            tu: None,
            agent: None,
            silent: now - w,
        });
    }

    let tus: HashSet<String> = metas
        .values()
        .flatten()
        .filter_map(|m| truthy(m.get("toolUseId")).and_then(key_of))
        .collect();
    let has_tu = |v: Option<&Value>| v.and_then(key_of).is_some_and(|k| tus.contains(&k));
    let recent: Vec<Value> = book
        .tail_allows(now)?
        .into_iter()
        .filter(|a| a.get("sess").and_then(Value::as_str) == Some(sid))
        .collect();
    let candidates: Vec<&Value> = recent
        .iter()
        .filter(|a| {
            truthy(a.get("agent")).is_none()
                && truthy(a.get("tu")).is_some()
                && !has_tu(a.get("tu"))
        })
        .collect();
    let refused = refused_starts(d, &candidates)?;
    let mut pending = Vec::new();
    for a in &recent {
        if a.get("tu")
            .and_then(key_of)
            .is_some_and(|k| refused.contains(&k))
        {
            continue;
        }
        let agent = truthy(a.get("agent"));
        if let Some(ag) = agent {
            // a revival: pending until the helper writes again
            let i = ag.as_str().and_then(info_of);
            let t = to_number(a.get("t"));
            if i.and_then(|i| i.tm).is_some_and(|tm| tm >= t) {
                continue;
            }
            if ag
                .as_str()
                .is_some_and(|s| running.iter().any(|r| r.id.as_deref() == Some(s)))
            {
                continue;
            }
        } else if truthy(a.get("tu")).is_none() || has_tu(a.get("tu")) {
            continue; // its meta shows
        }
        pending.push(Entry {
            id: None,
            desc: truthy(a.get("desc")).map(js::to_string).unwrap_or_default(),
            depth: None,
            tu: a.get("tu").cloned(),
            agent: agent.cloned(),
            silent: 0.0,
        });
    }
    Ok(Count {
        running,
        pending,
        refused: refused.len(),
        seen: info.len(),
    })
}

/// The hook's `refusedStarts`: keys of the `tu` of the admissions whose result in the caller's transcript is an
/// error.
fn refused_starts(d: &Path, allows: &[&Value]) -> io::Result<HashSet<String>> {
    let mut out = HashSet::new();
    let mut by_file: Vec<(PathBuf, Vec<&Value>)> = Vec::new();
    for a in allows {
        if truthy(a.get("tu")).is_none() || truthy(a.get("agent")).is_some() {
            continue;
        }
        let f = match truthy(a.get("by")) {
            Some(by) => paths::normalize(&d.join(format!("agent-{}.jsonl", js::to_string(by)))),
            None => {
                let sess = d.parent().unwrap_or(d);
                let name = sess
                    .file_name()
                    .map(|n| n.to_string_lossy().into_owned())
                    .unwrap_or_default();
                paths::normalize(&sess.parent().unwrap_or(sess).join(format!("{name}.jsonl")))
            }
        };
        match by_file.iter_mut().find(|(p, _)| *p == f) {
            Some((_, list)) => list.push(a),
            None => by_file.push((f, vec![a])),
        }
    }
    let ts_re = Regex::new(r#""timestamp":"([^"]+)""#).ok();
    let when = |s: &str| -> Option<f64> {
        let c = ts_re.as_ref()?.captures(s)?;
        // Date.parse gives NaN for text it cannot read: never older than anything.
        js::date_parse(c.get(1)?.as_str())
            .map(|t| uf(t.unsigned_abs()) * if t < 0 { -1.0 } else { 1.0 })
    };
    for (f, list) in &by_file {
        let t_min = list
            .iter()
            .map(|a| number_or_zero(a.get("t")))
            .fold(f64::INFINITY, f64::min)
            - 1000.0;
        let text = since(f, t_min, &when)?;
        for a in list {
            let tu = a.get("tu").map(js::to_string).unwrap_or_default();
            let key = format!("\"tool_use_id\":\"{tu}\"");
            let mut from = 0usize;
            while let Some(k) = text
                .get(from..)
                .and_then(|t| t.find(&key))
                .map(|k| k.saturating_add(from))
            {
                let head = text.get(..k).unwrap_or("");
                let ls = head.rfind('\n').map_or(0, |p| p.saturating_add(1));
                let le = text
                    .get(k..)
                    .and_then(|t| t.find('\n'))
                    .map_or(text.len(), |p| p.saturating_add(k));
                let line = text.get(ls..le).unwrap_or("");
                if line.contains("\"type\":\"tool_result\"") && line.contains("\"is_error\":true") {
                    if let Some(k) = a.get("tu").and_then(key_of) {
                        out.insert(k);
                    }
                    break;
                }
                from = k.saturating_add(1);
            }
        }
    }
    Ok(out)
}

/// True for the errors on which the JavaScript waits for the lock (`EEXIST`, and `EPERM`: on Windows the lock
/// folder being removed).
fn lock_busy(e: &io::Error) -> bool {
    match e.kind() {
        io::ErrorKind::AlreadyExists => true,
        io::ErrorKind::PermissionDenied => cfg!(windows) || e.raw_os_error() == Some(1),
        _ => false,
    }
}

/// The hook's `lock()`: makes the lock folder, taking over one older than 420 ms; `false` after 840 ms.
pub fn lock(logdir: &Path, lock: &Path, clock: &Clock) -> bool {
    std::fs::create_dir_all(logdir).unwrap_or_default();
    let t0 = clock.ms();
    loop {
        match std::fs::create_dir(lock) {
            Ok(()) => return true,
            Err(e) if !lock_busy(&e) => return false,
            Err(_) => {}
        }
        if let Some(m) = mtime(lock)
            && uf(clock.ms()) - m > uf(LOCK_STALE_MS)
        {
            let gone = PathBuf::from(format!(
                "{}.stale.{}.{}",
                lock.display(),
                std::process::id(),
                clock.ms()
            ));
            // only one waiter wins the rename
            if std::fs::rename(lock, &gone).is_ok() {
                match std::fs::remove_dir_all(&gone) {
                    Ok(()) => continue,
                    Err(e) if e.kind() == io::ErrorKind::NotFound => continue,
                    Err(_) => {}
                }
            }
        }
        if clock.ms().saturating_sub(t0) > LOCK_WAIT_MS {
            return false;
        }
        sleep(10);
    }
}

/// The hook's `unlock()`.
pub fn unlock(lock: &Path) {
    std::fs::remove_dir(lock).unwrap_or_default();
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("kit-count-gate-{name}-{}", std::process::id()));
        std::fs::remove_dir_all(&d).unwrap_or_default();
        std::fs::create_dir_all(&d).unwrap_or_default();
        d
    }

    #[test]
    fn since_keeps_whole_lines_and_a_missing_file_is_empty() {
        let d = tmp("since");
        let f = d.join("x.jsonl");
        assert_eq!(since(&f, 0.0, &|_| None).unwrap_or_default(), "");
        std::fs::write(&f, "{\"t\":1}\n{\"t\":5}\n").unwrap_or_default();
        let s = since(&f, 3.0, &|s| {
            crate::text::str_to_number(s.get(5..6).unwrap_or("")).into()
        })
        .unwrap_or_default();
        std::fs::remove_dir_all(&d).unwrap_or_default();
        assert_eq!(s, "{\"t\":1}\n{\"t\":5}\n");
    }

    #[test]
    fn a_stale_lock_is_taken_over_at_once_and_a_fresh_one_after_420_ms() {
        let d = tmp("lock");
        let lk = d.join("count-gate.lock");
        std::fs::create_dir_all(&lk).unwrap_or_default();
        let later = Clock::new(js::now_ms().saturating_add(2000));
        let t = Instant::now();
        let took = lock(&d, &lk, &later);
        let quick = t.elapsed() < Duration::from_millis(300);
        unlock(&lk);
        std::fs::create_dir_all(&lk).unwrap_or_default();
        let t = Instant::now();
        let waited = lock(&d, &lk, &Clock::new(js::now_ms()));
        let slow = t.elapsed() >= Duration::from_millis(400);
        std::fs::remove_dir_all(&d).unwrap_or_default();
        assert_eq!((took, quick, waited, slow), (true, true, true, true));
    }

    #[test]
    fn a_label_is_the_id_then_the_tool_use_then_the_agent() {
        let e = Entry {
            id: None,
            desc: String::new(),
            depth: None,
            tu: Some(Value::String(String::new())),
            agent: Some(Value::String("x".to_owned())),
            silent: 0.0,
        };
        assert_eq!(e.label(), "x");
    }
}
