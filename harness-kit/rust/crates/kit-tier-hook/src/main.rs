//! kit-tier-hook: the port of `.claude/hooks/tier-hook.mjs` (PreToolUse).
//!
//! Refuses a helper or a child session that is started without a named kind of job at the start of its description
//! (helper) or title (session), without an explicit model, or on a model the route for that kind does not allow.
//! The routes are `<clone>/.claude/hooks/tier-routes.json`. Every decision is logged to `tier-hook.jsonl` in the
//! logs folder (`<clone>/.claude/logs`, or `<project>/.claude/logs` with `--harness-kit`). Where the JavaScript
//! throws (a `null` input, a malformed routes file) this program ends with exit 1 as Node does.
//!
//! Differences from the JavaScript hook: a child session's folder counts as wired when its settings name
//! `tier-hook.mjs` or `kit-tier-hook` (the kit wires this program, whose command does not hold `tier-hook.mjs`); in
//! kit mode a folder without the hooks is told to run the kit's set-up wrapper; and in kit mode a helper start is also
//! checked for its effort (on trial): it must name one of the `efforts` its kind's route lists in the routes file,
//! and every helper decision logs the effort it named. Both look a kind up among the routes file's own kinds only.

use kit_core::context::Context;
use kit_core::input::{self, Input};
use kit_core::js;
use kit_core::log::{self, Record};
use kit_core::outcome::Outcome;
use kit_core::paths;
use serde_json::{Map, Value};
use std::process::ExitCode;

fn main() -> ExitCode {
    let ctx = Context::from_env();
    run(&ctx, &input::read_stdin(), js::now_ms()).finish()
}

/// The families a model name is matched against, in this order.
const FAMILIES: [&str; 5] = ["haiku", "sonnet", "opus", "fable", "mythos"];

