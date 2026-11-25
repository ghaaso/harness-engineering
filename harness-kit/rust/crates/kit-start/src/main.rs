//! kit-start: the port of `harness-kit/hooks/kit-start.mjs` (SessionStart).
//!
//! At every start, resume, clear and compaction it puts into the session, in this order: where the kit is (the
//! clone's path, so a session in another project finds the commands), the text of `<clone>/harness-kit/RULES.md`
//! (cut at 9,000 UTF-16 units; if it is missing, one line pointing at `ORCHESTRATION.md`), the names of the state
//! files in `<project>/.harness/`, and after a compaction the line that the summary is not the record. The project
//! is `--project=<folder>` or `--project <folder>` (the last one), else the clone; unlike kit-mode it is not
//! trimmed, and `--project` takes the next argument whatever it is, as the JavaScript does. Log:
//! `<project>/.claude/logs/kit-start.jsonl`. It never fails a start.

use kit_core::context::Context;
use kit_core::input::{self, Input};
use kit_core::js;
use kit_core::log::{self, Record};
use kit_core::outcome::Outcome;
use kit_core::paths;
use std::path::PathBuf;
use std::process::ExitCode;

/// Where RULES.md is cut, in UTF-16 units.
const MAX: usize = 9000;

fn main() -> ExitCode {
    let ctx = Context::from_env();
    run(&ctx, &input::read_stdin(), js::now_ms()).finish()
}

/// kit-start.mjs's own reading of `--project`.
fn project_of(ctx: &Context) -> PathBuf {
    let mut project = ctx.clone.clone();
    for (i, a) in ctx.args.iter().enumerate() {
        if let Some(v) = a.strip_prefix("--project=").filter(|v| !v.is_empty()) {
            project = paths::resolve(&ctx.cwd, &[v]);
        } else if a == "--project" {
            let next = i.checked_add(1).and_then(|n| ctx.args.get(n));
            if let Some(n) = next.filter(|n| !n.is_empty()) {
                project = paths::resolve(&ctx.cwd, &[n]);
            }
        }
    }
    project
}

/// The names in `<project>/.harness/` ending in `state.md` (any case), in JavaScript's sort order.
fn state_files(project: &std::path::Path) -> Vec<String> {
    let Ok(entries) = std::fs::read_dir(project.join(".harness")) else {
        return Vec::new();
    };
    let mut names: Vec<String> = entries
        .filter_map(Result::ok)
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .filter(|n| {
            n.len()
                .checked_sub(8)
                .and_then(|at| n.get(at..))
                .is_some_and(|end| end.eq_ignore_ascii_case("state.md"))
        })
        .collect();
    names.sort_by(|a, b| js::cmp_utf16(a, b));
    names
}

