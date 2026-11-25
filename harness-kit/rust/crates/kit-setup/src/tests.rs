//! The 58 cases of the former `harness-kit/setup.test.mjs`, same cases and expectations, and cases for the three
//! settings the set-up adds. Each case builds a made-up clone in the temp folder (stub hooks, a stub Rust workspace)
//! and runs the set-up in this process with a stand-in for cargo that records its calls and writes empty
//! "programs" into `CARGO_TARGET_DIR/release`, or fails the way cargo fails. Nothing is built or downloaded.

use super::*;
use crate::build::{CargoCall, Ran};
use crate::wiring::{EXE, has_mark, hook_of};
use serde_json::{Value, json};
use std::cell::RefCell;
use std::fs;
use std::time::{Duration, SystemTime};

const LOCK: &str = r#"version = 4

[[package]]
name = "kit-core"
version = "0.1.0"

[[package]]
name = "regex"
version = "1.11.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "00"

[[package]]
name = "serde_json"
version = "1.0.140"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "00"
"#;

/// The stand-in for cargo. Modes: ok, missing (cargo not found), toolchain, offline, broken.
struct Fake {
    mode: &'static str,
    skip: &'static [&'static str],
    log: RefCell<Vec<CargoCall>>,
}

impl Fake {
    fn new(mode: &'static str) -> Self {
        Self {
            mode,
            skip: &[],
            log: RefCell::new(Vec::new()),
        }
    }

    fn build_call(&self) -> Option<CargoCall> {
        self.log
            .borrow()
            .iter()
            .find(|c| c.args.first().is_some_and(|a| a == "build"))
            .cloned()
    }
}

impl Cargo for Fake {
    fn call(&self, c: &CargoCall) -> Ran {
        self.log.borrow_mut().push(c.clone());
        let fail = |status: i32, stderr: &str| Ran {
            status: Some(status),
            stderr: stderr.to_owned(),
            ..Ran::default()
        };
        if self.mode == "missing" {
            return Ran {
                error: Some("NotFound".to_owned()),
                ..Ran::default()
            };
        }
        if c.args.first().is_some_and(|a| a == "--version") {
            if self.mode == "toolchain" {
                return fail(1, "error: toolchain '1.100.0-x86_64' is not installed");
            }
            return Ran {
                status: Some(0),
                stdout: "cargo 1.100.0 (stand-in)\n".to_owned(),
                ..Ran::default()
            };
        }
        if self.mode == "offline" && c.args.iter().any(|a| a == "--offline") {
            return fail(
                101,
                "error: no matching package named `regex` found\nlocation searched: registry `crates-io`\nAs a reminder, you're using offline mode (--offline)",
            );
        }
        if self.mode == "broken" {
            return fail(101, "error[E0308]: mismatched types");
        }
        let dir = c.target.join("release");
        fs::create_dir_all(&dir).unwrap_or_default();
        for p in KIT.iter().map(|k| k.program).chain(["kit-tokens"]) {
            if !self.skip.contains(&p) {
                fs::write(dir.join(format!("{p}{EXE}")), "x").unwrap_or_default();
            }
        }
        Ran {
            status: Some(0),
            ..Ran::default()
        }
    }
}

/// A made-up clone or project.
struct Fx {
    root: PathBuf,
    file: PathBuf,
    r: String,
}

/// One test's temp folder, removed at the end.
struct Lab {
    base: PathBuf,
}

impl Drop for Lab {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.base).unwrap_or_default();
    }
}

fn example() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../parallel/kit.example.json")
}

impl Lab {
    fn new(name: &str) -> Self {
        let base = std::env::temp_dir().join(format!("kit-setup-rs-{}-{name}", std::process::id()));
        fs::remove_dir_all(&base).unwrap_or_default();
        fs::create_dir_all(&base).unwrap_or_default();
        Self { base }
    }

    fn fx(root: PathBuf) -> Fx {
        let file = root.join(".claude").join("settings.local.json");
        let r = paths::slashes(&root);
        Fx { root, file, r }
    }

    fn clone(&self, name: &str) -> Fx {
        let root = self.base.join(name);
        let hooks = root.join(".claude").join("hooks");
        fs::create_dir_all(&hooks).unwrap_or_default();
        fs::create_dir_all(root.join("harness-kit").join("parallel")).unwrap_or_default();
        for h in [
            "window-ceiling",
            "tier-hook",
            "creep-gate",
            "count-gate",
            "fanout-gate",
        ] {
            fs::write(hooks.join(format!("{h}.mjs")), "").unwrap_or_default();
        }
        fs::write(hooks.join("tier-routes.json"), "{}").unwrap_or_default();
        fs::copy(
            example(),
            root.join("harness-kit")
                .join("parallel")
                .join("kit.example.json"),
        )
        .unwrap_or_default();
        let rd = root.join("harness-kit").join("rust");
        for p in KIT
            .iter()
            .map(|k| k.program)
            .chain(["kit-core", "kit-tokens"])
        {
            let src = rd.join("crates").join(p).join("src");
            fs::create_dir_all(&src).unwrap_or_default();
            fs::write(src.join("main.rs"), "// x").unwrap_or_default();
        }
        fs::write(rd.join("Cargo.toml"), "[workspace]\n").unwrap_or_default();
        fs::write(rd.join("Cargo.lock"), LOCK).unwrap_or_default();
        fs::write(
            rd.join("rust-toolchain.toml"),
            "[toolchain]\nchannel = \"1.100.0\"\n",
        )
        .unwrap_or_default();
        Self::fx(root)
    }