/// The hook's work: the outcome for one input at time `now` (ms), its log line written.
fn run(ctx: &Context, input: &Input, now: u64) -> Outcome {
    let logs = ctx.logs();
    let write = |r: &Record| log::append(&logs, "tier-hook.jsonl", r);
    let allow = |r: Record| {
        write(&r.str("decision", "allow"));
        Outcome::Pass
    };
    let deny = |r: Record, why: String| {
        write(&r.str("decision", "deny").str("why", &why));
        Outcome::Refuse(why)
    };

    let j = match input {
        Input::Json(v) => v,
        Input::Unreadable => {
            write(
                &Record::new()
                    .int("t", now)
                    .str("decision", "allow")
                    .str("note", "hook input unreadable"),
            );
            return Outcome::Pass;
        }
    };
    if j.is_null() {
        return Outcome::Fail(
            "tier hook: TypeError: Cannot read properties of null (reading 'hook_event_name')"
                .to_owned(),
        );
    }
    if j.get("hook_event_name").and_then(Value::as_str) != Some("PreToolUse") {
        return Outcome::Pass;
    }
    let tool = j.get("tool_name").and_then(Value::as_str).unwrap_or("");
    let is_helper = tool == "Agent" || tool == "Task";
    let is_session = tool.ends_with("start_session");
    if !is_helper && !is_session {
        return Outcome::Pass;
    }
    let empty = Map::new();
    let ti = j
        .get("tool_input")
        .and_then(Value::as_object)
        .unwrap_or(&empty);
    let get = |k: &str| ti.get(k);
    let agent_id = j
        .get("agent_id")
        .filter(|v| js::truthy(v))
        .map(js::to_string);
    let mut rec = Record::new().int("t", now);
    rec = match j.get("session_id").and_then(Value::as_str) {
        Some(s) => rec.cut("session", s, 8),
        None => rec.null("session"),
    };
    rec = match &agent_id {
        Some(a) => rec.cut("agent_id", a, 8),
        None => rec.null("agent_id"),
    };
    let what = if is_helper { "helper" } else { "session" };
    rec = rec.str("what", what);
    // The effort check (on trial) runs in kit mode on helpers only; their every log line carries the effort named.
    let check_effort = is_helper && ctx.kit.is_some();
    let effort = get("effort")
        .and_then(Value::as_str)
        .map(str::to_lowercase)
        .filter(|e| !e.is_empty());
    if check_effort {
        rec = match &effort {
            Some(e) => rec.cut("effort", e, 20),
            None => rec.null("effort"),
        };
    }

    let routes_path = ctx.hooks_dir().join("tier-routes.json");
    let routes_text = std::fs::read(&routes_path).map(|b| String::from_utf8_lossy(&b).into_owned());
    let Some((text, routes)) = routes_text
        .ok()
        .and_then(|t| input::parse_text(&t).map(|v| (t, v)))
    else {
        return deny(
            rec,
            "tier hook: the routes file .claude/hooks/tier-routes.json cannot be read. Nothing is started until it is fixed.".to_owned(),
        );
    };
    if routes.is_null() {
        return Outcome::Fail(
            "tier hook: TypeError: Cannot read properties of null (reading 'kinds')".to_owned(),
        );
    }
    // `routes.kinds || {}`: a kinds value that is not an object is taken as no kinds.
    let kinds = routes
        .get("kinds")
        .filter(|k| js::truthy(k))
        .and_then(Value::as_object)
        .unwrap_or(&empty);
    let order = js::object_keys(&text, &["kinds"]).unwrap_or_default();
    let mut table = Vec::with_capacity(order.len());
    for k in &order {
        match kinds
            .get(k)
            .and_then(|e| e.get("models"))
            .and_then(Value::as_array)
        {
            Some(models) => table.push(format!("{k}: {}", js::join(models, " or "))),
            None => {
                return Outcome::Fail(format!(
                    "tier hook: TypeError: the routes of \"{k}\" have no models list (reading 'join')"
                ));
            }
        }
    }
    let table = table.join("; ");

    // r57-0026: a session started in another folder must find the tier hook there.
    let cwd_text = get("cwd")
        .and_then(Value::as_str)
        .map(js::trim)
        .filter(|d| !d.is_empty());
    let target = get("target")
        .filter(|t| js::truthy(t))
        .map(js::to_string)
        .unwrap_or_default();
    if let Some(dir) = cwd_text.filter(|_| is_session && target != "ssh" && target != "cloud") {
        let wired = ["settings.json", "settings.local.json"].iter().any(|f| {
            std::fs::read(paths::resolve(&ctx.cwd, &[dir, ".claude", f])).is_ok_and(|b| {
                let s = String::from_utf8_lossy(&b);
                s.contains("tier-hook.mjs") || s.contains("kit-tier-hook")
            })
        });
        if !wired {
            let why = if ctx.kit.is_some() {
                format!(
                    "tier hook: the folder {dir} does not carry the kit's hooks. Wire them there first: \"{}/harness-kit/{SETUP}\" --apply --project \"{dir}\"",
                    paths::slashes(&ctx.clone)
                )
            } else {
                format!(
                    "tier hook (r57-0026): the folder {dir} does not carry the tier hook. Check and install it first: bash tools/ensure-tier-hook.sh \"{dir}\" (outside this repository only with the owner's word and --force)."
                )
            };
            return deny(rec.cut("cwd", dir, 80), why);
        }
    }

    // A card shown to the owner, or the start of a card he approved, carries no model to check.
    let offer = get("initiation").and_then(Value::as_str) == Some("offer");
    if is_session && (offer || get("proposal_id").is_some_and(js::truthy)) {
        return allow(rec.str("note", "a card or an approved proposal, not checked"));
    }

    let (where_, label_value) = if is_helper {
        ("description", get("description"))
    } else {
        ("title", get("title"))
    };
    let label_text = label_value
        .filter(|v| !v.is_null())
        .map(js::to_string)
        .unwrap_or_default();
    let label = js::trim(&label_text);
    let kind = kind_of(label);
    // Own kinds only: the JavaScript's `kinds[kind]` also finds `constructor` on every object and then throws, which
    // lets the start through unchecked; here such a kind is unknown and refused.
    let Some(route) = kind.as_deref().and_then(|k| kinds.get(k)) else {
        return deny(
            rec.cut("label", label, 60),
            format!(
                "tier hook: start the {where_} with the kind of job and a colon, for example \"extract: ...\". Kinds and their models: {table}."
            ),
        );
    };
    let kind = kind.unwrap_or_default();
    let models = route
        .get("models")
        .and_then(Value::as_array)
        .map_or(&[][..], Vec::as_slice);
    let want = js::join(models, " or ");
    let model = get("model")
        .and_then(Value::as_str)
        .map(str::to_lowercase)
        .unwrap_or_default();
    if model.is_empty() {
        return deny(
            rec.str("kind", &kind),
            format!(
                "tier hook: pass the model explicitly. A {what} started with no model inherits the caller's model. For \"{kind}\" use {want}."
            ),
        );
    }
    let family = FAMILIES
        .iter()
        .find(|f| model.contains(**f))
        .map_or(model.as_str(), |f| *f);
    let rec = rec.str("kind", &kind).str("model", family);
    let never = match routes.get("never").filter(|n| js::truthy(n)) {
        None => false,
        Some(Value::Array(items)) => items.iter().any(|i| i.as_str() == Some(family)),
        Some(Value::String(s)) => s.contains(family),
        Some(_) => {
            return Outcome::Fail(
                "tier hook: TypeError: (routes.never || []).includes is not a function".to_owned(),
            );
        }
    };
    if never {
        return deny(
            rec,
            format!(
                "tier hook: {family} is never used for a helper or a child session. For \"{kind}\" use {want}."
            ),
        );
    }
    if !models.iter().any(|m| m.as_str() == Some(family)) {
        return deny(
            rec,
            format!(
                "tier hook: \"{kind}\" runs on {want}, not on {family} ({}). If the job is of another kind, name that kind.",
                js::display(route.get("for"))
            ),
        );
    }
    if check_effort
        && let Some(why) = route
            .get("efforts")
            .and_then(Value::as_array)
            .and_then(|allowed| effort_refusal(&kind, allowed, effort.as_deref()))
    {
        return deny(rec, why);
    }
    allow(rec)
}

