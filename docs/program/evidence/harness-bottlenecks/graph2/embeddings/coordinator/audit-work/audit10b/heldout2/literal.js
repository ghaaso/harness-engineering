const fs = require('fs'), cp = require('child_process');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const R = 'C:/Users/User/Documents/projects/EMS_workshop1';
const OUT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/audit10b/heldout2/';
const git = (a) => cp.execFileSync('git', ['-C', R, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const truth = fs.readFileSync(OUT + 'heldout_truth2.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
const hist = {}, anc = {};
let inHist = 0, inHistAlt = 0, parentMismatch = 0, parentNotInHist = 0, histNotAnc = 0, mergeOrUnreach = 0, notReach = 0;
const frozen = 'a31924a3818f4ac94b695906d107c72c912792b2';
const lines = [];
for (const p of new Set(truth.map((t) => t.parent))) {
  hist[p] = new Set(fs.readFileSync(`${L}/export/graphs/${p}/ancestors.txt`, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));
  anc[p] = new Set(git(['rev-list', p]).split('\n').filter(Boolean));
  if (!hist[p].has(p)) parentNotInHist++;
  for (const h of hist[p]) if (!anc[p].has(h)) histNotAnc++;
}
const reach = {};
for (const t of truth) {
  if (hist[t.parent].has(t.commit)) inHist++;
  for (const a of t.alt_commits) if (hist[t.parent].has(a)) inHistAlt++;
  const fp = git(['rev-list', '--parents', '-n1', t.commit]).trim().split(' ')[1];
  if (fp !== t.parent) parentMismatch++;
  if (!(t.commit in reach)) { try { git(['merge-base', '--is-ancestor', t.commit, frozen]); reach[t.commit] = true; } catch { reach[t.commit] = false; } }
  if (!reach[t.commit]) notReach++;
  for (const a of t.alt_commits) { let r; try { git(['merge-base', '--is-ancestor', a, frozen]); r = true; } catch { r = false; } const np = git(['rev-list', '--parents', '-n1', a]).trim().split(' ').length - 1; if (np > 1 || !r) mergeOrUnreach++; else lines.push('alt is reachable non-merge: ' + t.task_id + ' ' + a); }
}
const altTasks = truth.filter((t) => t.alt_commits.length).length;
const s = [`tasks ${truth.length}; task commit in its parent's ancestors.txt: ${inHist}; alternate commits in it: ${inHistAlt}; first-parent mismatch: ${parentMismatch}`,
  `parents ${Object.keys(hist).length}; parent missing from its own ancestors.txt: ${parentNotInHist}; ancestors.txt entries that are not git ancestors of the parent: ${histNotAnc}`,
  `picked commits not reachable from frozen main ${frozen.slice(0, 7)}: ${notReach}; tasks with an alternate commit: ${altTasks}; alternates that are merges or unreachable (task-rows x alternates): ${mergeOrUnreach}`, ...lines].join('\n');
fs.writeFileSync(OUT + 'literal.out', s + '\n'); console.log(s);