    fn project(&self, name: &str, git: bool) -> Fx {
        let root = self.base.join(name);
        fs::create_dir_all(&root).unwrap_or_default();
        if git {
            Command::new("git")
                .args(["init", "-q"])
                .current_dir(&root)
                .status()
                .map(|_| ())
                .unwrap_or_default();
        }
        Self::fx(root)
    }

    fn run(&self, c: &Fx, args: &[&str], fake: &Fake) -> Ended {
        let args: Vec<String> = args.iter().map(|a| (*a).to_owned()).collect();
        run(
            &args,
            &c.root,
            &Env {
                cwd: self.base.clone(),
                cargo: fake,
            },
        )
    }
}

#[derive(Default)]
struct Checks(Vec<String>);

impl Checks {
    fn check(&mut self, name: &str, cond: bool, extra: &str) {
        if !cond {
            self.0.push(format!(
                "FAIL {name}  {}",
                extra.chars().take(600).collect::<String>()
            ));
        }
    }

    fn done(self) {
        assert!(self.0.is_empty(), "\n{}", self.0.join("\n"));
    }
}

fn json_of(f: &Path) -> Value {
    fs::read_to_string(f)
        .ok()
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or(Value::Null)
}

fn text_of(f: &Path) -> String {
    fs::read_to_string(f).unwrap_or_default()
}

fn cmds(s: &Value) -> Vec<String> {
    let Some(h) = s.get("hooks").and_then(Value::as_object) else {
        return Vec::new();
    };
    h.values()
        .filter_map(Value::as_array)
        .flatten()
        .filter_map(|g| g.get("hooks").and_then(Value::as_array))
        .flatten()
        .filter_map(|h| h.get("command").and_then(Value::as_str).map(str::to_owned))
        .collect()
}

fn kit_cmds(s: &Value) -> Vec<String> {
    cmds(s).into_iter().filter(|c| has_mark(c)).collect()
}

fn prog(c: &Fx, p: &str) -> String {
    format!("\"{}\"", program_path(&c.r, p))
}

fn both(r: &Ended) -> String {
    format!("{}{}", r.out, r.err)
}

fn user() -> Value {
    json!({
        "permissions": { "allow": ["Bash(ls)"] },
        "env": { "X": "1" },
        "hooks": {
            "PreToolUse": [
                { "matcher": "*", "hooks": [{ "type": "command", "command": "node \"/elsewhere/mine.mjs\"" }] },
                { "matcher": "Bash", "hooks": [{ "type": "command", "command": "echo a" }, { "type": "command", "command": "node \"/x/.claude/hooks/tier-hook.mjs\"" }] }
            ],
            "Stop": [{ "hooks": [{ "type": "command", "command": "echo stop" }] }],
            "PostToolUse": []
        }
    })
}

fn write_json(f: &Path, v: &Value) {
    fs::write(f, serde_json::to_string_pretty(v).unwrap_or_default()).unwrap_or_default();
}

fn with_fixflow(c: &Fx) {
    for s in [
        "fixflow-orchestration",
        "odoo-accounting-import",
        "lean-thing",
    ] {
        fs::create_dir_all(c.root.join(".claude").join("skills").join(s)).unwrap_or_default();
    }
    fs::write(c.root.join(".claude").join("skills").join("README.md"), "x").unwrap_or_default();
    let ad = c.root.join(".claude").join("agents");
    fs::create_dir_all(&ad).unwrap_or_default();
    fs::write(
        ad.join("fixflow-explorer.md"),
        "---\nname: fixflow-explorer\ntools: Read\n---\nx",
    )
    .unwrap_or_default();
    fs::write(
        ad.join("fixflow-odd-file.md"),
        "---\nname: fixflow-odd\n---\nx",
    )
    .unwrap_or_default();
    fs::write(ad.join("lean-read.md"), "---\nname: lean-read\n---\nx").unwrap_or_default();
}

fn ptr<'a>(v: &'a Value, p: &str) -> &'a Value {
    v.pointer(p).unwrap_or(&Value::Null)
}

// ======== the 22 cases of the first set-up (commands are the programs; six hooks) ========

#[test]
fn case_01_dry_run_changes_nothing() {
    let lab = Lab::new("c01");
    let mut ch = Checks::default();
    let c = lab.clone("c");
    let r = lab.run(&c, &[], &Fake::new("ok"));
    ch.check(
        "dry run exits 0 and writes no file",
        r.code == 0
            && !c.file.exists()
            && !c.root.join(".harness").exists()
            && !c.root.join("harness-kit/rust/target").exists(),
        &r.err,
    );
    ch.check(
        "dry run prints the six commands with the clone path in double quotes",
        KIT.iter().all(|k| {
            r.out.contains(&format!(
                "{} --harness-kit \"--clone={}\" \"--project={}\"",
                prog(&c, k.program),
                c.r,
                c.r
            ))
        }),
        &r.out,
    );
    ch.done();
}

