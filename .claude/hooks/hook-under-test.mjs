// Which program a hook's test file runs (2026-11-25, harness kit; CONTRACT.md section 7, "the test switch").
// Without KIT_HOOK_BIN_DIR a test file runs `node <hook>.mjs` as it always has. With KIT_HOOK_BIN_DIR set to a folder
// of built programs (harness-kit/rust/target/release, or wherever CARGO_TARGET_DIR put them) it runs the Rust port
// `<that folder>/kit-<hook>` (`.exe` on Windows) with `--clone=<the clone the hook file sits in>` before the test's own
// arguments, so the program reads the same files the JavaScript hook beside it would (`<clone>/.claude/hooks/...`).
// The program's name: kit-start.mjs -> kit-start, tier-hook.mjs -> kit-tier-hook.
//
//   import { runHook, RUST } from './hook-under-test.mjs';
//   const r = runHook(hookFile, args, { input, encoding: 'utf8' });   // spawnSync's result
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

export const BIN_DIR = process.env.KIT_HOOK_BIN_DIR || '';
// True when the test file runs the Rust programs.
export const RUST = BIN_DIR !== '';

// The program's file name for a hook file.
export function programOf(hookFile) {
  const name = basename(String(hookFile)).replace(/\.mjs$/, '');
  return (name.startsWith('kit-') ? name : `kit-${name}`) + (process.platform === 'win32' ? '.exe' : '');
}

// { cmd, args, rust } for running the hook in hookFile with the given arguments.
export function hookCommand(hookFile, args = []) {
  if (!RUST) return { cmd: process.execPath, args: [hookFile, ...args], rust: false };
  const exe = join(resolve(BIN_DIR), programOf(hookFile));
  if (!existsSync(exe)) throw new Error(`hook-under-test: no program ${exe} (KIT_HOOK_BIN_DIR is set; build with: cargo build --offline --release in harness-kit/rust)`);
  const clone = resolve(dirname(String(hookFile)), '..', '..');
  return { cmd: exe, args: [`--clone=${clone}`, ...args], rust: true };
}

// spawnSync of the hook; options as spawnSync's (input, encoding, env, ...).
export function runHook(hookFile, args = [], options = {}) {
  const c = hookCommand(hookFile, args);
  return spawnSync(c.cmd, c.args, options);
}
