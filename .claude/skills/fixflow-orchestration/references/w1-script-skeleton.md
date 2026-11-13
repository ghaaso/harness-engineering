<!-- Verbatim from FixFlow (PR #182 @ 3415b5e) docs/ORCHESTRATION-DESIGN-2026-10.md lines 198-252, §4.3 W1 script contract + skeleton (project doc, no SPDX licence); copied with sed on 2026-11-04. W2 reuses this breaker/retry shape (design §4.6 item 6, line 340) -->

### 4.3 W1 script contract

- Deterministic issue order and **stable, unique labels** (`H-01`, `S-07b`, `S-07b#retry`) —
  resume depends on both. No `Date.now()`; stamps come in via `args`.
- Long agents (S-07a, S-07b, S-08) are issued first in their own `phase('Gates')` and are not
  awaited by the reader slices; their write-set (`node_modules/`, `dist/`, `coverage/`,
  Docker) is disjoint from everything the readers read.
- Readers run in slices of **five** with a **circuit breaker**: two or more *fresh* nulls in
  one slice means the session limit is suspected; the script stops issuing, accounts for every
  unstarted id, logs `HALT`, and returns. Resume replays the identical call order (completed
  agents come from cache; dead ones replay their null instantly) and then issues retries **at
  the tail with a per-attempt label** (`#retry<args.attempt>`), so the cached prefix stays
  intact and a journaled null is never re-served as a result.
- Every `run()` resolves to a value or `null` — a rejected promise can never escape the return
  contract.
- Return contract: `{ results: {id → object}, missing: [id], not_started: [id],
  halted_at_slice, coverage }`. **G1 rule:** every id in `missing` **or** `not_started` is
  re-run or explicitly waived in writing, and `coverage` must read 16/16 or carry a written
  waiver per gap; an absent result is never treated as "nothing found".
- Output discipline: command agents redirect `npm`/`pytest`/`docker` output to scratchpad logs
  and return tails + exit codes; mappers return at most 40 facts, each evidence string ≤ 200
  chars; FINDINGS are sliced to 12 in the script with the dropped count logged (no silent caps).

```js
// W1 skeleton (JS, not TS). TASKS = [{id, model, effort, schema, phase, brief, long}]
// args: { today, attempt (1, 2, 3…), knownDead: [ids that were null in the previous run], …inputs }
const LONG = TASKS.filter(t => t.long), SHORT = TASKS.filter(t => !t.long)
const known = new Set(args.knownDead || [])
const run = (t, suffix = '') => agent(CONTEXT + t.brief, { label: t.id + suffix, phase: t.phase, model: t.model, effort: t.effort, schema: t.schema })
  .then(r => { log((r ? 'done ' : 'NULL ') + t.id + suffix); return r })
  .catch(e => { log('ERROR ' + t.id + suffix + ': ' + (e && e.message)); return null })   // never escapes the contract
// Pass 1 — identical call order to any previous run: completed agents replay from cache, dead ones replay null instantly.
phase('Gates'); const longP = LONG.map(t => run(t))
phase('Discover'); const out = {}, missing = [], not_started = []; let halted = null
for (let i = 0; i < SHORT.length; i += 5) {
  const slice = SHORT.slice(i, i + 5)
  const rs = await parallel(slice.map(t => () => run(t)))
  slice.forEach((t, k) => rs[k] ? (out[t.id] = rs[k]) : missing.push(t.id))
  const fresh = slice.filter((t, k) => !rs[k] && !known.has(t.id)).length
  if (fresh >= 2) {                                   // session limit suspected: stop issuing, account for everything, return
    halted = i; SHORT.slice(i + 5).forEach(t => not_started.push(t.id)); break
  }
}
const lr = await Promise.all(longP)                   // every promise already resolves to a value or null
LONG.forEach((t, k) => lr[k] ? (out[t.id] = lr[k]) : missing.push(t.id))
// Pass 2 — retries at the TAIL with a per-attempt label: the cached prefix stays intact, a cached null is never re-served.
if (halted === null) {
  phase('Retry')
  for (const id of [...missing]) {
    const r = await run(TASKS.find(t => t.id === id), '#retry' + args.attempt)
    if (r) { out[id] = r; missing.splice(missing.indexOf(id), 1) }
  }
} else log('HALT at slice ' + halted + '; resume with attempt=' + (args.attempt + 1) + ' knownDead=' + JSON.stringify(missing))
return { results: out, missing, not_started, halted_at_slice: halted, coverage: Object.keys(out).length + '/' + TASKS.length }
```