#[test]
fn case_02_new_file_apply_twice_remove() {
    let lab = Lab::new("c02");
    let mut ch = Checks::default();
    let c = lab.clone("c");
    let f = Fake::new("ok");
    let r = lab.run(&c, &["--apply"], &f);
    let s = json_of(&c.file);
    let pre = ptr(&s, "/hooks/PreToolUse")
        .as_array()
        .cloned()
        .unwrap_or_default();
    let matchers: Vec<&str> = pre
        .iter()
        .map(|g| g.get("matcher").and_then(Value::as_str).unwrap_or_default())
        .collect();
    let order = [
        "kit-window-ceiling",
        "kit-tier-hook",
        "kit-count-gate",
        "kit-fanout-gate",
        "kit-creep-gate",
    ]
    .iter()
    .enumerate()
    .all(|(i, p)| {
        pre.get(i)
            .map(|g| ptr(g, "/hooks/0/command"))
            .and_then(Value::as_str)
            .is_some_and(|x| x.starts_with(&prog(&c, p)))
    });
    let ss = ptr(&s, "/hooks/SessionStart");
    ch.check(
        "apply writes the six entries with the right events and matchers in order",
        r.code == 0
            && pre.len() == 5
            && matchers.join(",") == "*,*,Agent|Task|SendMessage,Agent|Task,Agent|Task"
            && order
            && ss.as_array().is_some_and(|a| a.len() == 1)
            && ptr(ss, "/0/matcher").is_null()
            && ptr(ss, "/0").get("matcher").is_none()
            && ptr(ss, "/0/hooks/0/command")
                .as_str()
                .is_some_and(|x| x.starts_with(&prog(&c, "kit-start"))),
        &format!("{}{}", both(&r), s),
    );
    lab.run(&c, &["--apply"], &f);
    ch.check(
        "apply twice leaves one set",
        cmds(&json_of(&c.file)).len() == 6,
        "",
    );
    let r = lab.run(&c, &["--remove"], &f);
    ch.check(
        "remove deletes a file that held only the kit entries",
        r.code == 0 && !c.file.exists(),
        &both(&r),
    );
    let r = lab.run(&c, &["--remove"], &f);
    ch.check(
        "remove with no file is a no-op",
        r.code == 0 && !c.file.exists(),
        "",
    );
    ch.done();
}

#[test]
fn case_03_merge_then_remove_restores() {
    let lab = Lab::new("c03");
    let mut ch = Checks::default();
    let c = lab.clone("c");
    let f = Fake::new("ok");
    write_json(&c.file, &user());
    lab.run(&c, &["--apply"], &f);
    let s = json_of(&c.file);
    let cs = cmds(&s);
    ch.check(
        "merge keeps every user entry and key",
        ptr(&s, "/env/X") == "1"
            && ptr(&s, "/permissions/allow/0") == "Bash(ls)"
            && cs.iter().any(|x| x == "node \"/elsewhere/mine.mjs\"")
            && cs.iter().any(|x| x == "echo stop")
            && cs
                .iter()
                .any(|x| x == "node \"/x/.claude/hooks/tier-hook.mjs\"")
            && kit_cmds(&s).len() == 6,
        &s.to_string(),
    );
    lab.run(&c, &["--apply"], &f);
    ch.check(
        "merge twice: still one kit set",
        kit_cmds(&json_of(&c.file)).len() == 6,
        "",
    );
    let r = lab.run(&c, &["--remove"], &f);
    ch.check(
        "remove restores the file to what it held (an unmarked tier-hook entry of the user stays)",
        r.code == 0 && json_of(&c.file) == user(),
        &text_of(&c.file),
    );
    ch.done();
}

#[test]
fn case_04_marked_entry_in_a_mixed_group() {
    let lab = Lab::new("c04");
    let mut ch = Checks::default();
    let c = lab.clone("c");
    write_json(
        &c.file,
        &json!({ "hooks": { "PreToolUse": [{ "matcher": "*", "hooks": [{ "type": "command", "command": "echo keep" }, { "type": "command", "command": "node \"/old/place/.claude/hooks/tier-hook.mjs\" --harness-kit" }] }] } }),
    );
    lab.run(&c, &["--remove"], &Fake::new("ok"));
    let s = json_of(&c.file);
    ch.check(
        "remove takes a marked entry out of a mixed group, keeps the rest",
        ptr(&s, "/hooks/PreToolUse")
            .as_array()
            .is_some_and(|a| a.len() == 1)
            && ptr(&s, "/hooks/PreToolUse/0/hooks")
                .as_array()
                .is_some_and(|a| a.len() == 1)
            && ptr(&s, "/hooks/PreToolUse/0/hooks/0/command") == "echo keep",
        &s.to_string(),
    );
    ch.done();
}

#[test]
fn case_05_refusals_change_nothing() {
    let lab = Lab::new("c05");
    let mut ch = Checks::default();
    let f = Fake::new("ok");
    let c = lab.clone("c");
    fs::write(&c.file, "{ not json").unwrap_or_default();
    let r = lab.run(&c, &["--apply"], &f);
    ch.check(
        "invalid JSON: refused, file unchanged",
        r.code == 1 && text_of(&c.file) == "{ not json",
        &r.err,
    );
    fs::write(&c.file, "{\"hooks\": []}").unwrap_or_default();
    let r = lab.run(&c, &["--apply"], &f);
    ch.check(
        "hooks not an object: refused, file unchanged",
        r.code == 1 && text_of(&c.file) == "{\"hooks\": []}",
        &r.err,
    );
    let d = lab.clone("with$dollar");
    let r = lab.run(&d, &["--apply"], &f);
    ch.check(
        "a clone path with $ is refused",
        r.code == 1 && !d.file.exists() && r.err.contains("cannot stand inside double quotes"),
        &r.err,
    );
    let e = lab.clone("e");
    fs::remove_file(e.root.join(".claude/hooks/tier-routes.json")).unwrap_or_default();
    let r = lab.run(&e, &["--apply"], &f);
    ch.check(
        "a clone without tier-routes.json is refused",
        r.code == 1 && !e.file.exists(),
        &r.err,
    );
    let r = lab.run(&e, &["--bogus"], &f);
    ch.check("an unknown argument is refused", r.code == 1, &r.err);
    ch.done();
}

