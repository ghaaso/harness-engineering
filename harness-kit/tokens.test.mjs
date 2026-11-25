// Tests of tokens.mjs (2026-11-25). Run: node harness-kit/tokens.test.mjs
// A made-up Claude config folder (CLAUDE_CONFIG_DIR) holds one session of a made-up project with two helpers.
// With KIT_HOOK_BIN_DIR set the cases run the Rust program kit-tokens instead (.claude/hooks/hook-under-test.mjs).
import { runHook } from '../.claude/hooks/hook-under-test.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const T = mkdtempSync(join(tmpdir(), 'kit-tokens-'));
const P = join(T, 'her-project'), CFG = join(T, 'config');
mkdirSync(P, { recursive: true });
const D = join(CFG, 'projects', P.replace(/[^A-Za-z0-9]/g, '-'));
const S = '12345678-aaaa-bbbb-cccc-dddddddddddd';
mkdirSync(join(D, S, 'subagents'), { recursive: true });
const a = (id, n, model = 'claude-sonnet-5-5') => JSON.stringify({ parentUuid: 'p', type: 'assistant', message: { id, model, usage: { input_tokens: 1, cache_creation_input_tokens: n - 11, cache_read_input_tokens: 0, output_tokens: 10 } } });
const w = (f, ls) => writeFileSync(f, ls.join('\n') + '\n');
w(join(D, S + '.jsonl'), [a('m1', 1000, 'claude-opus-5-5'), a('m1', 1000, 'claude-opus-5-5'), a('m2', 3000, 'claude-opus-5-5')]);
w(join(D, S, 'subagents', 'agent-aaa111.jsonl'), [a('h1', 500000), a('h1', 500000), a('h2', 700000)]);
writeFileSync(join(D, S, 'subagents', 'agent-aaa111.meta.json'), JSON.stringify({ description: 'read: the schema', spawnDepth: 1 }));
w(join(D, S, 'subagents', 'agent-bbb222.jsonl'), [a('h3', 2000000, 'claude-opus-5-5'), a('m2', 3000, 'claude-opus-5-5')]);
writeFileSync(join(D, S, 'subagents', 'agent-bbb222.meta.json'), JSON.stringify({ description: 'build: the loader', spawnDepth: 1 }));

let pass = 0, fail = 0;
const ok = (c, name, extra = '') => { c ? pass++ : fail++; console.log(`${c ? 'ok  ' : 'FAIL'} ${name}${c ? '' : '  ' + String(extra).slice(0, 300)}`); };
const run = (...args) => runHook(join(here, 'tokens.mjs'), ['--project', P, ...args], { env: { ...process.env, CLAUDE_CONFIG_DIR: CFG }, encoding: 'utf8' });

let r = run('1234');
ok(r.status === 0 && /aaa111\s+read: the schema\s+claude-sonnet-5-5\s+2\s+1\.20 M/.test(r.stdout), 'a helper: description, model, messages, tokens once per message id', r.stdout + r.stderr);
ok(/bbb222\s+build: the loader\s+claude-opus-5-5\s+1\s+2\.00 M/.test(r.stdout), 'a message already counted in the session is not counted again', r.stdout);
ok(/\(the session\)\s+its own messages\s+claude-opus-5-5\s+2\s+4\.0 K/.test(r.stdout) && /sum\s+3\.20 M/.test(r.stdout), 'the session\'s own figure and the sum', r.stdout);
ok(run().status === 0, 'no session named: the newest');
ok(run('9999').status === 1, 'an unknown session: exit 1');
r = run('--basis', 'read: one schema of 40 tables', 'aaa');
const list = JSON.parse(readFileSync(join(P, '.harness', 'basis.json'), 'utf8'));
ok(r.status === 0 && list.length === 1 && list[0].id === 'own-0001' && list[0].status === 'measured' && /^\d{4}-\d{2}-\d{2}$/.test(list[0].date) && /^read: one schema of 40 tables: 1,200,000 tokens/.test(list[0].claim), '--basis adds own-0001, measured, dated, with the figure', JSON.stringify(list) + r.stderr);
run('--basis', 'build: a loader', 'bbb');
ok(JSON.parse(readFileSync(join(P, '.harness', 'basis.json'), 'utf8'))[1].id === 'own-0002', 'the next one is own-0002');
ok(run('--basis', 'x', 'zzz').status === 1, '--basis of an unknown helper: exit 1');

console.log(`tokens: ${pass} passed, ${fail} failed (${pass + fail} cases)`);
try { rmSync(T, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
