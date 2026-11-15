'use strict';
// Re-audit 3: seeded draw of 30 TUNE T1 task ids (regression, check 8) with a seed of its own, and the
// heal id list (the 15 variant ids). Reports overlap with the earlier audits' draws and the fix lanes'.
// usage: node make_ids3.js <build> <seed>
const fs = require('fs'); const path = require('path');
const B = process.argv[2]; const R3 = path.join(B, 'audit', 'preflight', 'r3');
let a = Number(process.argv[3]) >>> 0; const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const tasks = fs.readFileSync(path.join(B, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((t) => t.split === 'tune' && t.set === 'T1' && t.seed && t.seed.path);
const sh = [...tasks]; for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
const ids = sh.slice(0, 30).map((t) => t.id);
fs.mkdirSync(path.join(R3, 'regress'), { recursive: true }); fs.mkdirSync(path.join(R3, 'heal'), { recursive: true });
fs.writeFileSync(path.join(R3, 'regress', 'ids.txt'), ids.join('\n') + '\n');
const V = fs.readFileSync(path.join(R3, 'removed', 'variants.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).id);
fs.writeFileSync(path.join(R3, 'heal', 'ids.txt'), V.join('\n') + '\n');
const other = (f) => { try { return new Set(fs.readFileSync(f, 'utf8').split('\n').map((x) => x.trim()).filter(Boolean)); } catch (e) { return new Set(); } };
const prev = { r2_regress: path.join(B, 'audit/preflight/r2/regress/ids.txt'), r1_regress: path.join(B, 'audit/preflight/regress/ids.txt'), fix2_regress: path.join(B, 'tmp/lock/preflight2/regress/ids.txt'), fix1_regress: path.join(B, 'tmp/lock/preflight1/regress/ids.txt'), lock_regress: path.join(B, 'tmp/lock/regress/ids.txt'), r2_heal: path.join(B, 'audit/preflight/r2/heal/ids.txt') };
const ov = {}; for (const [k, f] of Object.entries(prev)) { const s = other(f); ov[k] = { size: s.size, overlap_regress: ids.filter((x) => s.has(x)).length, overlap_variants: V.filter((x) => s.has(x)).length }; }
console.log(JSON.stringify({ tune_T1: tasks.length, regress: ids.length, parents: new Set(sh.slice(0, 30).map((t) => t.parent)).size, variants: V.length, overlap: ov }));