#[test]
fn case_06_fixflow_switched_off_and_taken_back() {
    let lab = Lab::new("c06");
    let mut ch = Checks::default();
    let f = Fake::new("ok");
    let c = lab.clone("c");
    with_fixflow(&c);
    let r = lab.run(&c, &[], &f);
    ch.check(
        "dry run counts 2 skills and 2 agents",
        r.code == 0
            && r.out.contains("switched off: 2 skills")
            && r.out.contains(" 2 agents")
            && !c.file.exists(),
        &r.out,
    );
    lab.run(&c, &["--apply"], &f);
    let s = json_of(&c.file);
    let so = ptr(&s, "/skillOverrides");
    ch.check(
        "apply: skill folders off, lean-* and README not",
        so.get("fixflow-orchestration") == Some(&json!("off"))
            && so.get("odoo-accounting-import") == Some(&json!("off"))
            && so.get("lean-thing").is_none()
            && so.as_object().is_some_and(|o| o.len() == 2),
        &so.to_string(),
    );
    ch.check(
        "apply: fixflow agents denied by frontmatter name, lean-read not",
        *ptr(&s, "/permissions/deny") == json!(["Agent(fixflow-explorer)", "Agent(fixflow-odd)"]),
        &ptr(&s, "/permissions").to_string(),
    );
    lab.run(&c, &["--apply"], &f);
    ch.check(
        "apply twice: no duplicates",
        ptr(&json_of(&c.file), "/permissions/deny")
            .as_array()
            .is_some_and(|a| a.len() == 2),
        "",
    );
    let r = lab.run(&c, &["--remove"], &f);
    ch.check(
        "remove on a new file deletes it",
        r.code == 0 && !c.file.exists(),
        &r.out,
    );

    let c = lab.clone("c2");
    with_fixflow(&c);
    let mine = json!({ "skillOverrides": { "fixflow-orchestration": "on", "other": "off" }, "permissions": { "deny": ["Agent(fixflow-explorer)", "Bash(rm *)"], "allow": ["Read"] }, "env": { "X": "1" } });
    write_json(&c.file, &mine);
    lab.run(&c, &["--apply"], &f);
    let s = json_of(&c.file);
    let deny: Vec<&str> = ptr(&s, "/permissions/deny")
        .as_array()
        .map(|a| a.iter().filter_map(Value::as_str).collect())
        .unwrap_or_default();
    ch.check(
        "her own settings stay hers: her \"on\" kept, her deny not duplicated",
        ptr(&s, "/skillOverrides/fixflow-orchestration") == "on"
            && ptr(&s, "/skillOverrides/odoo-accounting-import") == "off"
            && deny
                .iter()
                .filter(|d| **d == "Agent(fixflow-explorer)")
                .count()
                == 1
            && deny.contains(&"Agent(fixflow-odd)"),
        &s.to_string(),
    );
    lab.run(&c, &["--remove"], &f);
    ch.check(
        "remove leaves exactly her settings (her deny of fixflow-explorer stays)",
        json_of(&c.file) == mine,
        &text_of(&c.file),
    );
    ch.done();
}

// ======== the mark, the programs, the project, the config, the build, --status ========

#[test]
fn case_07_the_mark_and_old_entries() {
    let lab = Lab::new("c07");
    let mut ch = Checks::default();
    ch.check(
        "isOurs: the mark second, with arguments after it",
        has_mark("\"/a/kit-tier-hook\" --harness-kit \"--clone=/a\" \"--project=/b\"")
            && has_mark("node \"/a/.claude/hooks/x.mjs\" --harness-kit")
            && !has_mark("node x.mjs --harness-kitten")
            && !has_mark("node \"/a/--harness-kit/x.mjs\""),
        "",
    );
    ch.check(
        "hookOf names the hook of a program and of an old .mjs command",
        hook_of("\"/a/target/release/kit-count-gate.exe\" --harness-kit") == Some("count-gate")
            && hook_of("node \"/x/.claude/hooks/tier-hook.mjs\" --harness-kit")
                == Some("tier-hook")
            && hook_of("\"/a/kit-start\" --harness-kit") == Some("kit-start")
            && hook_of("echo a").is_none(),
        "",
    );
    let c = lab.clone("c");
    write_json(
        &c.file,
        &json!({ "hooks": { "PreToolUse": [{ "matcher": "*", "hooks": [{ "type": "command", "command": format!("node \"{}/.claude/hooks/window-ceiling.mjs\" --harness-kit \"--project={}\"", c.r, c.r) }] }] } }),
    );
    let r = lab.run(&c, &["--apply"], &Fake::new("ok"));
    let s = json_of(&c.file);
    ch.check(
        "apply replaces an old JavaScript kit entry (mark before --project=) with the program",
        r.code == 0
            && cmds(&s).len() == 6
            && !cmds(&s).iter().any(|x| x.contains(".mjs"))
            && r.out.contains("1 old ones replaced"),
        &format!("{}{s}", r.out),
    );
    ch.done();
}