/// The kit's set-up wrapper on this operating system.
const SETUP: &str = if cfg!(windows) {
    "setup.cmd"
} else {
    "setup.sh"
};

/// The refusal of the effort check (on trial) for a helper of `kind` whose route allows `allowed`, or `None` when
/// the effort named is one of them.
fn effort_refusal(kind: &str, allowed: &[Value], effort: Option<&str>) -> Option<String> {
    let want = js::join(allowed, " or ");
    match effort {
        None => Some(format!(
            "tier hook: pass the effort explicitly. For \"{kind}\" the route allows {want}. (The effort check is on trial: its log shows whether it works.)"
        )),
        Some(e) if !allowed.iter().any(|a| a.as_str() == Some(e)) => Some(format!(
            "tier hook: \"{kind}\" runs at {want} effort, not at {e}. (The effort check is on trial: its log shows whether it works.)"
        )),
        Some(_) => None,
    }
}

/// The kind at the start of a label, lower case: the JavaScript's `/^([a-z-]+)\s*:/i` (ASCII letters and `-`, then
/// JavaScript white space, then a colon).
fn kind_of(label: &str) -> Option<String> {
    let name: String = label
        .chars()
        .take_while(|c| c.is_ascii_alphabetic() || *c == '-')
        .collect();
    if name.is_empty() {
        return None;
    }
    let rest = label.get(name.len()..)?;
    rest.trim_start_matches(js::is_space)
        .starts_with(':')
        .then(|| name.to_ascii_lowercase())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    /// A temporary clone holding the real routes file, and the context of a run in it.
    fn clone_with_routes(name: &str, args: &[&str]) -> (std::path::PathBuf, Context) {
        let root =
            std::env::temp_dir().join(format!("kit-tier-hook-{}-{name}", std::process::id()));
        let hooks = root.join("clone").join(".claude").join("hooks");
        std::fs::create_dir_all(&hooks).unwrap_or_default();
        let routes = paths::resolve(
            std::path::Path::new(env!("CARGO_MANIFEST_DIR")),
            &[
                "..",
                "..",
                "..",
                "..",
                ".claude",
                "hooks",
                "tier-routes.json",
            ],
        );
        std::fs::copy(routes, hooks.join("tier-routes.json")).unwrap_or_default();
        let mut all = vec![format!("--clone={}", root.join("clone").display())];
        all.extend(args.iter().map(|a| (*a).to_owned()));
        let ctx = Context::from_parts(all, None, &root);
        (root, ctx)
    }

    fn agent(description: &str, model: &str) -> Input {
        Input::Json(
            json!({"hook_event_name": "PreToolUse", "tool_name": "Agent",
            "tool_input": {"description": description, "model": model}}),
        )
    }

    fn agent_at(description: &str, model: &str, effort: &str) -> Input {
        Input::Json(
            json!({"hook_event_name": "PreToolUse", "tool_name": "Agent",
            "tool_input": {"description": description, "model": model, "effort": effort}}),
        )
    }

    /// A clone with the real routes, run in kit mode for a project beside it.
    fn kit_clone(name: &str) -> (std::path::PathBuf, Context) {
        let root =
            std::env::temp_dir().join(format!("kit-tier-hook-{}-{name}", std::process::id()));
        let kit_arg = format!("--project={}", root.join("her").display());
        clone_with_routes(name, &["--harness-kit", &kit_arg])
    }

    #[test]
    fn kind_needs_letters_then_a_colon() {
        assert_eq!(
            kind_of("Build-Invariant : x"),
            Some("build-invariant".to_owned())
        );
        assert_eq!(kind_of("read\u{feff}: x"), Some("read".to_owned()));
        assert_eq!(kind_of("read x: y"), None);
        assert_eq!(kind_of(": x"), None);
    }

    #[test]
    fn kit_mode_logs_under_the_project_and_plain_mode_beside_the_hooks() {
        // The Rust counterpart of the JavaScript case "kit-mode.mjs missing: the log stays beside the hook", which
        // cannot apply to a program: kit mode is built in, so the argument always moves the log.
        let (root, plain) = clone_with_routes("logs", &[]);
        let project = root.join("her");
        let kit_arg = format!("--project={}", project.display());
        let (_, kit) = clone_with_routes("logs", &["--harness-kit", &kit_arg]);
        let refused = run(&plain, &agent("read: x", "opus"), 1);
        let passed = run(&kit, &agent_at("read: x", "sonnet", "medium"), 2);
        let plain_log = std::fs::read_to_string(root.join("clone/.claude/logs/tier-hook.jsonl"))
            .unwrap_or_default();
        let kit_log = std::fs::read_to_string(project.join(".claude/logs/tier-hook.jsonl"))
            .unwrap_or_default();
        std::fs::remove_dir_all(&root).unwrap_or_default();
        assert!(matches!(refused, Outcome::Refuse(_)) && passed == Outcome::Pass);
        assert!(plain_log.starts_with("{\"t\":1,\"session\":null,\"agent_id\":null,\"what\":\"helper\",\"kind\":\"read\",\"model\":\"opus\",\"decision\":\"deny\","));
        assert_eq!(
            kit_log,
            "{\"t\":2,\"session\":null,\"agent_id\":null,\"what\":\"helper\",\"effort\":\"medium\",\"kind\":\"read\",\"model\":\"sonnet\",\"decision\":\"allow\"}\n"
        );
    }

    #[test]
    fn kit_mode_refuses_a_helper_that_names_no_effort_and_says_what_its_route_allows() {
        let (root, ctx) = kit_clone("noeffort");
        let out = run(&ctx, &agent("read: x", "sonnet"), 1);
        std::fs::remove_dir_all(&root).unwrap_or_default();
        assert!(
            matches!(out, Outcome::Refuse(w) if w.contains("pass the effort explicitly. For \"read\" the route allows medium or high") && w.contains("on trial"))
        );
    }

    #[test]
    fn kit_mode_refuses_an_effort_outside_the_route_and_logs_it() {
        let (root, ctx) = kit_clone("higheffort");
        let out = run(&ctx, &agent_at("extract: x", "haiku", "High"), 1);
        let log = std::fs::read_to_string(root.join("her/.claude/logs/tier-hook.jsonl"))
            .unwrap_or_default();
        std::fs::remove_dir_all(&root).unwrap_or_default();
        assert!(
            matches!(out, Outcome::Refuse(w) if w.contains("\"extract\" runs at low or medium effort, not at high") && w.contains("on trial"))
        );
        assert!(log.contains("\"effort\":\"high\"") && log.contains("\"decision\":\"deny\""));
    }

    #[test]
    fn kit_mode_passes_every_effort_its_route_lists() {
        let (root, ctx) = kit_clone("okeffort");
        let outs = [
            run(&ctx, &agent_at("locate: x", "haiku", "low"), 1),
            run(&ctx, &agent_at("build: x", "sonnet", "high"), 1),
            run(&ctx, &agent_at("refute: x", "opus", "xhigh"), 1),
            run(&ctx, &agent_at("design: x", "fable", "high"), 1),
            run(&ctx, &agent_at("test: x", "haiku", "high"), 1),
        ];
        std::fs::remove_dir_all(&root).unwrap_or_default();
        assert!(outs.iter().all(|o| *o == Outcome::Pass));
    }

    #[test]
    fn the_effort_is_checked_only_in_kit_mode() {
        let (root, ctx) = clone_with_routes("plaineffort", &[]);
        let none = run(&ctx, &agent("read: x", "sonnet"), 1);
        let max = run(&ctx, &agent_at("read: x", "sonnet", "max"), 1);
        let log = std::fs::read_to_string(root.join("clone/.claude/logs/tier-hook.jsonl"))
            .unwrap_or_default();
        std::fs::remove_dir_all(&root).unwrap_or_default();
        assert!(none == Outcome::Pass && max == Outcome::Pass && !log.contains("effort"));
    }

    #[test]
    fn an_effort_is_refused_unless_the_route_lists_it() {
        let allowed = [json!("high")];
        assert!(effort_refusal("analyse", &allowed, Some("high")).is_none());
        assert!(effort_refusal("analyse", &[], Some("high")).is_some());
    }

    #[test]
    fn the_kinds_table_keeps_the_order_of_the_routes_file() {
        let (root, ctx) = clone_with_routes("table", &[]);
        let out = run(&ctx, &agent("look at x", "sonnet"), 1);
        std::fs::remove_dir_all(&root).unwrap_or_default();
        let Outcome::Refuse(why) = out else {
            return assert!(matches!(out, Outcome::Refuse(_)));
        };
        assert!(
            why.contains("Kinds and their models: locate: haiku; extract: haiku; read: sonnet;")
        );
    }

    #[test]
    fn a_kind_named_like_an_object_property_is_refused_as_unknown() {
        let (root, ctx) = clone_with_routes("ctor", &[]);
        let outs: Vec<Outcome> = [
            "constructor: x",
            "toString: x",
            "hasOwnProperty: x",
            "valueOf: x",
        ]
        .iter()
        .map(|d| run(&ctx, &agent(d, "opus"), 1))
        .collect();
        std::fs::remove_dir_all(&root).unwrap_or_default();
        assert!(outs.iter().all(
            |o| matches!(o, Outcome::Refuse(w) if w.contains("start the description with the kind of job"))
        ));
    }

    #[test]
    fn a_proto_label_is_refused_as_having_no_kind() {
        let (root, ctx) = clone_with_routes("proto", &[]);
        let out = run(&ctx, &agent("__proto__: x", "opus"), 1);
        std::fs::remove_dir_all(&root).unwrap_or_default();
        assert!(matches!(out, Outcome::Refuse(w) if w.contains("kind of job and a colon")));
    }

    #[test]
    fn null_input_fails_and_other_events_pass() {
        let (root, ctx) = clone_with_routes("null", &[]);
        let null = run(&ctx, &Input::Json(Value::Null), 1);
        let other = run(
            &ctx,
            &Input::Json(json!({"hook_event_name": "PostToolUse"})),
            1,
        );
        std::fs::remove_dir_all(&root).unwrap_or_default();
        assert!(matches!(null, Outcome::Fail(_)) && other == Outcome::Pass);
    }

    #[test]
    fn a_missing_routes_file_refuses() {
        let (root, ctx) = clone_with_routes("noroutes", &[]);
        std::fs::remove_file(ctx.hooks_dir().join("tier-routes.json")).unwrap_or_default();
        let out = run(&ctx, &agent("read: x", "sonnet"), 1);
        std::fs::remove_dir_all(&root).unwrap_or_default();
        assert!(matches!(out, Outcome::Refuse(w) if w.contains("cannot be read")));
    }
}
