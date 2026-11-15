// Ruling 82 tables digest, recomputed in Node from selectB.tables_digest's description (selectB.py:142-157).
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const LANE = process.argv[2];
const tb = path.join(LANE, 'train', 'stageB', 'tables');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const fsha = (p, gz) => fs.existsSync(p) ? sha(gz ? zlib.gunzipSync(fs.readFileSync(p)) : fs.readFileSync(p)) : 'missing';
const planP = path.join(LANE, 'train', 'stageB', 'plan.json');
const plan = JSON.parse(fs.readFileSync(planP, 'utf8'));
const h = crypto.createHash('sha256');
h.update('plan.json\t' + fsha(planP, false) + '\n');
let missing = 0;
for (const arm of Object.keys(plan.configs).sort()) for (const c of plan.configs[arm]) for (const s of [1, 2, 3])
  for (const [suf, gz] of [['_pool.tsv.gz', true], ['_unrestricted.tsv.gz', true], ['_counts.json', false]]) {
    const n = arm + '_' + c.config_id + '_s' + s + suf; const v = fsha(path.join(tb, n), gz); if (v === 'missing') missing++;
    h.update(n + '\t' + v + '\n'); }
const d = h.digest('hex');
const rec = JSON.parse(fs.readFileSync(path.join(LANE, 'train', 'heldout', 'item27.json'), 'utf8'));
console.log('digest', d, 'record', rec.tables_digest, 'equal', d === rec.tables_digest, 'missing', missing, 'arms', Object.keys(plan.configs).sort().join(','));