#[test]
fn case_08_another_project() {
    let lab = Lab::new("c08");
    let mut ch = Checks::default();
    let f = Fake::new("ok");
    let c = lab.clone("c");
    with_fixflow(&c);
    let p = lab.project("p", false);
    let proot = p.root.to_string_lossy().into_owned();
    let r = lab.run(&c, &["--apply", "--project", &proot], &f);
    let s = json_of(&p.file);
    ch.check(
        "--project: the settings file is written in the project, not in the clone",
        r.code == 0 && p.file.exists() && !c.file.exists(),
        &both(&r),
    );
    let names: Vec<String> = fs::read_dir(p.root.join(".claude"))
        .map(|rd| {
            rd.flatten()
                .map(|e| e.file_name().to_string_lossy().into_owned())
                .collect()
        })
        .unwrap_or_default();
    ch.check(
        "--project: nothing else under the project's .claude",
        names == ["settings.local.json"],
        &names.join(","),
    );
    let ks = kit_cmds(&s);
    ch.check(
        "--project: every command carries --clone=<clone> and --project=<project>",
        ks.len() == 6
            && ks
                .iter()
                .all(|x| x.contains(&format!("\"--clone={}\" \"--project={}\"", c.r, p.r))),
        &s.to_string(),
    );
    let rec = ptr(&s, "/env/HARNESS_KIT_OFF")
        .as_str()
        .and_then(|t| serde_json::from_str::<Value>(t).ok())
        .unwrap_or(Value::Null);
    ch.check(
        "--project: no FixFlow switch in another project",
        s.get("skillOverrides").is_none()
            && s.get("permissions").is_none()
            && rec.get("skills") == Some(&json!([]))
            && rec.get("deny") == Some(&json!([]))
            && r.out.contains("nothing of the archived FixFlow material"),
        &s.to_string(),
    );
    let r2 = lab.run(&c, &["--apply", &format!("--project={proot}")], &f);
    ch.check(
        "--project=<folder> form works, and a second apply keeps one set",
        r2.code == 0 && kit_cmds(&json_of(&p.file)).len() == 6,
        &both(&r2),
    );
    let q = lab.project("proj$x", false);
    let r3 = lab.run(&c, &["--apply", "--project", &q.root.to_string_lossy()], &f);
    ch.check(
        "a project path with $ is refused, nothing written",
        r3.code == 1
            && !q.root.join(".claude").exists()
            && !q.root.join(".harness").exists()
            && r3.err.contains("project's path"),
        &r3.err,
    );
    let r4 = lab.run(
        &c,
        &[
            "--apply",
            "--project",
            &lab.base.join("no-such-folder").to_string_lossy(),
        ],
        &f,
    );
    ch.check(
        "a project that is not a folder is refused",
        r4.code == 1 && r4.err.contains("is not a folder"),
        &r4.err,
    );
    let r5 = lab.run(&c, &["--remove", "--project", &proot], &f);
    ch.check(
        "--remove in the project: entries out, .harness/ left and said so",
        r5.code == 0
            && !p.file.exists()
            && p.root.join(".harness/kit.json").exists()
            && r5.out.contains(".harness/ is left as it is"),
        &r5.out,
    );
    ch.done();
}

#[test]
fn case_09_no_usage_tool_on_the_fanout_gate_only() {
    let lab = Lab::new("c09");
    let mut ch = Checks::default();
    let f = Fake::new("ok");
    let c = lab.clone("c");
    lab.run(&c, &["--apply", "--no-usage-tool"], &f);
    let ks = kit_cmds(&json_of(&c.file));
    let with: Vec<&String> = ks
        .iter()
        .filter(|x| x.ends_with(" --no-usage-tool"))
        .collect();
    ch.check(
        "--no-usage-tool: on the fan-out gate, on no other hook",
        with.len() == 1 && with.first().is_some_and(|x| x.contains("kit-fanout-gate")),
        &ks.join(" | "),
    );
    lab.run(&c, &["--apply"], &f);
    ch.check(
        "apply without it takes it off again",
        !kit_cmds(&json_of(&c.file))
            .iter()
            .any(|x| x.contains("--no-usage-tool")),
        "",
    );
    ch.done();
}

