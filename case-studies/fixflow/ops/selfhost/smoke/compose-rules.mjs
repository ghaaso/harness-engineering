// The static rules of docker-compose.prod.yml, checked on Compose's own rendering of it with the
// shipped example env files (CI: .github/workflows/ci.yml "Self-host compose rules"). Starts no
// container, needs only `docker compose`. Each rule here was a real break once (review of #195):
//
//   * no service publishes a port, none uses the host network (Docker bypasses ufw for both;
//     the tunnel is the only way in);
//   * the backend waits for the restore gate to COMPLETE, and the gate runs the mounted
//     restore-gate.sh with no network and read-only mounts;
//   * the backend's forced keys hold their safe values, and the gate's FORCED list names exactly
//     those keys (the gate refuses other spellings of these names only);
//   * the rendered backend environment carries no other spelling of a forced key;
//   * the database network has no route out; the backend healthcheck reads the database component.
//
//   node ops/selfhost/smoke/compose-rules.mjs
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const envDir = join(root, "ops/selfhost/env");
const etc = mkdtempSync(join(tmpdir(), "ff-compose-rules-"));
const fwd = (p) => p.replace(/\\/g, "/");

const FORCED_VALUES = {
  FIXFLOW_ENVIRONMENT: "production",
  FIXFLOW_ENABLE_DISPATCHER: "false",
  FIXFLOW_BACKUP_ENABLED: "false", // compose.env.example keeps it false until P3c step 7
  FIXFLOW_BACKUP_PREFIX: "backups/db-selfhost/",
};
const PROFILES = ["db", "app", "web", "ops", "edge"];

let fails = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${ok || !detail ? "" : `: ${detail}`}`);
  if (!ok) fails += 1;
};

let cfg;
try {
  for (const name of ["backend", "postgres", "ops", "heartbeat"]) {
    copyFileSync(join(envDir, `${name}.env.example`), join(etc, `${name}.env`));
  }
  const composeEnv = readFileSync(join(envDir, "compose.env.example"), "utf8").replace(
    /^FIXFLOW_ETC=.*$/m,
    `FIXFLOW_ETC=${fwd(etc)}`
  );
  writeFileSync(join(etc, "compose.env"), composeEnv);
  const args = [
    "compose",
    "-p",
    "fixflow-compose-rules",
    "-f",
    join(root, "docker-compose.prod.yml"),
  ];
  args.push("--env-file", join(etc, "compose.env"));
  for (const p of PROFILES) args.push("--profile", p);
  args.push("config", "--format", "json");
  const out = execFileSync("docker", args, {
    env: { ...process.env, FIXFLOW_GIT_SHA: "compose-rules" },
    encoding: "utf8",
  });
  cfg = JSON.parse(out);
} finally {
  rmSync(etc, { recursive: true, force: true });
}

const services = cfg.services ?? {};
for (const name of ["postgres", "restore-gate", "backend", "web", "ops", "edge"]) {
  check(name in services, `service ${name} renders with every profile`);
}

for (const [name, s] of Object.entries(services)) {
  check(!s.ports || s.ports.length === 0, `${name}: no published port`, JSON.stringify(s.ports));
  check(s.network_mode !== "host", `${name}: not on the host network`);
  check(!s.privileged, `${name}: not privileged`);
}

const backend = services.backend ?? {};
check(
  backend.depends_on?.["restore-gate"]?.condition === "service_completed_successfully",
  "backend waits for restore-gate to complete successfully",
  JSON.stringify(backend.depends_on)
);

const gate = services["restore-gate"] ?? {};
const gateVolumes = gate.volumes ?? [];
const script = gateVolumes.find((v) => v.target === "/restore-gate.sh");
const gateDir = gateVolumes.find((v) => v.target === "/gate");
check(gate.network_mode === "none", "restore-gate has no network");
check(
  (gate.entrypoint ?? []).join(" ").includes("/restore-gate.sh"),
  "restore-gate runs the mounted script",
  JSON.stringify(gate.entrypoint)
);
check(
  Boolean(script?.read_only) &&
    fwd(script?.source ?? "").endsWith("ops/selfhost/bin/restore-gate.sh"),
  "restore-gate.sh is mounted read-only from ops/selfhost/bin",
  JSON.stringify(script)
);
check(Boolean(gateDir?.read_only), "the env directory is mounted read-only into the gate");

const env = backend.environment ?? {};
for (const [key, want] of Object.entries(FORCED_VALUES)) {
  check(env[key] === want, `backend ${key}=${want}`, `got ${JSON.stringify(env[key])}`);
}
const forcedNames = new Set(Object.keys(FORCED_VALUES));
const stray = Object.keys(env).filter(
  (k) => forcedNames.has(k.toUpperCase()) && !forcedNames.has(k)
);
check(
  stray.length === 0,
  "backend environment has no other spelling of a forced key",
  stray.join(",")
);

const gateSrc = readFileSync(join(root, "ops/selfhost/bin/restore-gate.sh"), "utf8");
const m = gateSrc.match(/^FORCED="([^"]*)"/m);
const gateForced = new Set((m?.[1] ?? "").split(/\s+/).filter(Boolean));
check(
  gateForced.size === forcedNames.size && [...forcedNames].every((k) => gateForced.has(k)),
  "restore-gate.sh FORCED lists exactly the backend's forced keys",
  [...gateForced].join(" ")
);

check(cfg.networks?.db?.internal === true, "the db network is internal (no route out)");
const hc = JSON.stringify(backend.healthcheck?.test ?? "");
check(
  hc.includes("/api/ops/health") && hc.includes("database"),
  "backend healthcheck reads the database component of /api/ops/health"
);

console.log(`compose-rules: FAILS=${fails}`);
process.exit(fails === 0 ? 0 : 1);