/// The hook's work for one input at time `now` (ms), its log line written.
fn run(ctx: &Context, input: &Input, now: u64) -> Outcome {
    let project = project_of(ctx);
    let c = paths::slashes(&ctx.clone);
    let p = paths::slashes(&project);
    let source = match input {
        Input::Json(j) if js::truthy(j) => {
            j.get("source").filter(|s| js::truthy(s)).map(js::to_string)
        }
        _ => None,
    }
    .unwrap_or_else(|| "startup".to_owned());

    let where_ = format!(
        "Harness kit: the kit is at {c} (its README: {c}/harness-kit/README.md). Commands: node \"{c}/harness-kit/tokens.mjs\" --project \"{p}\" (what each helper cost; --basis adds one as a basis of your own); node \"{c}/harness-kit/setup.mjs\" --apply --project <folder> (wire the hooks in another project). State files, briefs, widths and your own basis live in {p}/.harness/."
    );
    let rules = match std::fs::read(ctx.clone.join("harness-kit").join("RULES.md")) {
        Ok(bytes) => {
            let text = String::from_utf8_lossy(&bytes).replace("\r\n", "\n");
            let mut units = js::utf16(js::trim(&text));
            if units.len() > MAX {
                units.truncate(MAX);
                units.extend(js::utf16(&format!(
                    "\n... (cut at {MAX} characters; read the rest in {c}/harness-kit/RULES.md)"
                )));
            }
            units
        }
        Err(_) => js::utf16(&format!(
            "The kit's short rules (harness-kit/RULES.md) are missing; read {c}/harness-kit/ORCHESTRATION.md before starting any helper."
        )),
    };
    let states = state_files(&project);
    let st = if states.is_empty() {
        "State files in .harness/: none yet.".to_owned()
    } else {
        format!(
            "State files in .harness/: {}. Read the one your work continues before anything else.",
            states.join(", ")
        )
    };
    let mut text = js::utf16(&where_);
    text.extend(js::utf16("\n\n"));
    text.extend(rules);
    text.extend(js::utf16(&format!("\n\n{st}")));
    if source == "compact" {
        text.extend(js::utf16(
            "\n\nThis session was just compacted. The summary is not the record: reopen the state file and the files the work in hand rests on before going on.",
        ));
    }
    let chars = u64::try_from(text.len()).unwrap_or(u64::MAX);
    log::append(
        &project.join(".claude").join("logs"),
        "kit-start.jsonl",
        &Record::new()
            .int("t", now)
            .str("source", &source)
            .int("chars", chars),
    );
    Outcome::Context {
        event: "SessionStart".to_owned(),
        text,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn session_start(source: &str) -> Input {
        Input::Json(
            serde_json::json!({"hook_event_name": "SessionStart", "session_id": "s", "source": source}),
        )
    }

    fn ctx_in(name: &str, args: &[&str]) -> (PathBuf, Context) {
        let root = std::env::temp_dir().join(format!("kit-start-rs-{}-{name}", std::process::id()));
        std::fs::create_dir_all(root.join("clone").join("harness-kit")).unwrap_or_default();
        let mut all = vec![format!("--clone={}", root.join("clone").display())];
        all.extend(args.iter().map(|a| (*a).to_owned()));
        let ctx = Context::from_parts(all, None, &root);
        (root, ctx)
    }

    fn text_of(out: &Outcome) -> String {
        match out {
            Outcome::Context { text, .. } => String::from_utf16_lossy(text),
            _ => String::new(),
        }
    }

    #[test]
    fn rules_cut_inside_a_pair_keep_the_lone_half_as_javascript_does() {
        let (root, ctx) = ctx_in("cut", &[]);
        let body = format!("{}\u{1f600}tail", "x".repeat(MAX - 1));
        std::fs::write(ctx.clone.join("harness-kit").join("RULES.md"), body).unwrap_or_default();
        let out = run(&ctx, &session_start("startup"), 1);
        std::fs::remove_dir_all(&root).unwrap_or_default();
        let (_, json, _) = out.parts();
        assert!(json.contains("x\\ud83d\\n... (cut at 9000 characters;"));
    }

    #[test]
    fn state_files_are_sorted_and_others_left_out() {
        let (root, ctx) = ctx_in("states", &[]);
        let h = ctx.clone.join(".harness");
        std::fs::create_dir_all(&h).unwrap_or_default();
        for n in ["b-STATE.md", "A-state.MD", "WIDTHS.md", "state.md.bak"] {
            std::fs::write(h.join(n), "x").unwrap_or_default();
        }
        let out = run(&ctx, &Input::Unreadable, 1);
        std::fs::remove_dir_all(&root).unwrap_or_default();
        assert!(text_of(&out).ends_with("State files in .harness/: A-state.MD, b-STATE.md. Read the one your work continues before anything else."));
    }

    #[test]
    fn the_log_line_counts_utf16_units() {
        let (root, ctx) = ctx_in("log", &[]);
        let out = run(&ctx, &session_start("resume"), 7);
        let log = std::fs::read_to_string(ctx.clone.join(".claude/logs/kit-start.jsonl"))
            .unwrap_or_default();
        std::fs::remove_dir_all(&root).unwrap_or_default();
        let n = js::len(&text_of(&out));
        assert_eq!(
            log,
            format!("{{\"t\":7,\"source\":\"resume\",\"chars\":{n}}}\n")
        );
    }

    #[test]
    fn project_takes_the_next_argument_whatever_it_is() {
        let (root, ctx) = ctx_in("proj", &["--project", "--x"]);
        let got = project_of(&ctx);
        std::fs::remove_dir_all(&root).unwrap_or_default();
        assert_eq!(got, root.join("--x"));
    }
}