#[test]
fn case_10_the_harness_folder() {
    let lab = Lab::new("c10");
    let mut ch = Checks::default();
    let f = Fake::new("ok");
    let c = lab.clone("c");
    let p = lab.project("p", false);
    let proot = p.root.to_string_lossy().into_owned();
    let r = lab.run(&c, &["--apply", "--project", &proot], &f);
    let h = p.root.join(".harness");
    ch.check(
        ".harness: kit.json is a copy of the example",
        h.join("kit.json").exists() && text_of(&h.join("kit.json")) == text_of(&example()),
        "",
    );
    let w = text_of(&h.join("WIDTHS.md"));
    let decl_re = Regex::new(r#"(?i)^(?:[-*][ \t]+)?(width|hold)[ \t]+""#).ok();
    let fence_re = Regex::new(r"^[ \t]*```").ok();
    let mut fence = false;
    let mut decl = Vec::new();
    for s in w.lines() {
        if fence_re.as_ref().is_some_and(|re| re.is_match(s)) {
            fence = !fence;
            continue;
        }
        let head: String = s.chars().take(40).collect();
        if !fence && decl_re.as_ref().is_some_and(|re| re.is_match(&head)) {
            decl.push(s.to_owned());
        }
    }
    ch.check(
        ".harness: WIDTHS.md explains both forms and declares nothing",
        w.contains("width \"<pattern>\" <n>: <reason>")
            && w.contains("hold \"<pattern>\" while \"<pattern>\": <reason>")
            && decl.is_empty()
            && decl_re.is_some(),
        &decl.join("|"),
    );
    ch.check(".harness: briefs/ is made", h.join("briefs").is_dir(), "");
    ch.check(
        "apply prints each file it made",
        [
            ".harness/kit.json",
            ".harness/WIDTHS.md",
            ".harness/briefs/",
        ]
        .iter()
        .all(|f| r.out.contains(&format!("made: {}/{f}", p.r))),
        &r.out,
    );
    fs::write(h.join("kit.json"), "{\"mine\":1}").unwrap_or_default();
    let r2 = lab.run(&c, &["--apply", "--project", &proot], &f);
    ch.check(
        "a second apply overwrites nothing in .harness and makes nothing",
        text_of(&h.join("kit.json")) == "{\"mine\":1}" && !r2.out.contains("made:"),
        &r2.out,
    );
    ch.done();
}

#[test]
fn case_11_the_ignore_lines() {
    let lab = Lab::new("c11");
    let mut ch = Checks::default();
    let c = lab.clone("c");
    let p = lab.project("p", true);
    let r = lab.run(
        &c,
        &["--project", &p.root.to_string_lossy()],
        &Fake::new("ok"),
    );
    let has_line = |what: &str| {
        r.out
            .lines()
            .any(|l| l.contains("add this line") && l.contains(what))
    };
    ch.check(
        "dry run prints the lines git should ignore, says .harness/ is hers, edits no .gitignore",
        has_line(".claude/settings.local.json")
            && has_line(".claude/logs/")
            && r.out
                .lines()
                .any(|l| l.contains(".harness/ ") && l.contains("yours to commit or not"))
            && !p.root.join(".gitignore").exists()
            && !p.file.exists(),
        &r.out,
    );
    ch.done();
}

#[test]
fn case_12_the_build() {
    let lab = Lab::new("c12");
    let mut ch = Checks::default();
    let c = lab.clone("c");
    let f = Fake::new("ok");
    lab.run(&c, &["--apply"], &f);
    let b = f.build_call();
    let low = |p: &Path| paths::slashes(p).to_lowercase();
    ch.check(
        "apply builds: cargo build --release --locked --offline in harness-kit/rust, into its target/, rustup auto-install off",
        b.as_ref().is_some_and(|b| {
            ["--release", "--locked", "--offline"].iter().all(|x| b.args.iter().any(|a| a == x))
                && low(&b.cwd) == format!("{}/harness-kit/rust", c.r).to_lowercase()
                && low(&b.target) == format!("{}/harness-kit/rust/target", c.r).to_lowercase()
                && b.auto_install_off
        }),
        &format!("{b:?}"),
    );
    let f = Fake::new("ok");
    lab.run(&c, &[], &f);
    ch.check("a dry run does not build", f.build_call().is_none(), "");
    let f = Fake::new("ok");
    let r = lab.run(&c, &["--apply", "--fetch"], &f);
    let b = f.build_call();
    ch.check(
        "--fetch builds without --offline, says what may be fetched from crates.io",
        r.code == 0
            && b.as_ref()
                .is_some_and(|b| !b.args.iter().any(|a| a == "--offline") && !b.auto_install_off)
            && r.out.contains("crates.io")
            && r.out.contains("regex 1.11.1"),
        &format!("{}{b:?}", r.out),
    );
    ch.check(
        "--fetch without --apply is refused",
        lab.run(&c, &["--fetch"], &f).code == 1,
        "",
    );
    ch.check(
        "--apply with --remove is refused",
        lab.run(&c, &["--apply", "--remove"], &f).code == 1,
        "",
    );
    ch.done();
}

#[test]
fn case_12b_build_failures_change_nothing() {
    let lab = Lab::new("c12b");
    let mut ch = Checks::default();
    let c = lab.clone("c");
    let harness = c.root.join(".harness");
    let r = lab.run(&c, &["--apply"], &Fake::new("missing"));
    ch.check(
        "no cargo: apply stops, says to install rustup, changes nothing",
        r.code == 1
            && r.err.contains("rustup")
            && r.err.contains("1.100.0")
            && !c.file.exists()
            && !harness.exists(),
        &r.err,
    );
    let d = lab.run(&c, &[], &Fake::new("missing"));
    ch.check(
        "no cargo: a dry run still exits 0 and says so",
        d.code == 0 && d.out.contains("cargo was not found"),
        &d.out,
    );
    let t = lab.run(&c, &["--apply"], &Fake::new("toolchain"));
    ch.check(
        "pinned toolchain missing: apply stops, names rustup toolchain install, changes nothing",
        t.code == 1 && t.err.contains("rustup toolchain install 1.100.0") && !c.file.exists(),
        &t.err,
    );
    let o = lab.run(&c, &["--apply"], &Fake::new("offline"));
    ch.check(
        "a crate not in the cache: prints the locked crates and crates.io and --fetch, changes nothing",
        o.code == 1
            && o.err.contains("regex 1.11.1")
            && o.err.contains("serde_json 1.0.140")
            && !o.err.contains("kit-core 0")
            && o.err.contains("crates.io")
            && o.err.contains("--fetch")
            && !c.file.exists()
            && !harness.exists(),
        &o.err,
    );
    let k = lab.run(&c, &["--apply"], &Fake::new("broken"));
    ch.check(
        "a failing build: refused with cargo's error, nothing changed",
        k.code == 1 && k.err.contains("E0308") && !k.err.contains("--fetch") && !c.file.exists(),
        &k.err,
    );
    let skip = Fake {
        mode: "ok",
        skip: &["kit-count-gate"],
        log: RefCell::new(Vec::new()),
    };
    fs::remove_dir_all(c.root.join("harness-kit/rust/target")).unwrap_or_default();
    let s = lab.run(&c, &["--apply"], &skip);
    ch.check(
        "a program not built is not wired: refused, names it, nothing changed",
        s.code == 1 && s.err.contains("kit-count-gate") && !c.file.exists() && !harness.exists(),
        &s.err,
    );
    ch.done();
}

fn touch_future(p: &Path) {
    let when = SystemTime::now()
        .checked_add(Duration::from_secs(3600))
        .unwrap_or_else(SystemTime::now);
    fs::File::options()
        .write(true)
        .open(p)
        .and_then(|f| f.set_modified(when))
        .unwrap_or_default();
}

#[test]
fn case_13_status() {
    let lab = Lab::new("c13");
    let mut ch = Checks::default();
    let f = Fake::new("ok");
    let c = lab.clone("c");
    let p = lab.project("p", false);
    let proot = p.root.to_string_lossy().into_owned();
    let st = |lab: &Lab| lab.run(&c, &["--status", "--project", &proot], &f);
    let r = st(&lab);
    ch.check(
        "--status on a project with nothing: NOT WIRED for each hook, config missing, exit 1",
        r.code == 1
            && r.out.matches("NOT WIRED").count() == 6
            && r.out.contains("kit.json: MISSING"),
        &r.out,
    );
    lab.run(&c, &["--apply", "--project", &proot], &f);
    let r = st(&lab);
    ch.check(
        "--status after apply: six wired, built and newer than sources, config there, exit 0",
        r.code == 0
            && r.out.matches("built, newer than its sources").count() == 6
            && r.out.contains("kit.json: there"),
        &r.out,
    );
    touch_future(
        &c.root
            .join("harness-kit/rust/crates/kit-creep-gate/src/main.rs"),
    );
    let r = st(&lab);
    ch.check(
        "--status: a program older than its sources is named, exit 1",
        r.code == 1
            && r.out.lines().any(|l| {
                l.find("creep-gate")
                    .is_some_and(|i| l.get(i..).is_some_and(|t| t.contains("OLDER")))
            })
            && r.out.matches("OLDER").count() == 1,
        &r.out,
    );
    touch_future(&c.root.join("harness-kit/rust/crates/kit-core/src/main.rs"));
    let r = st(&lab);
    ch.check(
        "--status: a newer kit-core makes every program old",
        r.out.matches("OLDER").count() == 6,
        &r.out,
    );
    fs::remove_file(c.root.join(format!(
        "harness-kit/rust/target/release/kit-tier-hook{EXE}"
    )))
    .unwrap_or_default();
    let r = st(&lab);
    ch.check(
        "--status: a missing program file is named",
        r.code == 1
            && r.out
                .lines()
                .any(|l| l.contains("tier-hook") && l.contains("MISSING")),
        &r.out,
    );
    let ws = text_of(&p.file);
    st(&lab);
    ch.check(
        "--status changes nothing",
        text_of(&p.file) == ws && !ws.is_empty(),
        "",
    );
    ch.done();
}

// ======== the three settings the set-up adds ========

#[test]
fn settings_in_the_clone_added_recorded_and_taken_out() {
    let lab = Lab::new("s1");
    let mut ch = Checks::default();
    let f = Fake::new("ok");
    let c = lab.clone("c");
    let r = lab.run(&c, &["--apply"], &f);
    let s = json_of(&c.file);
    ch.check(
        "fork mode off: env.CLAUDE_CODE_FORK_SUBAGENT is \"0\"",
        ptr(&s, "/env/CLAUDE_CODE_FORK_SUBAGENT") == "0",
        &s.to_string(),
    );
    ch.check(
        "the Opus window: modelSettings.claude-opus-5-5 is autoCompactWindow 400000",
        *ptr(&s, "/modelSettings/claude-opus-5-5") == json!({ "autoCompactWindow": 400_000 }),
        &s.to_string(),
    );
    ch.check(
        "the clone: skillListingMaxDescChars is 1",
        *ptr(&s, "/skillListingMaxDescChars") == json!(1),
        &s.to_string(),
    );
    let rec = ptr(&s, "/env/HARNESS_KIT_OFF")
        .as_str()
        .and_then(|t| serde_json::from_str::<Value>(t).ok())
        .unwrap_or(Value::Null);
    ch.check(
        "the record names all three",
        rec.get("env") == Some(&json!(["CLAUDE_CODE_FORK_SUBAGENT"]))
            && rec.get("modelSettings") == Some(&json!(["claude-opus-5-5"]))
            && rec.get("settings") == Some(&json!(["skillListingMaxDescChars"])),
        &rec.to_string(),
    );
    ch.check(
        "apply says each was added",
        r.out.matches("[added]").count() == 3,
        &r.out,
    );
    let st = lab.run(&c, &["--status"], &f);
    ch.check(
        "--status names them",
        st.out.contains("settings added by the kit: env.CLAUDE_CODE_FORK_SUBAGENT, modelSettings.claude-opus-5-5, skillListingMaxDescChars"),
        &st.out,
    );
    let r = lab.run(&c, &["--remove"], &f);
    ch.check(
        "remove takes all three out (the file held only the kit's, so it is deleted)",
        r.code == 0 && !c.file.exists(),
        &r.out,
    );
    ch.done();
}

#[test]
fn settings_in_another_project_without_the_listing() {
    let lab = Lab::new("s2");
    let mut ch = Checks::default();
    let c = lab.clone("c");
    let p = lab.project("p", false);
    let r = lab.run(
        &c,
        &["--apply", "--project", &p.root.to_string_lossy()],
        &Fake::new("ok"),
    );
    let s = json_of(&p.file);
    ch.check(
        "another project: fork mode and the Opus window, not the listing",
        ptr(&s, "/env/CLAUDE_CODE_FORK_SUBAGENT") == "0"
            && ptr(&s, "/modelSettings/claude-opus-5-5/autoCompactWindow") == 400_000
            && s.get("skillListingMaxDescChars").is_none()
            && r.out.contains("the clone only: not set here"),
        &format!("{}{s}", r.out),
    );
    ch.done();
}

#[test]
fn settings_of_her_own_are_left_alone() {
    let lab = Lab::new("s3");
    let mut ch = Checks::default();
    let f = Fake::new("ok");
    let c = lab.clone("c");
    let mine = json!({ "env": { "CLAUDE_CODE_FORK_SUBAGENT": "1" }, "modelSettings": { "claude-opus-5-5": { "autoCompactWindow": 200_000 }, "other": { "x": 1 } }, "skillListingMaxDescChars": 250 });
    write_json(&c.file, &mine);
    let r = lab.run(&c, &["--apply"], &f);
    let s = json_of(&c.file);
    ch.check(
        "her values stay as they are",
        ptr(&s, "/env/CLAUDE_CODE_FORK_SUBAGENT") == "1"
            && ptr(&s, "/modelSettings/claude-opus-5-5/autoCompactWindow") == 200_000
            && *ptr(&s, "/skillListingMaxDescChars") == json!(250),
        &s.to_string(),
    );
    ch.check(
        "apply says they are hers",
        r.out.matches("[yours, left as it is]").count() == 3,
        &r.out,
    );
    lab.run(&c, &["--remove"], &f);
    ch.check(
        "remove leaves exactly her settings",
        json_of(&c.file) == mine,
        &text_of(&c.file),
    );
    ch.done();
}

#[test]
fn a_setting_she_changed_after_apply_stays() {
    let lab = Lab::new("s4");
    let mut ch = Checks::default();
    let f = Fake::new("ok");
    let c = lab.clone("c");
    lab.run(&c, &["--apply"], &f);
    let mut s = json_of(&c.file);
    if let Some(v) = s.pointer_mut("/env/CLAUDE_CODE_FORK_SUBAGENT") {
        *v = json!("1");
    }
    write_json(&c.file, &s);
    lab.run(&c, &["--remove"], &f);
    ch.check(
        "remove takes out only what still holds the kit's value",
        json_of(&c.file) == json!({ "env": { "CLAUDE_CODE_FORK_SUBAGENT": "1" } }),
        &text_of(&c.file),
    );
    ch.done();
}

#[test]
fn her_key_order_is_kept() {
    let lab = Lab::new("s5");
    let mut ch = Checks::default();
    let f = Fake::new("ok");
    let c = lab.clone("c");
    let p = lab.project("p", false);
    let proot = p.root.to_string_lossy().into_owned();
    let original = "{\n  \"z\": 1,\n  \"a\": {\n    \"y\": true,\n    \"b\": [\n      1.5,\n      \"x\"\n    ]\n  }\n}\n";
    fs::create_dir_all(p.root.join(".claude")).unwrap_or_default();
    fs::write(&p.file, original).unwrap_or_default();
    lab.run(&c, &["--apply", "--project", &proot], &f);
    let t = text_of(&p.file);
    let at = |k: &str| t.find(k).unwrap_or(usize::MAX);
    ch.check(
        "apply keeps the order of her keys",
        at("\"z\"") < at("\"a\"") && at("\"y\"") < at("\"b\""),
        &t,
    );
    lab.run(&c, &["--remove", "--project", &proot], &f);
    ch.check(
        "remove gives back her file byte for byte",
        text_of(&p.file) == original,
        &text_of(&p.file),
    );
    ch.done();
}

#[test]
fn a_model_settings_of_another_shape_is_refused() {
    let lab = Lab::new("s6");
    let mut ch = Checks::default();
    let c = lab.clone("c");
    fs::write(&c.file, "{\"modelSettings\": []}").unwrap_or_default();
    let r = lab.run(&c, &["--apply"], &Fake::new("ok"));
    ch.check(
        "modelSettings not an object: refused, file unchanged",
        r.code == 1
            && r.err.contains("\"modelSettings\"")
            && text_of(&c.file) == "{\"modelSettings\": []}",
        &r.err,
    );
    ch.done();
}

#[test]
fn the_commands_she_runs_are_named() {
    let lab = Lab::new("s7");
    let c = lab.clone("c");
    let r = lab.run(&c, &[], &Fake::new("ok"));
    let missing: Vec<&str> = ["kit-unit", "kit-check", "kit-queue", "kit-tokens"]
        .into_iter()
        .filter(|p| !r.out.contains(&prog(&c, p)))
        .collect();
    assert!(missing.is_empty(), "{missing:?}\n{}", r.out);
}

#[test]
fn json_keeps_order_and_writes_as_javascript_does() {
    let v = json::parse(r#"{"b":1,"2":2,"a":{"x":[]},"1":0,"b":3}"#)
        .map(|v| v.compact())
        .unwrap_or_default();
    assert_eq!(v, r#"{"1":0,"2":2,"b":3,"a":{"x":[]}}"#);
    let n = json::parse("[1.0, 1e2, -0, 0.1, \"\\ud83d\\ude00\"]")
        .map(|v| v.compact())
        .unwrap_or_default();
    assert_eq!(n, "[1,100,0,0.1,\"\u{1f600}\"]");
    assert!(
        json::parse("{ not json").is_err()
            && json::parse("[1,]").is_err()
            && json::parse("01").is_err()
    );
    let p = json::parse(r#"{"a":[],"b":{},"c":[1,{"d":null}]}"#)
        .map(|v| v.pretty())
        .unwrap_or_default();
    assert_eq!(
        p,
        "{\n  \"a\": [],\n  \"b\": {},\n  \"c\": [\n    1,\n    {\n      \"d\": null\n    }\n  ]\n}"
    );
}
