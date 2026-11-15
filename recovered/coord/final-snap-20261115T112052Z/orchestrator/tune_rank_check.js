// Coordinator's check of ruling 88b (END-ORDER step 5): the grader's tuning rank figures against the
// lane's own, to 1e-9. Reads only aggregates. Written by the coordinator; not a lane script.
// usage: node tune_rank_check.js <HANDOFF.json of the tuning hand-off> <grader tune-rank.json> <lane tune.json> [tolerance]
// exit 0 = every figure agrees and both sides list the same rows; 1 = a difference; 2 = usage or a broken input.
const fs = require('fs'), crypto = require('crypto')
const [hp, gp, lp, tolArg] = process.argv.slice(2)
if (!hp || !gp || !lp) { console.error('usage: node tune_rank_check.js HANDOFF.json tune-rank.json tune.json [tol]'); process.exit(2) }
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const H = JSON.parse(fs.readFileSync(hp, 'utf8')), G = JSON.parse(fs.readFileSync(gp, 'utf8')), L = JSON.parse(fs.readFileSync(lp, 'utf8'))
const cc = H.cross_check
if (!cc || !cc.paths || !cc.set) { console.error('HANDOFF.json has no cross_check block'); process.exit(2) }
const tol = Number(tolArg || cc.tolerance || 1e-9)
const problems = []
if (G.handoff_sha256 !== sha(hp)) problems.push('the return names another hand-off: ' + String(G.handoff_sha256).slice(0, 12) + ' against ' + sha(hp).slice(0, 12))
if (G.split !== 'tune') problems.push('the return split is ' + G.split)
if (G.test !== H.test) problems.push('test flags differ: return ' + G.test + ', hand-off ' + H.test)
if (L.test !== undefined && L.test !== H.test) problems.push('test flags differ: lane report ' + L.test + ', hand-off ' + H.test)
const get = (o, path) => path.split('.').reduce((a, k) => (a === undefined || a === null ? undefined : a[k]), o)
const COMP = ['RRF', 'PPR', 'CO', 'DIR']
// where the lane keeps the figure of one grader row
function lanePath(row, scope, metric) {
  if (COMP.includes(row)) return cc.paths['<COMPARATOR>'].replace('<scope>', scope).replace('<COMPARATOR>', row).replace('<metric>', metric)
  let m = /^(.+)_(alone|fused)_mean$/.exec(row)
  if (m) return cc.paths['<ARM>_<KIND>_mean'].replace('<scope>', scope).replace('<ARM>_<KIND>', m[1] + '_' + m[2]).replace('<metric>', metric)
  m = /^(.+)_(alone|fused)_s([123])$/.exec(row)
  if (m) return cc.paths['<ARM>_<KIND>_s<k>'].replace('<scope>', scope).replace('<ARM>_<KIND>', m[1] + '_' + m[2]).replace('<k>', m[3]).replace('<metric>', metric)
  return null
}
let n = 0, maxDiff = 0, worst = null
const seenLane = new Set()
for (const row of Object.keys(G.rank).sort()) {
  for (const scope of cc.scopes) {
    for (const metric of cc.metrics) {
      const g = get(G.rank[row], scope + '.' + metric)
      const p = lanePath(row, scope, metric)
      if (p === null) { problems.push('a grader row with a name the check does not know: ' + row); continue }
      // a metric name such as P@10 holds no dot, so splitting the path on dots is safe
      const l = get(L, p)
      seenLane.add(p.split('.').slice(0, -1).join('.'))
      if (typeof g !== 'number' || !isFinite(g)) { problems.push('grader figure missing: ' + row + ' ' + scope + ' ' + metric); continue }
      if (typeof l !== 'number' || !isFinite(l)) { problems.push('lane figure missing at ' + p); continue }
      const d = Math.abs(g - l); n++
      if (d > maxDiff) { maxDiff = d; worst = row + ' ' + scope + ' ' + metric }
      if (d > tol) problems.push('differs by ' + d.toExponential(3) + ': ' + row + ' ' + scope + ' ' + metric + ' grader ' + g + ' lane ' + l)
    }
  }
}
// the other direction: every MAIN arm row (<ARM>_alone, <ARM>_fused) and comparator the lane reports for this set
// must be in the return. The lane's report also holds sensitivity rows that are never handed off (the builder's
// reading, the fixed-w rows: rulings 53 and 54); they are listed, not compared.
const set = cc.set
const MAIN = /^(E[1-5]|PLACEBO)_(alone|fused)$/
const laneOnly = new Set()
for (const scope of cc.scopes) {
  const arms = get(L, 'arms.' + set + '.' + scope) || {}
  for (const label of Object.keys(arms)) {
    if (!MAIN.test(label)) { laneOnly.add(label); continue }
    if (!(label + '_mean' in G.rank)) problems.push('the lane reports ' + label + ' (' + scope + ') but the return has no ' + label + '_mean row')
    for (const k of Object.keys((arms[label] || {}).per_seed || {})) if (!((label + '_s' + k) in G.rank)) problems.push('the lane reports ' + label + ' seed ' + k + ' (' + scope + ') but the return has no row for it')
  }
  const comps = get(L, 'comparators.' + set + '.' + scope) || {}
  for (const c of Object.keys(comps)) if (COMP.includes(c) && !(c in G.rank)) problems.push('the lane reports comparator ' + c + ' (' + scope + ') but the return has none')
}
const out = { compared: n, rows: Object.keys(G.rank).length, max_abs_diff: maxDiff, worst, tolerance: tol, tasks: G.tasks, commits: G.commits, test: G.test,
  handoff_sha256: sha(hp), return_sha256: sha(gp), lane_report_sha256: sha(lp), scorer_files_sha256: (G.scorer || {}).files_sha256 || null,
  lane_only_rows_not_compared: [...laneOnly].sort(), problems }
console.log(JSON.stringify(out, null, 1))
process.exit(problems.length ? 1 : (n ? 0 : 2))
