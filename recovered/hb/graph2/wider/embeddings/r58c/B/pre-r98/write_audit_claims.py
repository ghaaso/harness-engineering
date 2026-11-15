"""write_audit_claims.py -- writer of AUDIT.md and CLAIMS.md (review finding audit-result-6).
Round r58c (agent B): the claim map mirrors the r58c write_result.py (u3, 'max abs diff', injection FAILED, E5 FAILED
with no specialist compared, distinct (checkpoint, path) pairs, items 28-31); RESULT.md is reproduced with the
tune-rank return, the anchor and the assemble-checks log as write_result reads them; the grader returns are read from
LANE/grader-returns/ in the real run (grader-interface-v2); AUDIT.md section 1 prints ruling 81's disclosure and
ruling 89's per-use rule (leak_audit.json disclosure81.text and ruling89.text) as a limit of the isolation, not a
clean pass; section 2b lists the mounted task rows (rows with a truth-like key, heldout.TRUTHY: the real run refuses,
exit 34; rows with remove_paths: counted, they are tune variants); the PASS line of the assemble checks carries the
tables digest (ruling 82) and is compared with the log. Test outputs go to r58c/B/out/wac/<NAME>/.

What it writes (it computes no result; every figure is read from an input and cited with its sha256):
  AUDIT.md   1. the leak audit table (item 18, ruling 60) from leak_audit.json, with ruling 35's disclosure word for word
             2. the mount audit of rulings 60, 72 and 78 (every mount row, ruling 78's staged-input check, coverage)
             3. ruling 72's list of the mounted eval/ folder, EVERY file (pilot_rows.tsv included, no cut): class,
                bytes, full sha256, why it is truth; walked here and compared with leak_audit.json's eval_files
             4. ruling 72's code lines, file:line from the CURRENT bytes: stage B loads tune_tasks.jsonl and calls
                kge.score with (task id, seed, candidates) (stageB.py), kge.train / kge.score signatures (kge.py),
                heldout.py's task fields and truth-key refusal, evalcore.candidates; every file-read site of kge.py
                and stageB.py; every line of the training/scoring code that reads a task's truth key (must be none)
             5. item 22's evidence when item22.json exists (ruling 61; injection failures printed as FAILED; the
                reciprocal relation labelled as item22.py's description; ruling 74's wording for E4; CO's floor note)
             6. the item-27 freeze (record and .sha256 file, plan hash, tables digest), HANDOFF.json's hash
             7. assemble_checks' PASS log against the current assemble_checks.py and tables digest (if present)
             8. rulings 47 and 69 word for word (69's rerun comparisons are NOT located: open question 4)
             9. ruling 86(b) and ruling 94(e)/(f) (end-order-changes-2 change 6): the held-out driver's rehearsal (END-ORDER
                2b: r58c/rehearsal/ logs, launch outputs, progress lines and inspect captures, heldout-launch/kge-H1R-launch.log)
                and the interface rehearsal (2e: r58c/B/out/rehearsal/ and r58c/B/out/logs/wr_rehearsal.log), every file
                with bytes and sha256; what the rehearsals cannot cover (the real record and anchor, the 70 real graphs,
                wall time); the mount record (docker inspect) of every container named in r58c/B/mounts-B.json and
                r58c/A/mounts-A.json, with sha256, item 22's (ktest-r5) and the result writer's (ktest-r6) included, which
                ran after the leak audit (ruling 95), but not this writer's own (ktest-r7, step 9.4, or an earlier record of
                it): ruling 95 leaves that one to the coordinator's step-10 audit; and which containers mount export/
                (ruling 94(f), ruling 89's per-use rule)
  CLAIMS.md  one row per claim of RESULT.md: the RESULT.md line, the claim as printed, its source file, that file's
             sha256 and the key inside it (a JSON pointer, RFC 6901), the value; lines with no data source are listed
             as write_result.py literals. RESULT.md must first be REPRODUCED: write_result.build() on the same input
             bytes must give RESULT.md's lines (paths of missing inputs normalised to their basenames).
Inputs read (real mode; fixed paths, no override, as ruling 80 does for item27):
  <repo>/docs/program/evidence/harness-bottlenecks/graph2/embeddings/RESULT.md and result.json  (write_result's output)
  train/report/tune.json, train/report/item22.json (optional), train/report/answer_level/answer_level.json (optional),
  train/leak_audit/leak_audit.json, train/heldout/item27.json and item27.json.sha256, train/heldout/HANDOFF.json
  (optional), train/stageB/plan.json, the repository's protocol-addendum-8.md, train/RUNLOG.md, the eval/ folder (walked;
  sealed/ never entered), train/stageB.py, train/kge.py, train/heldout.py, train/proj.py, export/checkpoints.py,
  eval/evalcore.py, train/write_result.py (pinned, imported for its formatting and build()), train/leak_audit.py
  (imported for its truth classes), orchestrator/assemble_checks.py and its PASS log (optional), and --answer-graded /
  --heldout when RESULT.md was written with them (their paths are not recorded by write_result: open question 7).
Refusals (named, nonzero, before anything is written):
  2 USAGE  20 MISSING_INPUT  21 TEST_MARKER (real mode: a test flag, the r58 test plan hash, a fake path or
  placeholder string, 'TEST OUTPUT')  22 PLAN_HASH  23 SOURCE_HASH (an input's bytes differ from what result.json cites,
  or a default input exists that RESULT.md was written without)  24 CLAIM_NOT_IN_RESULT  25 EVAL_LISTING
  26 CODE_EVIDENCE  27 WRITER_PIN (write_result.py is not the pinned bytes the claim map mirrors)  28 OUTDIR
  29 LEAK_AUDIT_FAIL  30 RESULT_NOT_REPRODUCED  31 REAL_INPUT_IN_TEST  32 PROTOCOL_TEXT  33 FREEZE_HASH  34 TASK_TRUTH
  35 REHEARSAL_EVIDENCE (real mode, section 9: no r58c/rehearsal/REHEARSAL.txt ending in RESULT PASS rehearsal, no 2e
     result.json with test true, no r58c/B/mounts-B.json, or a container of it without its r58c/mounts/<name>.json)
Modes:
  real  python write_audit_claims.py --outdir DIR [--answer-graded P] [--heldout P]
        --outdir is REQUIRED: nothing is ever written to the deliverable folder by default.
  test  python write_audit_claims.py --test --name NAME --result-dir D --tune P --leak P --item27 P --plan P
        [--item22 P] [--answer P] [--handoff P] [--protocol P] [--answer-graded P] [--heldout P] [--evidence DIR]
        (--evidence: the folder section 9 reads in place of the lane root; nothing there is refused in test mode)
        writes ONLY r58c/out/<NAME>/ (AUDIT.md and CLAIMS.md say TEST OUTPUT); refuses any input under the real
        train/report, train/leak_audit, train/heldout, train/stageB or the deliverable folder (exit 31). Markers are
        listed, not refused. Claims not found are listed and the run ends with exit 24 AFTER writing.
Open questions (for the coordinator / reviewer):
  1. Which file does write_result emit claims from? It emits none: build() copies each number from the loaded inputs
     into RESULT.md and records the inputs in result.json by basename and sha256 only. This draft therefore mirrors
     build()'s structure at the pinned write_result.py bytes (WRITE_RESULT_PIN). Should write_result emit the claim map
     itself (line -> input key -> pointer), so the map cannot drift from the writer?
  2. result.json does not record write_result.py's own sha256; the pin is checked against the current file, and the
     reproduce step (30) checks RESULT.md against build() on the cited input bytes.
  3. tune.json and item22.json carry no test/plan_hash field (audit-result-10): a synthetic tune.json at the real path
     cannot be told from a real one; this draft can only check markers, paths and plan hashes where they exist.
  4. Ruling 69's rerun comparisons (audit-result-6 part 6): their output files are not located here.
  5. The grader's ruling-73 literal check: its result format and location are not known to the lane.
  6. leak_audit.json keeps at most six files per mount row (leak_audit.py, `files[:6]`); the eval/ list here is the
     full walk, but a mount row's own file list stays cut.
  7. write_result takes --answer-graded/--heldout as free paths and records basenames only; this draft accepts them
     as explicit options and requires their sha256 to equal result.json's.
  8. Should AUDIT.md and CLAIMS.md land in the deliverable folder beside RESULT.md? This draft only writes where
     --outdir says.
"""
import os, sys, json, re, hashlib, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('EMB_ROOT') or os.path.dirname(HERE)
TRAIN = os.path.join(ROOT, 'train')
sys.path[:0] = [TRAIN, os.path.join(ROOT, 'eval')]
import write_result as WR  # formatting (f3, iv, word, ...), build(), ruling_text, the deliverable path
import leak_audit as LA    # TUNE_TRUTH, DERIVED, EVAL_WHY, TRUTH_READ: the audit's own truth classes

WRITE_RESULT_PIN = '47d6223c8a324381ff29aff065891d44eb4aeaf3a9667c370aa76d7388e20170'  # train/write_result.py, r58c final (changes if ABSENT_KEY is renamed)
DELIVERABLE = WR.DELIVERABLE
TEST_OUT = os.path.join(HERE, 'B', 'out', 'wac')
RETURNS = os.path.join(ROOT, 'grader-returns')
TRUTHY = ('truth', 'reference', 'references', 'files', 'defs', 'definitions', 'ref_files', 'ref_defs')  # train/heldout.py TRUTHY
TASKS_MOUNT = '/build/tasks/tasks.jsonl'
EXITS = dict(USAGE=2, MISSING_INPUT=20, TEST_MARKER=21, PLAN_HASH=22, SOURCE_HASH=23, CLAIM_NOT_IN_RESULT=24, EVAL_LISTING=25,
             CODE_EVIDENCE=26, WRITER_PIN=27, OUTDIR=28, LEAK_AUDIT_FAIL=29, RESULT_NOT_REPRODUCED=30, REAL_INPUT_IN_TEST=31,
             PROTOCOL_TEXT=32, FREEZE_HASH=33, TASK_TRUTH=34, REHEARSAL_EVIDENCE=35)
FAKE_HASHES = ('7e57' * 16,)  # the r58 tests' plan hash
MARKER_STRINGS = ('fakeB', 'selectB-test', 'report/test.json', 'sha256:r58-test-image', 'sha256:r58c-test', 'PLACEHOLDER', '"placeholder"')
REAL_INPUT_DIRS = [os.path.join(TRAIN, d) for d in ('report', 'leak_audit', 'heldout', 'stageB')] + [DELIVERABLE, RETURNS]
DEFAULT_PATHS = dict(tune=os.path.join(TRAIN, 'report', 'tune.json'), item22=os.path.join(TRAIN, 'report', 'item22.json'),
                     answer=os.path.join(TRAIN, 'report', 'answer_level', 'answer_level.json'),
                     leak=os.path.join(TRAIN, 'leak_audit', 'leak_audit.json'), item27=os.path.join(TRAIN, 'heldout', 'item27.json'),
                     handoff=os.path.join(TRAIN, 'heldout', 'HANDOFF.json'), plan=os.path.join(TRAIN, 'stageB', 'plan.json'),
                     protocol=WR.PROTOCOL, route=os.path.join(TRAIN, 'report', 'e5_route', 'e5_route.json'))
# ruling 72: the lines that show training takes no task and scoring takes only (task id, seed, candidates)
CODE_EVIDENCE = (
    ('stage B loads the tune tasks', 'train/stageB.py', r'^def load_tasks\(\):'),
    ('... from eval/tune_tasks.jsonl', 'train/stageB.py', r"open\(os\.path\.join\(ROOT, 'eval', 'tune_tasks\.jsonl'\)\)"),
    ('stage B loads the candidate lists', 'train/stageB.py', r"'candidates_%s\.tsv\.gz'"),
    ('a unit loads both', 'train/stageB.py', r'tasks = load_tasks\(\); cands = load_cands\(\)'),
    ('training gets arm, config, seed and checkpoint (no task)', 'train/stageB.py', r"kge\.train\(arm, c\['cfg'\], seed, C, "),
    ('scoring entry', 'train/stageB.py', r'^def score_tasks\('),
    ('the unit scores its checkpoint\'s tasks', 'train/stageB.py', r"score_tasks\(os\.path\.join\(mdir, 'reps\.pt'\), by_ck\[C\], cands,"),
    ('per task: id and parent only', 'train/stageB.py', r"tid = t\['task_id'\]; rec = dict\(parent=t\['parent'\]"),
    ('kge.score gets (task id, seed, candidates) and the parent', 'train/stageB.py',
     r"kge\.score\(reps_path, \[\(tid, t\['seed'\], cands\[sc\]\.get\(tid, \[\]\)\)\], t\['parent'\]\)"),
    ('kge.train signature', 'train/kge.py', r'^def train\(arm, config, seed, checkpoint_sha'),
    ('kge.score signature', 'train/kge.py', r'^def score\(reps_path, rows, parent_sha\):'),
    ('kge.score rows', 'train/kge.py', r'rows: \[\(task_id, seed_path, \[candidate paths\]\)\]'),
    ('held-out rows with a truth-like key are refused', 'train/heldout.py', r'if any\(k in r for k in TRUTHY\)'),
    ('held-out task fields', 'train/heldout.py',
     r"self\.tasks\.append\(dict\(task_id=r\['id'\], parent=P, seed=r\['seed'\]\['path'\], checkpoint=C"),
    ('held-out candidates from the seed', 'train/heldout.py', r"self\.cands = \{sc: \{t\['task_id'\]: ec\.candidates\(t, sc\)"),
    ('held-out training (no task)', 'train/heldout.py', r'kge\.train\(self\.arm, self\.cfg, seed, C, '),
    ('held-out scoring through stageB.score_tasks', 'train/heldout.py',
     r"stageB\.score_tasks\(os\.path\.join\(mdir, 'reps\.pt'\), self\.by_ck\[C\], self\.cands"),
    ('candidates come from the seed and parent', 'eval/evalcore.py', r'^def candidates\(task, scope\):'),
    ('... the pool of the seed', 'eval/evalcore.py', r"g\.pool\(task\['seed'\]\)"))
READ_SITES = re.compile(r"\bopen\(|torch\.load\(|gzip\.open\(|np\.load\(")
TRUTH_SCAN = ('train/stageB.py', 'train/kge.py', 'train/proj.py', 'export/checkpoints.py', 'train/heldout.py')


def refuse(name, why):
    print('write_audit_claims: REFUSED %s (exit %d): %s' % (name, EXITS[name], why), flush=True)
    raise SystemExit(EXITS[name])


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()


def under(p, d):
    ap = os.path.normcase(os.path.realpath(os.path.abspath(p))); r = os.path.normcase(os.path.realpath(os.path.abspath(d)))
    return ap == r or ap.startswith(r + os.sep)


def ptr(*parts):
    return '/' + '/'.join(str(p).replace('~', '~0').replace('/', '~1') for p in parts)


def cellesc(s): return str(s).replace('|', '\\|').replace('\n', ' ')


def jv(v, n=120): return json.dumps(v, sort_keys=True, default=str)[:n]


def parse(argv):
    real_opts = ('outdir',)
    test_opts = ('name', 'result-dir', 'tune', 'item22', 'answer', 'leak', 'item27', 'plan', 'handoff', 'protocol', 'answer-graded', 'heldout',
                 'tune-rank', 'anchor', 'ac-log', 'tasks', 'evidence', 'route')
    a = dict(test='--test' in argv); rest = [x for x in argv if x != '--test']
    if len(rest) % 2: refuse('USAGE', 'options come in pairs: %s' % rest)
    for k, v in zip(rest[::2], rest[1::2]):
        if not k.startswith('--') or k[2:] not in (test_opts if a['test'] else real_opts): refuse('USAGE', 'unknown option %r in %s mode' % (k, 'test' if a['test'] else 'real'))
        a[k[2:].replace('-', '_')] = v
    if a['test']:
        miss = [k for k in ('name', 'result_dir', 'tune', 'leak', 'item27', 'plan') if k not in a]
        if miss: refuse('USAGE', '--test needs %s' % miss)
        if not re.match(r'^[A-Za-z0-9_.-]+$', a['name']) or a['name'] in ('.', '..'): refuse('OUTDIR', 'bad --name %r' % a['name'])
        real = [(k, a[k]) for k in ('result_dir', 'tune', 'item22', 'answer', 'leak', 'item27', 'plan', 'handoff', 'answer_graded', 'heldout', 'tune_rank', 'anchor', 'ac_log', 'route')
                if a.get(k) and any(under(a[k], d) for d in REAL_INPUT_DIRS)]
        if real: refuse('REAL_INPUT_IN_TEST', 'test inputs under the real folders: %s' % real)
        a['outdir'] = os.path.join(TEST_OUT, a['name'])
        a.setdefault('protocol', WR.PROTOCOL)
    else:
        if 'outdir' not in a: refuse('OUTDIR', 'the real run needs an explicit --outdir (nothing is written to %s by default)' % DELIVERABLE)
        if under(a['outdir'], TEST_OUT): refuse('OUTDIR', 'the real run never writes under r58c/out (test outputs)')
        a['result_dir'] = DELIVERABLE
        for k, p in DEFAULT_PATHS.items(): a[k] = p
        a.update(answer_graded=os.path.join(RETURNS, 'tune-item24.json'), heldout=os.path.join(RETURNS, 'heldout.json'),
                 tune_rank=os.path.join(RETURNS, 'tune-rank.json'), anchor=os.path.join(ROOT, 'progress.jsonl'), ac_log=WR.runlog_ac_log(ROOT),
                 tasks=TASKS_MOUNT)
    a['result_md'] = os.path.join(a['result_dir'], 'RESULT.md'); a['result_json'] = os.path.join(a['result_dir'], 'result.json')
    return a


def load(p):
    return json.load(open(p, encoding='utf-8')) if p and os.path.exists(p) else None


def walk_json(o, path=()):
    if isinstance(o, dict):
        for k, v in o.items():
            yield path + (k,), k, v
            yield from walk_json(v, path + (k,))
    elif isinstance(o, list):
        for i, v in enumerate(o): yield from walk_json(v, path + (i,))


def markers(a, D, md_text):
    out = []
    for k, obj in D.items():
        if obj is None or not isinstance(obj, (dict, list)): continue
        for p, key, v in walk_json(obj):
            if key == 'test' and v is True: out.append('%s: %s is true' % (k, ptr(*p)))
            if key == 'plan_hash' and v in FAKE_HASHES: out.append('%s: %s is the r58 test plan hash' % (k, ptr(*p)))
        if k in ('leak', 'plan'): continue  # leak_audit.json lists lane file names under mounted folders (test outputs among them)
        raw = open(a[k], encoding='utf-8', errors='replace').read()
        out += ['%s: contains %r' % (k, m) for m in MARKER_STRINGS if m in raw]
    if 'TEST OUTPUT' in md_text: out.append('RESULT.md: says TEST OUTPUT')
    out += ['RESULT.md: contains %r' % m for m in MARKER_STRINGS if m in md_text]
    return out


# ------------------------------------------------------------------ RESULT.md locator
class Res:
    def __init__(self, lines): self.L = lines

    def section(self, head):
        if head not in self.L: return None
        i = self.L.index(head); j = i + 1
        while j < len(self.L) and not self.L[j].startswith('## '): j += 1
        return i, j

    def locate(self, head, needle, prefix=None, cell=None, mode='contains'):
        """-> (1-based line or None, why). mode: 'contains' (needle in the line or cell), 'equal' (cell or line equals)."""
        sec = self.section(head)
        if sec is None: return None, 'section %r not in RESULT.md' % head
        for k in range(*sec):
            l = self.L[k]
            if prefix is not None and not l.startswith(prefix): continue
            if cell is not None:
                cells = [c.strip() for c in l.strip().strip('|').split('|')]
                got = cells[cell] if cell < len(cells) else None
                hit = got is not None and (got == needle if mode == 'equal' else needle in got)
            else:
                hit = (l == needle) if mode == 'equal' else (needle in l)
            if hit: return k + 1, None
            if prefix is not None: return None, 'row %r does not show %r%s' % (prefix, needle, ' in cell %d' % cell if cell is not None else '')
        return None, '%r not found in section %r' % (needle, head)


def m2(d): return '%.3f' % d if isinstance(d, (int, float)) else 'n/a'


def build_claims(R, D, a, files):
    """Mirror of write_result.build() (pinned bytes): every number RESULT.md prints, with its input and pointer."""
    C = []

    def add(head, needle, src, ptrs, value, prefix=None, cell=None, mode='contains', printed=None):
        ln, why = R.locate(head, needle, prefix, cell, mode)
        C.append(dict(line=ln, printed=printed if printed is not None else needle, src=src, ptrs=ptrs, value=value, why=why))
        return ln, why

    def fields(head, line, src, items):
        """One exact line carrying several values: the line must equal `line`; one claim row per (printed, pointer, value)."""
        ln, why = R.locate(head, line, mode='equal')
        for printed, p, v in items: C.append(dict(line=ln, printed=printed, src=src, ptrs=[p], value=v, why=why))

    T = D['tune']; title = R.L[0] if R.L else ''
    add(title, '10,000 resamples', 'tune', [ptr('B')], T.get('B'))
    # ---- verdicts
    HV = '## Verdicts (section G, late 50, primary = fused minus RRF, pool P@10)'
    c = T['contrasts']['late50']; hol = T.get('holm', {}).get('late50', {}); cps = T['contrasts'].get('late50_pilot_shared', {})
    for arm in WR.EMB + ('PLACEBO',):
        if '%s_fused' % arm not in c['pool']: continue
        pre = '| %s |' % arm
        for cell, sc, v in ((1, 'pool', 'fused'), (4, 'pool', 'alone'), (6, 'unrestricted', 'fused')):
            r = c[sc]['%s_%s' % (arm, v)]; base = ('contrasts', 'late50', sc, '%s_%s' % (arm, v))
            add(HV, WR.iv(r['vs_RRF']['P@10']), 'tune', [ptr(*base, 'vs_RRF', 'P@10')], r['vs_RRF']['P@10'], pre, cell, 'equal')
            add(HV, WR.word(r['verdict_P10']), 'tune', [ptr(*base, 'verdict_P10')], r['verdict_P10'], pre, cell + 1, 'equal')
        h = hol.get('pool', {}).get('fused', {}).get('P@10', {}).get(arm)
        if h:
            add(HV, '[%s, %s] at %.4f' % (WR.f3(h['lo']), WR.f3(h['hi']), h['level']), 'tune', [ptr('holm', 'late50', 'pool', 'fused', 'P@10', arm)],
                {k: h.get(k) for k in ('lo', 'hi', 'level', 'p_holm')}, pre, 3, 'equal')
        sb = c['pool'].get('%s_fused_builder' % arm)
        if sb: add(HV, WR.iv(sb['vs_RRF']['P@10']), 'tune', [ptr('contrasts', 'late50', 'pool', '%s_fused_builder' % arm, 'vs_RRF', 'P@10')], sb['vs_RRF']['P@10'], pre, 8, 'equal')
        sp = cps.get('pool', {}).get('%s_fused' % arm)
        if sp: add(HV, WR.iv(sp['vs_RRF']['P@10']), 'tune', [ptr('contrasts', 'late50_pilot_shared', 'pool', '%s_fused' % arm, 'vs_RRF', 'P@10')], sp['vs_RRF']['P@10'], pre, 9, 'equal')
    hc = T.get('harness_check', {}); pp = 'Placebo (harness check'
    add(HV, 'harness_check.ok = %s' % hc.get('ok'), 'tune', [ptr('harness_check', 'ok')], hc.get('ok'), pp)
    add(HV, 'primary word "%s"' % WR.word(hc.get('placebo_primary_late50')), 'tune', [ptr('harness_check', 'placebo_primary_late50')], hc.get('placebo_primary_late50'), pp)
    for k, v in sorted(hc.get('placebo_fixed_w_late50_pool_P10_vs_RRF', {}).items()):
        add(HV, '%s %s' % (k, WR.iv(dict(zip(('diff', 'lo', 'hi'), v[:3])) if isinstance(v, list) else v)), 'tune',
            [ptr('harness_check', 'placebo_fixed_w_late50_pool_P10_vs_RRF', k)], v, pp)
    # ---- every metric on both scopes
    HA = '## All metrics, late 50 (item 23; seed means; arm cells: alone / fused)'
    A = T.get('arms', {}).get('late50', {}); CM = T.get('comparators', {}).get('late50', {})
    cols = [(sc, m) for sc in WR.SCOPES for m in WR.METRICS]
    for arm in WR.EMB + ('PLACEBO',):
        if '%s_fused' % arm not in A.get('pool', {}): continue
        for i, (sc, m) in enumerate(cols):
            al = A[sc]['%s_alone' % arm]['seed_mean'][m]; fu = A[sc]['%s_fused' % arm]['seed_mean'][m]
            add(HA, '%s / %s' % (m2(al), m2(fu)), 'tune', [ptr('arms', 'late50', sc, '%s_alone' % arm, 'seed_mean', m), ptr('arms', 'late50', sc, '%s_fused' % arm, 'seed_mean', m)],
                [al, fu], '| %s |' % arm, i + 1, 'equal')
    for n in WR.COMPS + ('RANDOM',):
        if n not in CM.get('pool', {}): continue
        for i, (sc, m) in enumerate(cols):
            add(HA, m2(CM[sc][n].get(m)), 'tune', [ptr('comparators', 'late50', sc, n, m)], CM[sc][n].get(m), '| %s |' % n, i + 1, 'equal')
    # ---- seeds
    HS = '## Seeds alone (item 25): fused minus RRF, pool P@10, per seed'
    for arm in WR.EMB + ('PLACEBO',):
        r = c['pool'].get('%s_fused' % arm)
        if not r: continue
        for s in sorted(r['per_seed_P10_vs_RRF']):
            v = r['per_seed_P10_vs_RRF'][s]
            add(HS, 's%s %s' % (s, WR.iv(v)), 'tune', [ptr('contrasts', 'late50', 'pool', '%s_fused' % arm, 'per_seed_P10_vs_RRF', s)], v, '- %s: ' % arm)
    # ---- answer level
    HL = '## Answer level (item 24; tuning split, late 50)'
    AL = D.get('answer'); AG = D.get('answer_graded')
    if AL:
        I24 = AL['item24']; LFR = AL['lane_file_recall']; o = AL['options']
        add(HL, 'options %s: %s form, %s granularity, pad %s' % (o['record'], o['form'], o['granularity'], o['pad']), 'answer',
            [ptr('options', k) for k in ('record', 'form', 'granularity', 'pad')], o)
        add(HL, '%s, %d tasks, %d commits, %d ranked lists' % (I24['handoff'], AL['tasks'], AL['commits'], AL['variants']), 'answer',
            [ptr('item24', 'handoff'), ptr('tasks'), ptr('commits'), ptr('variants')], [I24['handoff'], AL['tasks'], AL['commits'], AL['variants']])
        bn = lambda n: n[:-5] if n.endswith('_mean') else n  # write_result: <ARM>_<KIND>_mean is shown as <ARM>_<KIND>
        GL = {bn(k): v for k, v in AG['labels'].items()} if AG and isinstance(AG.get('labels'), dict) else None
        LFL = {bn(k): v for k, v in LFR['labels'].items()}

        def cells(src, names):
            got = [src.get(n) for n in names]
            if not any(got): return None
            mm = ' / '.join('n/a' if g is None else '%.3f' % g['mean']['primary'] for g in got)
            vv = []
            for g in got:
                vs = None if g is None else (g.get('vs_RRF') or {}).get('primary')
                vv.append('reference' if g is not None and vs is None else ('n/a' if vs is None else WR.iv(vs)))
            return mm, ' / '.join(vv)
        rows = [(arm, ['%s_alone' % arm, '%s_fused' % arm]) for arm in WR.EMB + ('PLACEBO',)] + [(x, [x]) for x in WR.COMPS]
        known = {n for _, ns in rows for n in ns}
        rows += [(n, [n]) for n in sorted(set(LFL) | set(GL or {})) if n not in known]
        for name, ns in rows:
            lc = cells(LFL, ns); gc = cells(GL, ns) if GL is not None else None
            off = 2 if GL is not None else 0
            lab = lambda n: n if n in LFR['labels'] else n + '_mean'
            if lc:
                add(HL, lc[0], 'answer', [ptr('lane_file_recall', 'labels', lab(n), 'mean', 'primary') for n in ns], lc[0], '| %s |' % name, 1 + off, 'equal')
                add(HL, lc[1], 'answer', [ptr('lane_file_recall', 'labels', lab(n), 'vs_RRF', 'primary') for n in ns], lc[1], '| %s |' % name, 2 + off, 'equal')
            if gc:
                add(HL, gc[0], 'answer_graded', [ptr('labels', n if n in AG['labels'] else n + '_mean', 'mean', 'primary') for n in ns], gc[0], '| %s |' % name, 1, 'equal')
                add(HL, gc[1], 'answer_graded', [ptr('labels', n if n in AG['labels'] else n + '_mean', 'vs_RRF', 'primary') for n in ns], gc[1], '| %s |' % name, 2, 'equal')
    # ---- item 22
    H22 = '## Item 22 (ruling 61): before an arm is called weak'
    I22 = D.get('item22')
    if I22:
        sa = I22['stage_a']; pre = 'Stage-A held-out triples'
        add(H22, '%d queries at %s' % (sa['held_out']['queries'], sa['held_out']['sha'][:8]), 'item22', [ptr('stage_a', 'held_out', 'queries'), ptr('stage_a', 'held_out', 'sha')],
            [sa['held_out']['queries'], sa['held_out']['sha']], pre)
        add(H22, 'PPR MRR %.3f' % sa['PPR']['mrr_all_entities'], 'item22', [ptr('stage_a', 'PPR', 'mrr_all_entities')], sa['PPR']['mrr_all_entities'], pre)
        add(H22, 'CO MRR %.3f' % sa['CO']['mrr_all_entities'], 'item22', [ptr('stage_a', 'CO', 'mrr_all_entities')], sa['CO']['mrr_all_entities'], pre)
        for arm in WR.EMB:
            pre = '| %s |' % arm
            for i, r in enumerate(sa['arms'].get(arm, [])):
                add(H22, '%s %.3f (%s / %s)' % (r['config_id'], r['mrr_all_entities'], WR.u3(r['loss_ratio_as_run']), WR.u3(r['loss_ratio_to_selection_epoch'])),
                    'item22', [ptr('stage_a', 'arms', arm, i, k) for k in ('mrr_all_entities', 'loss_ratio_as_run', 'loss_ratio_to_selection_epoch')],
                    [r['mrr_all_entities'], r['loss_ratio_as_run'], r['loss_ratio_to_selection_epoch']], pre, 1)
            for k, v in sorted(I22.get('stage_b_loss_ratio', {}).get(arm, {}).items()):
                add(H22, '%s %s (%d)' % (k, 'n/a' if v['median'] is None else '%.3f' % v['median'], v['units']), 'item22',
                    [ptr('stage_b_loss_ratio', arm, k, 'median'), ptr('stage_b_loss_ratio', arm, k, 'units')], [v['median'], v['units']], pre, 2)
            ck = I22.get('check_predict_target', {}).get(arm)
            if ck and arm == 'E5':
                sp = ck.get('specialists') or {}
                cks = 'per specialist: ' + ', '.join('%s %s' % (X, ('injection FAILED' if v.get('injected_reps_equal_kept') is False else
                                                                    '%s/%s identical' % (v.get('full_order_identical', '-'), v.get('queries', '-'))))
                                                     for X, v in sorted(sp.items()))
                if not ck.get('injected_reps_equal_kept') or not ck.get('specialists_compared'):
                    cks = 'FAILED (%s specialist(s) compared); ' % ck.get('specialists_compared', 0) + cks
                add(H22, cks, 'item22', [ptr('check_predict_target', 'E5', 'specialists'), ptr('check_predict_target', 'E5', 'specialists_compared')],
                    {X: (v.get('injected_reps_equal_kept'), v.get('full_order_identical'), v.get('queries')) for X, v in sp.items()}, pre)
            elif ck and ck.get('injected_reps_equal_kept') is False:
                cks = '%s: injection FAILED (the kept representations could not be written back; no comparison)' % ck['config_id']
                add(H22, cks, 'item22', [ptr('check_predict_target', arm, 'injected_reps_equal_kept')], False, pre)
            elif ck:
                cks = '%s: %s/%s orders identical, max abs diff %s%s' % (ck['config_id'], ck.get('full_order_identical'), ck.get('queries'),
                                                                     '%.1e' % ck['max_abs_score_diff'] if WR.isnum(ck.get('max_abs_score_diff')) else 'n/a',
                                                                     ' (fresh model, ruling 74)' if arm == 'E4' else '')
                add(H22, cks, 'item22', [ptr('check_predict_target', arm, k) for k in ('config_id', 'full_order_identical', 'queries', 'max_abs_score_diff')],
                    {k: ck.get(k) for k in ('config_id', 'full_order_identical', 'queries', 'max_abs_score_diff')}, pre)
    # ---- item 17 counts
    HC = '## Item 17 counts for the chosen configuration (ruling 62)'
    cn = T.get('counts', {})
    for arm in WR.EMB:
        if arm not in cn: continue
        x = cn[arm]['late50_block_choices']['pool']; o = x['occurrences']; dd = x['distinct']; dc = x.get('distinct_checkpoint_entities') or {}
        vals = [('same_across_seeds', x['same_across_seeds'], ('same_across_seeds',)), ('recompute_matches_counts', x['recompute_matches_counts'], ('recompute_matches_counts',)),
                ('tasks', o.get('tasks', 0), ('occurrences', 'tasks')), ('tasks_with_unscored_seed', o.get('tasks_with_unscored_seed', 0), ('occurrences', 'tasks_with_unscored_seed')),
                ('cands_of_unscored_seeds', o.get('cands_of_unscored_seeds', 0), ('occurrences', 'cands_of_unscored_seeds')),
                ('distinct cands_of_unscored_seeds', dd.get('cands_of_unscored_seeds', 0), ('distinct', 'cands_of_unscored_seeds')),
                ('distinct (checkpoint, path) cands_of_unscored_seeds', dc.get('cands_of_unscored_seeds', 0), ('distinct_checkpoint_entities', 'cands_of_unscored_seeds')),
                ('scored_seed_cands_unscored', o.get('scored_seed_cands_unscored', 0), ('occurrences', 'scored_seed_cands_unscored')),
                ('scored_seed_cands', o.get('scored_seed_cands', 0), ('occurrences', 'scored_seed_cands')),
                ('distinct absent_at_C + not_in_routed_specialists', dd.get('absent_at_C', 0) + dd.get('not_in_routed_specialists', 0), ('distinct',)),
                ('(checkpoint, path) absent_at_C + not_in_routed_specialists', dc.get('absent_at_C', 0) + dc.get('not_in_routed_specialists', 0), ('distinct_checkpoint_entities',)),
                ('absent at C', o.get('scored_seed_cands_unscored_absent_at_C', 0), ('occurrences', 'scored_seed_cands_unscored_absent_at_C')),
                ('not in a routed specialist', o.get('scored_seed_cands_unscored_not_in_routed_specialists', 0), ('occurrences', 'scored_seed_cands_unscored_not_in_routed_specialists')),
                ('tasks_on_checkpoint_without_co_changed', o.get('tasks_on_checkpoint_without_co_changed', 0), ('occurrences', 'tasks_on_checkpoint_without_co_changed')),
                ('folded (cands_folded + seeds_folded)', o.get('cands_folded', 0) + o.get('seeds_folded', 0), ('occurrences',))]
        line = ('- %s (pool, late 50, block choices, seed 1; seeds equal: %s; recomputed: %s): %d tasks; %d with an unscored seed (%d candidate'
                ' occurrences, %d distinct candidates, %d distinct (checkpoint, path) pairs); scored seeds: %d of %d candidate occurrences unscored'
                ' (%d distinct, %d (checkpoint, path) pairs), absent at C %d, not in a routed specialist %d; tasks on a checkpoint without'
                ' co_changed %d; folded %d.') % ((arm,) + tuple(v for _, v, _ in vals))
        fields(HC, line, 'tune', [('%s %s' % (nm, v), ptr('counts', arm, 'late50_block_choices', 'pool', *p), v) for nm, v, p in vals])
    # ---- held-out
    HH = '## Held-out (item 27; spent, descriptive only, no section-G word)'
    R27 = D.get('item27'); HO = D.get('heldout')
    if R27:
        ch = R27['chosen']
        line = 'Frozen before any held-out unit (%s): %s %s, w %g, %d epochs, s %d, device %s; all-65 figure %.4f; tie group %s.' % (
            R27['frozen_at'][:19], ch['arm'], ch['config_id'], ch['w'], ch['epochs'], R27['s'], R27['device'], ch['figure_all65'], ', '.join(R27['tie_group_4dp']))
        fields(HH, line, 'item27', [(str(v), ptr(*p), v) for v, p in ((R27['frozen_at'], ('frozen_at',)), (ch['arm'], ('chosen', 'arm')), (ch['config_id'], ('chosen', 'config_id')),
                                                                       (ch['w'], ('chosen', 'w')), (ch['epochs'], ('chosen', 'epochs')), (R27['s'], ('s',)), (R27['device'], ('device',)),
                                                                       (ch['figure_all65'], ('chosen', 'figure_all65')), (R27['tie_group_4dp'], ('tie_group_4dp',)))])
    if HO and R27:
        for v in WR.ho_variants(R27['chosen']['arm']):
            for i, (sc, m) in enumerate(cols):
                add(HH, '%.3f' % HO['rank'][v][sc][m], 'heldout', [ptr('rank', v, sc, m)], HO['rank'][v][sc][m], '| %s |' % v, i + 1, 'equal')
            add(HH, '%.3f' % HO['answer_level'][v], 'heldout', [ptr('answer_level', v)], HO['answer_level'][v], '| %s |' % v, len(cols) + 1, 'equal')
    # ---- lag and leak audit
    HG = '## Lag and leak audit'
    lag = T.get('lag', {})
    fields(HG, '- Stride s = %s; lag (ruling 52) over late-50 tasks %s, over all tune tasks %s.' % (lag.get('stride'), lag.get('late50_tasks'), lag.get('all_tune_tasks')),
           'tune', [(str(lag.get(k)), ptr('lag', k), lag.get(k)) for k in ('stride', 'late50_tasks', 'all_tune_tasks')])
    LK = D.get('leak')
    if LK:
        spl = {k: [v['checkpoints'], v['tasks']] for k, v in LK.get('splits', {}).items()}
        R92 = LK.get('ruling92') or {}  # write_result.build() ends this line with ruling 92's text (its ruling-92 change)
        line = ('- Leak audit (ruling 60): %s; checkpoints and tasks per split %s; failures %d; container mounts listed %d (table in AUDIT.md,'
                ' with ruling 35\'s disclosure). %s (leak_audit.json ruling92.text; check ok = %s)' % (
                    'PASS' if LK.get('ok') else 'FAIL', json.dumps(spl), len(LK.get('failures', [])), len(LK.get('mounts', [])),
                    R92.get('text') or 'Ruling 92: no ruling92.text in leak_audit.json.', R92.get('ok')))
        fields(HG, line, 'leak', [('PASS' if LK.get('ok') else 'FAIL', ptr('ok'), LK.get('ok')), (json.dumps(spl), ptr('splits'), spl),
                                  (str(len(LK.get('failures', []))), ptr('failures') + ' (count)', len(LK.get('failures', []))),
                                  (str(len(LK.get('mounts', []))), ptr('mounts') + ' (count)', len(LK.get('mounts', [])))])
    # ---- readings and limits
    HR = '## Readings recorded'
    plan = D.get('plan') or {}
    for i, cc in enumerate(plan.get('configs', {}).get('E2', [])):
        w = cc['cfg'].get('n3_weight')
        if w is not None: add(HR, '%s %g / 3 = %.4g' % (cc['config_id'], w, w / 3), 'plan', [ptr('configs', 'E2', i, 'cfg', 'n3_weight')], w, '- N3 weights')
    HI = '## Limits (section I, and the rulings reported as limits)'
    for n in WR.LIMIT_ITEMS:
        t = WR.ruling_text(a.get('protocol'), n)
        if t: add(HI, '- Item %s' % t, 'protocol', ['paragraph "%d. " (word for word)' % n], None, None, None, 'equal', printed='- Item %d (text)' % n)
    for n in WR.LIMIT_RULINGS:
        t = WR.ruling_text(a.get('protocol'), n)
        if t: add(HI, '- Ruling %s' % t, 'protocol', ['paragraph "%d. " (word for word)' % n], None, None, None, 'equal', printed='- Ruling %d (text)' % n)
    tx97 = WR.r97_texts(a.get('protocol')); RT = D.get('route')  # ruling 97 (b), (d): protocol texts, the route audit's counts, D1
    if tx97:
        add(HI, tx97[0], 'protocol', ['paragraph "97. " (b), word for word'], None, '- Ruling 97 (b)', printed='- Ruling 97 (b) routing (text)')
        add(HI, tx97[1], 'protocol', ['paragraph "97. " (b), word for word'], None, '- Ruling 97 (b)', printed='- Ruling 97 (b) rule (text)')
        add(HI, tx97[2], 'protocol', ['paragraph "97. " (d), word for word'], None, '- Ruling 97 (b)', printed='- Ruling 97 (d) (text)')
    if RT is not None and RT.get('applies'):
        r_ = RT.get('route') or {}
        add(HI, 'on %s of %s held-out tasks the second specialist was `other`' % (r_.get('second_other'), r_.get('tasks')), 'route',
            [ptr('route', 'second_other'), ptr('route', 'tasks')], [r_.get('second_other'), r_.get('tasks')], '- Ruling 97 (b)')
        add(HI, 'on %s a routed specialist was skipped' % r_.get('skipped'), 'route', [ptr('route', 'skipped')], r_.get('skipped'), '- Ruling 97 (b)')
    elif RT is not None:
        add(HI, 'the frozen arm is %s, not E5' % RT.get('arm'), 'route', [ptr('arm'), ptr('applies')], [RT.get('arm'), RT.get('applies')], '- Ruling 97 (b)')
    if RT is not None:
        p_ = RT.get('pool') or {}
        for k_, w_ in (('late50', 'late 50'), ('heldout', 'held-out')):
            v_ = p_.get(k_) or {}
            add(HI, '%s %s (%s tasks)' % (w_, v_.get('median'), v_.get('tasks')), 'route', [ptr('pool', k_, 'median'), ptr('pool', k_, 'tasks')],
                [v_.get('median'), v_.get('tasks')], '- Ruling 97 (b)', printed='median pool size, %s' % w_)
    add(HI, 'Under ruling 97 (d), D1 (r58c/closed-lists/FINDINGS-common.md): %s.' % WR.D1, 'write_result',
        ['D1 (constant; its source r58c/closed-lists/FINDINGS-common.md D1, named by the coordinator)'], None, '- Ruling 97 (b)', printed='- Ruling 97 (d), D1 (text)')
    t96 = WR.r96_limit(a.get('protocol'))  # ruling 96 (c): the difference between the splits, word for word from the protocol
    if t96: add(HI, '- ' + t96, 'protocol', ['paragraph "96. ": its (c) clause and its counts (word for word)'], None, None, None, 'equal', printed='- Ruling 96 (c) (text)')
    HSRC = '## Sources'
    for k, v in sorted((D.get('result_json') or {}).get('inputs', {}).items()):
        add(HSRC, '%s `%s` %s' % (k, v['file'], v['sha256'][:12]), k, ['(file sha256)'], v['sha256'])
    add(HH, WR.ITEM7, 'write_result', ['ITEM7 (constant; its upstream source is not cited by write_result)'], None, None, None, 'equal', printed='item 7 stored arms (constant)')
    # ---- every other non-blank line: write_result.py literal text (confirmed by the reproduce step)
    covered = {x['line'] for x in C if x['line']}
    for i, l in enumerate(R.L, 1):
        if i in covered or not l.strip() or re.match(r'^\|(-{3}\|)+$', l): continue
        C.append(dict(line=i, printed=l[:90] + ('...' if len(l) > 90 else ''), src='write_result', ptrs=['build() literal text'], value=None, why=None, literal=True))
    C.sort(key=lambda x: (x['line'] or 10 ** 9))
    return C


# ------------------------------------------------------------------ AUDIT.md parts
def eval_walk():
    out = []
    base = os.path.join(ROOT, 'eval')
    for dp, dn, fn in os.walk(base):
        dn[:] = sorted(d for d in dn if d not in ('__pycache__', 'sealed'))  # sealed/ is never entered
        for f in sorted(fn):
            p = os.path.join(dp, f); rel = os.path.relpath(p, ROOT).replace('\\', '/')
            cls = 'tune truth' if rel in LA.TUNE_TRUTH else 'derived from tune truth (aggregates)' if rel in LA.DERIVED else 'no truth'
            out.append(dict(file=rel, cls=cls, bytes=os.path.getsize(p), sha256=sha(p), why=LA.EVAL_WHY.get(rel, '')))
    return out


def find_lines(rel, rx):
    out = []
    for i, l in enumerate(open(os.path.join(ROOT, rel), encoding='utf-8', errors='replace'), 1):
        if re.search(rx, l): out.append((i, l.rstrip('\n')))
    return out


def code_evidence():
    rows, missing = [], []
    for what, rel, rx in CODE_EVIDENCE:
        hits = find_lines(rel, rx)
        if not hits: missing.append('%s: /%s/ (%s)' % (rel, rx, what))
        rows += [(what, rel, i, t.strip()) for i, t in hits]
    reads = [(rel, i, t.strip()) for rel in ('train/kge.py', 'train/stageB.py') for i, t in find_lines(rel, READ_SITES.pattern)]
    truth = [(rel, i, t.strip()) for rel in TRUTH_SCAN if os.path.exists(os.path.join(ROOT, rel)) for i, t in find_lines(rel, LA.TRUTH_READ.pattern)]
    return rows, missing, reads, truth


def md_code(t): return '`%s`' % t.replace('`', "'").replace('|', '/')[:160]


E1_NOTE = ('**E1, a note (r58c/closed-lists/FINDINGS-common.md, the coordinator):** `ranked_sha` (build/arms/common/harness.js:384) hashes'
           ' integer node ids, which shift when the new nodes sort in (facts.js:62-63). No lane or common code compares it.')
SELF_STEP = '9.4'  # ruling 95: the audit writer's own container (mounts-B.json step 9.4) is not listed here
AFTER_AUDIT = {'9.2': 'item 22', '9.2a': 'the E5 route audit (ruling 97)', '9.3': 'the result writer'}  # ruling 95: saved after the leak audit ran; listed with sha256
REH_KEEP = re.compile(r'(\.log|\.out|\.txt|\.rc|inspect.*\.json|progress.*\.jsonl|HANDOFF\.json)$')
UNCOVERED = ('the real item-27 record and its coordinator anchor, the 70 real held-out graphs, and the real run\'s wall time '
             '(ruling 86(b)); the rehearsals ran on three tuning parents with test records (2b) and on the grader\'s test set '
             'pick8, 8 late-50 commits and 37 tasks, with test flags (2e)')


def rehearsal_evidence(root):
    """Section 9 (ruling 86(b); ruling 94(e), (f)): dict(r2b, r2e, mounts, export, lists, problems). Every file row is
    (path relative to root, bytes, sha256). problems is what the real run refuses (exit 35)."""
    def row(rel_):
        q = os.path.join(root, rel_); return (rel_.replace(os.sep, '/'), os.path.getsize(q), sha(q))

    def walk(rel_, keep=None, skip=('inputs',)):
        out = []; base = os.path.join(root, rel_)
        for dp, dn, fn in os.walk(base):
            dn[:] = sorted(d for d in dn if not (dp == base and d in skip))
            for f in sorted(fn):
                if keep is None or keep.search(f): out.append(row(os.path.relpath(os.path.join(dp, f), root)))
        return out
    probs = []
    r2b = walk(os.path.join('r58c', 'rehearsal'), REH_KEEP)
    kl = os.path.join('heldout-launch', 'kge-H1R-launch.log')
    if os.path.exists(os.path.join(root, kl)): r2b.append(row(kl))
    rs = os.path.join(root, 'r58c', 'rehearsal', 'REHEARSAL.txt')
    if not os.path.exists(rs) or not re.search(r'RESULT PASS rehearsal\s*$', open(rs, encoding='utf-8', errors='replace').read()):
        probs.append('r58c/rehearsal/REHEARSAL.txt missing or not ending in RESULT PASS rehearsal (END-ORDER 2b)')
    r2e = walk(os.path.join('r58c', 'B', 'out', 'rehearsal'))
    wl = os.path.join('r58c', 'B', 'out', 'logs', 'wr_rehearsal.log')
    if os.path.exists(os.path.join(root, wl)): r2e.append(row(wl))
    rj = os.path.join(root, 'r58c', 'B', 'out', 'rehearsal', 'result.json')
    try: rj_test = json.load(open(rj)).get('test') if os.path.exists(rj) else None
    except ValueError: rj_test = None
    if rj_test is not True: probs.append('r58c/B/out/rehearsal/result.json missing or not test: true (END-ORDER 2e)')
    lists = {}; names = []
    for who, lp in (('B', os.path.join('r58c', 'B', 'mounts-B.json')), ('A', os.path.join('r58c', 'A', 'mounts-A.json'))):
        q = os.path.join(root, lp)
        if not os.path.exists(q):
            lists[lp.replace(os.sep, '/')] = None
            if who == 'B': probs.append('r58c/B/mounts-B.json missing (ruling 94(d))')
            continue
        try: M = json.load(open(q))
        except ValueError: M = {}; probs.append('%s is not JSON' % lp)
        lists[lp.replace(os.sep, '/')] = row(lp)
        names += [(who, k, (v or {}).get('step'), (v or {}).get('allow') or []) for k, v in sorted(M.items()) if not k.startswith('_')]
    mounts = []; exp = []
    own = sorted(k for who, k, step, _ in names if who == 'B' and str(step) == SELF_STEP)
    for who, k, step, allow in names:
        if k in own:  # ruling 95: not listed, not required (the coordinator's step-10 audit checks it)
            mounts.append((k, who, step, None)); continue
        cands = [os.path.join('r58c', 'mounts', k + '.json'), os.path.join('train', 'probe', k + '-inspect.json'),
                 os.path.join('train', 'heldout', k + '-inspect.json')]
        cands += [os.path.relpath(os.path.join(dp, f), root) for dp, _, fn in os.walk(os.path.join(root, 'r58c', 'rehearsal'))
                  for f in fn if f == k + '-inspect.json']
        got = [c for c in cands if os.path.exists(os.path.join(root, c))]
        mounts.append((k, who, step, [row(c) for c in got]))
        if who == 'B' and not got: probs.append('%s: no mount record r58c/mounts/%s.json (ruling 94(e))' % (k, k))
        if any(m.get('dst') in ('/w', '/w/export') or str(m.get('dst', '')).startswith('/w/export/') for m in allow):
            exp.append('%s (%s; %s)' % (k, step, ', '.join(sorted({m['dst'] for m in allow if m.get('dst') == '/w' or str(m.get('dst', '')).startswith('/w/export')}))))
    extra_rec = [row(os.path.relpath(os.path.join(root, 'r58c', 'mounts', f), root)) for f in sorted(os.listdir(os.path.join(root, 'r58c', 'mounts')))
                 if re.match(r'^.+\.[0-9]{8}T[0-9]{6}Z\.json$', f) and f.split('.')[0] not in own] if os.path.isdir(os.path.join(root, 'r58c', 'mounts')) else []
    kb1 = sorted(f for f in os.listdir(os.path.join(root, 'orchestrator')) if f.startswith('kge-B1-inspect') and f.endswith('.json')) \
        if os.path.isdir(os.path.join(root, 'orchestrator')) else []
    return dict(r2b=r2b, r2e=r2e, mounts=mounts, extra=extra_rec, kb1=[row(os.path.join('orchestrator', f)) for f in kb1],
                export=exp, lists=lists, problems=probs, own=own)


def audit_md(a, D, files, ev, codes, extra, is_test, marks):
    L = ['# AUDIT (embeddings lane, addendum 8)' + (' -- TEST OUTPUT' if is_test else ''), '',
         'Written %s by r58c/write_audit_claims.py (sha256 %s), a draft writer; it computes no result: every row below is read'
         ' from the files listed under Inputs.' % (datetime.datetime.utcnow().isoformat()[:19] + 'Z', files['writer']['sha256']), '']
    if marks: L += ['Test markers found (test mode lists them; the real run refuses): ' + '; '.join(marks), '']
    L += ['## Inputs', '', '| input | file | bytes | sha256 |', '|---|---|---|---|']
    L += ['| %s | %s | %d | %s |' % (k, cellesc(v['rel']), v['bytes'], v['sha256']) for k, v in sorted(files.items())]
    LK = D['leak']; P = a.get('protocol')
    rt = lambda n: WR.ruling_text(P, n) or '(paragraph %d not found in the protocol)' % n
    # 1 leak table
    L += ['', '## 1. Leak audit (item 18; ruling 60)', '', '> ' + rt(18), '', '> ' + rt(60), '',
          'From leak_audit.json (written %s; s = %s; plan_hash %s; ok = %s; test = %s).' % (LK.get('written'), LK.get('s'), LK.get('plan_hash'), LK.get('ok'), LK.get('test')),
          'c1: the task commit is not in C\'s history; c2: ruling 49; c3: C not later than P (ruling 50). Counts are tasks passing.', '',
          '| split | checkpoint | tasks | parents | C = P | c1 | c2 | c3 | task commit checked |', '|---|---|---|---|---|---|---|---|---|']
    for sp in ('tune', 'heldout'):
        for d in LK.get('splits', {}).get(sp, {}).get('rows', []):
            L.append('| %s | %s | %s | %s | %s | %s | %s | %s | %s |' % (sp, d['checkpoint'], d['tasks'], d['parents'], d['c_eq_p'], d['c1'], d['c2'], d['c3'], d.get('commit_checked')))
    L += ['', 'Totals: %s. Parts rows on their planned checkpoint (c4): %s.' % (
        '; '.join('%s %d checkpoints, %d tasks' % (k, v['checkpoints'], v['tasks']) for k, v in LK.get('splits', {}).items()), jv(LK.get('c4_parts'), 300)),
        'Failures: %d.%s' % (len(LK.get('failures', [])), '' if not LK.get('failures') else ' ' + '; '.join(jv(f, 300) for f in LK['failures'][:20])), '',
        '**Ruling 35 (disclosure), word for word:** ' + rt(35), '',
        '**Ruling 81 (disclosure; leak_audit.json disclosure81.text):** ' + ((LK.get('disclosure81') or {}).get('text') or '(not in leak_audit.json)'), '',
        '**Ruling 89, the per-use rule, a limit of the isolation and not a clean pass (leak_audit.json ruling89.text; check ok = %s):** %s' % (
            (LK.get('ruling89') or {}).get('ok'), (LK.get('ruling89') or {}).get('text') or '(not in leak_audit.json)'), '',
        '**Ruling 90 (the one by-design read of held-out lineage metadata, listed and not failed):** ' + (
            (LK.get('ruling90') or {}).get('text') or WR.ruling_text(P, 90) or
            'make_plan calls checkpoints.assignment_m(\'heldout\', ...) once, when the plan is written, and reads each held-out'
            ' parent\'s ancestors.txt and sizes.json to fix the held-out assignment and lag in the plan (rulings 49-52); no triple,'
            ' path or co-change pair is read there, and no training or scoring path of stage B opens a held-out parent\'s folder.'), '',
        '**Ruling 92 (the two stage-B guards; leak_audit.json ruling92.text; check ok = %s):** %s' % (
            (LK.get('ruling92') or {}).get('ok'), (LK.get('ruling92') or {}).get('text') or '(not in leak_audit.json)'), '',
        E1_NOTE, '']
    # 2 mounts
    r78 = LK.get('ruling78', {}); cov = LK.get('coverage', {})
    L += ['## 2. Mount audit (rulings 60, 72, 78)', '', '> ' + rt(72), '', '> ' + rt(78), '',
          'Coverage (a vacuous audit fails): ok = %s; roles %s; planned rows %s; problems %s.' % (cov.get('ok'), cov.get('roles'), jv(cov.get('planned_rows')), cov.get('problems') or 'none'),
          'Ruling 78: ok = %s; held-out parents %s; staged %s; problems %s.' % (r78.get('ok'), r78.get('parents'), jv(r78.get('staged')), r78.get('problems') or 'none'),
          'eval/ is mounted in: %s.' % (', '.join(LK.get('eval_mounted_in', [])) or 'no listed container'), '',
          '| mount (script:line or inspect) | container | host source | destination | class | files (as stored; at most 6 per row, open question 6) | ok | probe |',
          '|---|---|---|---|---|---|---|---|']
    for m in LK.get('mounts', []):
        L.append('| %s | %s | %s | %s | %s | %s | %s | %s |' % (cellesc(m.get('source')), m.get('container'), cellesc(m.get('host')), cellesc(m.get('dest')), m.get('cls'),
                                                            cellesc(', '.join(m.get('files') or [])), 'yes' if m.get('ok') else 'NO', m.get('probe')))
    # 2b mounted task rows
    tr = extra.get('tasks')
    L += ['', '## 2b. The mounted task rows (%s)' % (tr['file'] if tr else TASKS_MOUNT), '']
    if not tr: L += ['The task file is not mounted here: no rows to list.']
    else:
        L += ['%d rows (sha256 %s): per split %s; rows with remove_paths (tune variants that drop paths; no truth) %d; rows with a'
              ' truth-like key (%s) %d%s.' % (tr['rows'], tr['sha256'], json.dumps(tr['by_split'], sort_keys=True), tr['remove_paths_rows'],
                                               ', '.join(TRUTHY), len(tr['truthy']), (': ' + ', '.join('%s (%s)' % x for x in tr['truthy'][:20])) if tr['truthy'] else ''),
              'Row keys seen: %s.' % ', '.join(tr['keys'])]
    # 3 eval listing
    ew, lk_ev = extra['eval_walk'], {e['file']: e for e in LK.get('eval_files', [])}
    L += ['', '## 3. The mounted eval/ folder, every file (ruling 72)', '',
          'Walked here (sealed/ never entered); "leak audit agrees" compares bytes and sha256 with leak_audit.json\'s eval_files. %d files, %d of them tune truth.'
          % (len(ew), sum(1 for e in ew if e['cls'] == 'tune truth')), '',
          '| file | class | bytes | sha256 | why it is truth | leak audit agrees |', '|---|---|---|---|---|---|']
    for e in ew:
        g = lk_ev.get(e['file'])
        agree = 'absent' if g is None else ('yes' if (g.get('bytes'), g.get('sha256')) == (e['bytes'], e['sha256']) else 'NO')
        L.append('| %s | %s | %d | %s | %s | %s |' % (e['file'], e['cls'], e['bytes'], e['sha256'], cellesc(e['why']), agree))
    # 4 code lines
    rows, _, reads, truth = codes
    L += ['', '## 4. Training takes no task; scoring takes only task id, seed and candidates (ruling 72)', '',
          'Located by pattern in the current bytes (sha256 in Inputs). Stage B loads eval/tune_tasks.jsonl, but passes kge.score only'
          ' (task id, seed path, candidate list) and the parent sha; kge.train gets arm, configuration, seed and checkpoint.', '',
          '| what | file:line | code |', '|---|---|---|']
    L += ['| %s | %s:%d | %s |' % (cellesc(w), rel, i, md_code(t)) for w, rel, i, t in rows]
    L += ['', 'Every file-read site of train/kge.py and train/stageB.py (open, gzip.open, torch.load, np.load):', '']
    L += ['- %s:%d %s' % (rel, i, md_code(t)) for rel, i, t in reads]
    L += ['', 'Lines of %s that read a task\'s truth key (leak_audit.TRUTH_READ): %s.' % (', '.join(TRUTH_SCAN), 'none' if not truth else
                                                                                           '; '.join('%s:%d %s' % (r, i, md_code(t)) for r, i, t in truth)), '']
    # 5 item 22
    I22 = D.get('item22')
    L += ['## 5. Item 22 (ruling 61), before an arm is called weak', '', '> ' + rt(22), '']
    if not I22:
        L += ['item22.json is not present (train/report/item22.json): no item-22 evidence to show.', '']
    else:
        sa = I22['stage_a']
        L.append('Stage-A held-out triples: %s queries at %s; PPR MRR %.3f (file/doc %s), CO MRR %.3f (file/doc %s).' % (
            sa['held_out']['queries'], sa['held_out']['sha'], sa['PPR']['mrr_all_entities'], sa['PPR'].get('mrr_file_doc'), sa['CO']['mrr_all_entities'], sa['CO'].get('mrr_file_doc')))
        fl = find_lines('train/RUNLOG.md', r'floor by construction')
        L.append('CO\'s figure is a floor by construction, not a comparator score: %s.' % ('; '.join('train/RUNLOG.md:%d %s' % (i, md_code(t)) for i, t in fl) or 'RUNLOG note not found'))
        L += ['', '| arm | config | stage-A MRR all / file-doc | minus PPR / CO | loss ratio as run / to selection epoch | stage-B loss ratio median (units) |',
              '|---|---|---|---|---|---|']
        for arm in WR.EMB:
            sb = I22.get('stage_b_loss_ratio', {}).get(arm, {})
            for r in sa['arms'].get(arm, []):
                v = sb.get(r['config_id'], {})
                L.append('| %s | %s | %.3f / %s | %s / %s | %s / %s | %s (%s) |' % (arm, r['config_id'], r['mrr_all_entities'], r.get('mrr_file_doc'), WR.f3(r.get('minus_PPR_all')),
                                                                         WR.f3(r.get('minus_CO_all')), WR.f3(r.get('loss_ratio_as_run')), WR.f3(r.get('loss_ratio_to_selection_epoch')),
                                                                         'n/a' if v.get('median') is None else '%.3f' % v['median'], v.get('units')))
        L += ['', 'Comparison with PyKEEN\'s predict_target (tail prediction of (h, co_changed, ?)):', '']
        for arm in WR.EMB:
            ck = I22.get('check_predict_target', {}).get(arm)
            if not ck: L.append('- %s: not run.' % arm); continue
            inj = ck.get('injected_reps_equal_kept')
            if arm == 'E5':
                parts = []
                for X, v in sorted(ck.get('specialists', {}).items()):
                    parts.append('%s %s' % (X, 'injection FAILED' if v.get('injected_reps_equal_kept') is False else
                                            v.get('note') or '%s/%s orders identical' % (v.get('full_order_identical'), v.get('queries'))))
                txt = 'per specialist: ' + ', '.join(parts)
            elif arm == 'E4':
                txt = ('%s: %s/%s orders identical, max |diff| %s; a FRESH model of the selected configuration (ruling 74: it tests the scoring path, not the '
                       'stored model)' % (ck.get('config_id'), ck.get('full_order_identical'), ck.get('queries'), ck.get('max_abs_score_diff')))
            elif inj is False:
                txt = '%s: injection FAILED (the kept representations could not be loaded back); no comparison was made' % ck.get('config_id')
            else:
                txt = '%s: injection %s; %s/%s orders identical, max |diff| %s' % (ck.get('config_id'), 'ok' if inj else inj, ck.get('full_order_identical'), ck.get('queries'),
                                                                                  ck.get('max_abs_score_diff'))
            L.append('- %s: %s. Reciprocal relation, as item22.py describes it (a fixed description, not a check; audit-result-9): %s.' % (arm, txt, ck.get('reciprocal')))
        L += ['', '> Ruling 74: ' + rt(74), '']
    # 6 freeze
    R27 = D['item27']; fz = extra['freeze']
    L += ['## 6. Item 27 freeze (rulings 57, 80)', '', '> ' + rt(27), '',
          '- item27.json sha256 %s; item27.json.sha256 says %s (%s).' % (fz['sha'], fz['file_says'], 'match' if fz['sha'] == fz['file_says'] else 'MISMATCH'),
          '- chosen %s %s, w %s, epochs %s, s %s, device %s, image %s; plan_hash %s; test %s.' % (
              R27['chosen']['arm'], R27['chosen']['config_id'], R27['chosen']['w'], R27['chosen']['epochs'], R27.get('s'), R27.get('device'), R27.get('image_id'),
              R27.get('plan_hash'), R27.get('test')),
          '- tables %s, tables_digest %s; choices.json sha256 per arm %s.' % (R27.get('tables'), R27.get('tables_digest'), jv(R27.get('choices_sha256'), 600)),
          '- HANDOFF.json: %s.' % (('sha256 %s; its freeze_sha256 %s (%s)' % (fz['handoff_sha'], fz['handoff_freeze'], 'equals the record' if fz['handoff_freeze'] == fz['sha'] else 'DIFFERS'))
                                   if fz.get('handoff_sha') else 'not present'),
          '- The grader\'s literal check of ruling 73: not available to the lane (open question 5).', '']
    # 7 assemble checks
    ac = extra['assemble']
    L += ['## 7. Assembled tables (assemble_checks, rulings 66, 67)', '']
    L += ac if ac else ['No `PASS assemble-checks` line in train/RUNLOG.md (or its log is missing).']
    # 8 rulings 47 and 69
    L += ['', '## 8. Disclosures reported as they are', '', '**Ruling 47:** ' + rt(47), '', '**Ruling 69:** ' + rt(69), '',
          'Ruling 69\'s rerun comparisons: not located by this draft (open question 4).', '']
    # 9 rehearsals and mount records (ruling 86(b); ruling 94(e), (f))
    RE = extra.get('rehearsal') or {}
    tab = lambda rows: (['| file | bytes | sha256 |', '|---|---|---|'] + ['| %s | %d | %s |' % (cellesc(r_[0]), r_[1], r_[2]) for r_ in rows]) if rows else ['(none found)']
    L += ['## 9. Rehearsals and mount records (ruling 86(b); ruling 94(e), (f); ruling 95)', '', '> ' + rt(86), '', '> ' + rt(94), '',
          '> ' + rt(95), '',
          '### 9a. The held-out driver\'s rehearsal (END-ORDER 2b): logs and container records', ''] + tab(RE.get('r2b'))
    L += ['', '### 9b. The interface rehearsal (END-ORDER 2e): logs and outputs', ''] + tab(RE.get('r2e'))
    L += ['', '**What the rehearsals cannot cover:** ' + UNCOVERED + '.', '',
          '### 9c. Mount records (ruling 94(e)): the docker inspect of every container of every step, tests excluded', '',
          'Mount lists: ' + '; '.join('%s %s' % (k, ('sha256 %s' % v[2]) if v else 'NOT FOUND') for k, v in sorted((RE.get('lists') or {}).items())) + '.', '',
          '| container | list | step | record | bytes | sha256 |', '|---|---|---|---|---|---|']
    for k, who, step, rows in RE.get('mounts') or []:
        if rows is None:
            L.append('| %s | %s | %s | not listed: this writer\'s own record; the coordinator\'s step-10 audit checks it against the '
                     'launcher\'s fixed list (ruling 95) | | |' % (k, who, cellesc(step))); continue
        if not rows: L.append('| %s | %s | %s | NOT FOUND | | |' % (k, who, cellesc(step)))
        for r_ in rows: L.append('| %s | %s | %s | %s | %d | %s |' % (k, who, cellesc(step), cellesc(r_[0]), r_[1], r_[2]))
    for r_ in RE.get('kb1') or []: L.append('| kge-B1 | stage B | stage B | %s | %d | %s |' % (cellesc(r_[0]), r_[1], r_[2]))
    for r_ in RE.get('extra') or []: L.append('| (an earlier record of a repeated step) | | | %s | %d | %s |' % (cellesc(r_[0]), r_[1], r_[2]))
    aft = ['%s (%s)' % (k, AFTER_AUDIT[str(step)]) for k, who, step, rows in RE.get('mounts') or [] if who == 'B' and str(step) in AFTER_AUDIT]
    L += ['', '**Ruling 95:** the records of the containers that ran before the leak audit were passed to it (step 9.1); '
          'the records of %s, which ran after it, are listed above with their sha256; this writer\'s own record (%s) is not '
          'listed: the coordinator\'s independent audit of step 10 checks it.' % (', '.join(aft) or 'no container', ', '.join(RE.get('own') or []) or 'none named'), '']
    L += ['', '**Ruling 94(f), export/:** export/ stays mounted only where a step reads graphs, under ruling 89\'s per-use rule '
          '(section 1): %s; stage B\'s kge-B1 mounted it as well (its record above). Every other container of the lists mounts no export/ folder.'
          % ('; '.join(RE.get('export') or []) or 'no container of the lists'), '']
    return L


def claims_md(a, C, files, reproduced, is_test):
    L = ['# CLAIMS (embeddings lane): every claim in RESULT.md and where it comes from' + (' -- TEST OUTPUT' if is_test else ''), '',
         'RESULT.md sha256 %s; result.json sha256 %s. RESULT.md reproduced by write_result.build() (write_result.py sha256 %s) on the inputs'
         ' below: %s. Keys are JSON pointers (RFC 6901) into the source file.' % (files['result_md']['sha256'], files['result_json']['sha256'],
                                                                                 files['write_result']['sha256'], reproduced), '',
         '| # | RESULT.md line | claim as printed | source file | sha256 | key | value | status |', '|---|---|---|---|---|---|---|---|']
    for i, x in enumerate(C, 1):
        f = files.get(x['src'])
        L.append('| %d | %s | %s | %s | %s | %s | %s | %s |' % (
            i, x['line'] or '-', cellesc(x['printed']), cellesc(f['rel']) if f else '(no file: %s)' % x['src'], f['sha256'] if f else '-',
            cellesc('; '.join(map(str, x['ptrs']))), cellesc(jv(x['value'])) if x['value'] is not None else '-',
            'literal (reproduced)' if x.get('literal') else ('ok' if x['line'] else 'NOT FOUND: ' + cellesc(x['why']))))
    return L


# ------------------------------------------------------------------ main
def rel(p):
    ap = os.path.abspath(p)
    for base, tag in ((ROOT, ''), (WR.REPO, '<repo>/')):
        b = os.path.abspath(base)
        if ap.startswith(b + os.sep): return tag + os.path.relpath(ap, b).replace('\\', '/')
    return ap.replace('\\', '/')


PASS_AC = re.compile(r'^\s*PASS\s+assemble-checks\s+(\S+)(?:\s+tables_digest\s+([0-9a-f]{64}))?\s*$')


def task_rows(p):
    """Section 2b: the mounted task file's rows -> counts (None when absent). A row with a truth-like key (heldout.TRUTHY)
    is listed by id; a row with remove_paths is a tune variant and is only counted."""
    if not p or not os.path.exists(p): return None
    out = dict(file=p, sha256=sha(p), rows=0, by_split={}, remove_paths_rows=0, truthy=[], keys=set())
    for l in open(p, encoding='utf-8'):
        if not l.strip(): continue
        r = json.loads(l); out['rows'] += 1; out['keys'] |= set(r)
        out['by_split'][str(r.get('split'))] = out['by_split'].get(str(r.get('split')), 0) + 1
        if r.get('remove_paths'): out['remove_paths_rows'] += 1
        hit = [k for k in TRUTHY if k in r]
        if hit: out['truthy'].append((r.get('id', r.get('task_id')), ','.join(hit)))
    out['keys'] = sorted(out['keys'])
    return out


def norm_paths(l):
    return re.sub(r'(?:[A-Za-z]:)?[^\s(),;`]*[/\\]([^\s/\\(),;`]+\.json)', r'\1', l)


def main(argv):
    a = parse(argv); is_test = a['test']
    wr_sha = sha(os.path.join(TRAIN, 'write_result.py'))
    if wr_sha != WRITE_RESULT_PIN:
        if not is_test: refuse('WRITER_PIN', 'train/write_result.py is %s, the claim map mirrors %s' % (wr_sha[:12], WRITE_RESULT_PIN[:12]))
        print('write_audit_claims: note: write_result.py %s is not the pinned %s (test mode goes on)' % (wr_sha[:12], WRITE_RESULT_PIN[:12]), flush=True)
    # ---- inputs present
    need = ['result_md', 'result_json', 'tune', 'leak', 'item27', 'plan', 'protocol']
    miss = [k for k in need if not a.get(k) or not os.path.exists(a[k])]
    code = ['train/stageB.py', 'train/kge.py', 'train/heldout.py', 'train/proj.py', 'export/checkpoints.py', 'eval/evalcore.py', 'train/leak_audit.py', 'train/RUNLOG.md']
    miss += [c for c in code if not os.path.exists(os.path.join(ROOT, c))]
    if not is_test and not os.path.exists(a['item27'] + '.sha256'): miss.append('item27.json.sha256')
    if miss: refuse('MISSING_INPUT', ', '.join(miss))
    RJ = load(a['result_json'])
    cited = RJ.get('inputs', {})
    for k in ('item22', 'answer', 'answer_graded', 'heldout', 'handoff', 'tune_rank', 'anchor', 'ac_log', 'route'):
        if k in cited and not (a.get(k) and os.path.exists(a[k])): refuse('MISSING_INPUT', 'result.json cites %s (%s) but it is not given or not present' % (k, cited[k]['file']))
    # ---- the cited bytes
    bad = []
    for k, v in cited.items():
        p = a.get(k)
        if not p or not os.path.exists(p): bad.append('%s: not found here' % k); continue
        if os.path.basename(p) != v.get('file') or sha(p) != v.get('sha256'): bad.append('%s: %s %s, result.json cites %s %s' % (k, os.path.basename(p), sha(p)[:12], v.get('file'), str(v.get('sha256'))[:12]))
    for k in ('tune', 'item22', 'answer', 'leak', 'item27', 'handoff', 'plan', 'protocol', 'route'):
        if a.get(k) and os.path.exists(a[k]) and k not in cited: bad.append('%s exists (%s) but RESULT.md was written without it' % (k, rel(a[k])))
    if bad: refuse('SOURCE_HASH', '; '.join(bad))
    keys = ('tune', 'item22', 'answer', 'answer_graded', 'tune_rank', 'leak', 'item27', 'heldout', 'handoff', 'plan', 'route')
    D = {k: load(a.get(k)) for k in keys if a.get(k) and os.path.exists(a[k])}
    D['result_json'] = RJ
    md_text = open(a['result_md'], encoding='utf-8').read()
    lines = md_text.split('\n')
    if lines and lines[-1] == '': lines = lines[:-1]
    # ---- markers, plan hash, leak audit
    marks = markers(dict(a, result_json=a['result_json']), D, md_text)
    if marks and not is_test: refuse('TEST_MARKER', '; '.join(marks))
    ph = D['plan'].get('plan_hash'); diff = [(k, D[k].get('plan_hash')) for k in ('leak', 'item27', 'handoff') if k in D and 'plan_hash' in D[k] and D[k]['plan_hash'] != ph]
    if diff: refuse('PLAN_HASH', 'plan.json %s; differing: %s' % (str(ph)[:12], diff))
    if not is_test and (D['leak'].get('ok') is not True or D['leak'].get('test')): refuse('LEAK_AUDIT_FAIL', 'leak_audit.json ok=%s test=%s' % (D['leak'].get('ok'), D['leak'].get('test')))
    if not is_test and not ((D['leak'].get('ruling89') or {}).get('text') and (D['leak'].get('disclosure81') or {}).get('text')):
        refuse('LEAK_AUDIT_FAIL', 'leak_audit.json lacks ruling89.text or disclosure81.text (ruling 89: AUDIT.md states the per-use rule beside ruling 81)')
    # ---- protocol paragraphs AUDIT.md quotes word for word
    no_text = [n for n in (18, 22, 27, 35, 47, 60, 69, 72, 74, 78) if not WR.ruling_text(a['protocol'], n)]
    if no_text and not is_test: refuse('PROTOCOL_TEXT', 'paragraph(s) %s not found in %s' % (no_text, a['protocol']))
    # ---- freeze record
    fz = dict(sha=sha(a['item27']), file_says=(open(a['item27'] + '.sha256').read().split() or [None])[0] if os.path.exists(a['item27'] + '.sha256') else None)
    if a.get('handoff') and os.path.exists(a['handoff']):
        fz.update(handoff_sha=sha(a['handoff']), handoff_freeze=D['handoff'].get('freeze_sha256'))
    if not is_test and (fz['sha'] != fz['file_says'] or (fz.get('handoff_sha') and fz['handoff_freeze'] != fz['sha'])):
        refuse('FREEZE_HASH', 'item27.json %s, its .sha256 %s, HANDOFF freeze %s' % (fz['sha'][:12], str(fz['file_says'])[:12], str(fz.get('handoff_freeze'))[:12]))
    # ---- RESULT.md reproduced from these bytes by write_result.build()
    # an input not given gets a path that cannot exist, with the default's basename: build() prints "(<path> missing)" for it, and the
    # comparison below reduces paths to basenames; a real default file is never loaded in test mode this way
    absent = lambda k: os.path.join(HERE, 'out', '.absent-input', os.path.basename(DEFAULT_PATHS[k]))
    ba = dict(tune=a['tune'], item22=a.get('item22') or absent('item22'), answer=a.get('answer') or absent('answer'), answer_graded=a.get('answer_graded'),
              leak=a['leak'], item27=a['item27'], heldout=a.get('heldout'), handoff=a.get('handoff') or absent('handoff'), plan=a['plan'],
              protocol=a['protocol'], test=bool(RJ.get('test')), final=bool(RJ.get('final')), tune_rank=a.get('tune_rank'),
              anchor=a.get('anchor'), ac_log=a.get('ac_log'), route=a.get('route'))
    if D.get('tune_rank') is not None and D.get('answer') is not None:
        tb, ba['tune_rank_check'] = WR.check_tune_rank(D['tune_rank'], D['answer'], D['tune'], ba, ba['test'])
        if tb: refuse('RESULT_NOT_REPRODUCED', 'tune-rank.json no longer passes write_result.check_tune_rank: %s' % tb[:3])
    try:
        L0, _ = WR.build(ba)
    except (KeyError, TypeError, ValueError) as e:
        refuse('RESULT_NOT_REPRODUCED', 'write_result.build() failed on these inputs: %r' % e)
    if [norm_paths(x) for x in L0] != [norm_paths(x) for x in lines]:
        k = next((i for i, (x, y) in enumerate(zip(L0, lines)) if norm_paths(x) != norm_paths(y)), min(len(L0), len(lines)))
        refuse('RESULT_NOT_REPRODUCED', 'RESULT.md line %d differs from build(): %r vs %r (lengths %d, %d)' % (
            k + 1, lines[k][:120] if k < len(lines) else None, L0[k][:120] if k < len(L0) else None, len(lines), len(L0)))
    # ---- eval listing and code evidence
    ew = eval_walk(); lk_ev = {e['file']: (e.get('bytes'), e.get('sha256')) for e in D['leak'].get('eval_files', [])}
    own = {e['file']: (e['bytes'], e['sha256']) for e in ew}
    if own != lk_ev:
        why = 'eval/ now %d files, leak_audit.json lists %d; differing %s' % (len(own), len(lk_ev), sorted(set(own.items()) ^ set(lk_ev.items()))[:4])
        if not is_test: refuse('EVAL_LISTING', why)
        print('write_audit_claims: note (test mode): ' + why, flush=True)
    tt = [f for f in LA.TUNE_TRUTH if os.path.exists(os.path.join(ROOT, f)) and f not in own]
    if tt: refuse('EVAL_LISTING', 'tune-truth files missing from the walk: %s' % tt)
    codes = code_evidence()
    if codes[1]: refuse('CODE_EVIDENCE', 'pattern(s) not found in the current bytes: ' + '; '.join(codes[1]))
    if codes[3] and not is_test: refuse('CODE_EVIDENCE', 'training/scoring code reads a truth key: %s' % codes[3][:3])
    # ---- the mounted task rows (section 2b)
    trows = task_rows(a.get('tasks'))
    if trows and trows['truthy'] and not is_test: refuse('TASK_TRUTH', '%d mounted task row(s) carry a truth-like key: %s' % (len(trows['truthy']), trows['truthy'][:3]))
    if not trows and not is_test: refuse('MISSING_INPUT', 'the mounted task file %s' % a.get('tasks'))
    # ---- assemble checks (optional section)
    ac = []
    pl = find_lines('train/RUNLOG.md', PASS_AC.pattern)
    if pl:
        pm = PASS_AC.match(pl[-1][1]); lp = os.path.join(ROOT, pm.group(1)); pass_td = pm.group(2)
        if os.path.exists(lp):
            txt = open(lp, encoding='utf-8', errors='replace').read(); hac = sha(os.path.join(ROOT, 'orchestrator', 'assemble_checks.py'))
            td = re.findall(r'^tables_digest (\S+)$', txt, re.M)
            want = None
            if not is_test:
                import selectB  # ruling 82: the decompressed planned tables of train/stageB/tables (selectB.tables_digest)
                want = selectB.tables_digest(os.path.join(TRAIN, 'stageB', 'tables'), D['plan'])
            ac = ['- RUNLOG line %d names %s (sha256 %s).' % (pl[-1][0], rel(lp), sha(lp)),
                  '- `assemble_checks PASS` in it: %s; REFUSED line: %s; sha256 of the current orchestrator/assemble_checks.py (%s) in it: %s.' % (
                      bool(re.search(r'^assemble_checks PASS\b', txt, re.M)), bool(re.search(r'^assemble_checks REFUSED', txt, re.M)), hac,
                      bool(re.search(r'^sha256 %s\b' % hac, txt, re.M))),
                  '- tables_digest in the log %s; on the RUNLOG PASS line %s (%s); of the current tables %s.' % (
                      td, pass_td, 'equal to the log' if pass_td and td and pass_td == td[-1] else 'DIFFERS from the log or absent', want or 'not computed in test mode'),
                  '- Runner lines in the log (first 20):'] + ['  - %s' % md_code(l) for l in re.findall(r'^.*runner.*$', txt, re.M)[:20]]
    # ---- files table
    files = {}
    for k in ('result_md', 'result_json', 'tune', 'item22', 'answer', 'answer_graded', 'leak', 'item27', 'heldout', 'handoff', 'plan', 'protocol', 'route'):
        if a.get(k) and os.path.exists(a[k]): files[k] = dict(rel=rel(a[k]), bytes=os.path.getsize(a[k]), sha256=sha(a[k]))
    for k, p in (('write_result', os.path.join(TRAIN, 'write_result.py')), ('writer', os.path.abspath(__file__)), ('leak_audit_py', os.path.join(TRAIN, 'leak_audit.py'))):
        files[k] = dict(rel=rel(p), bytes=os.path.getsize(p), sha256=sha(p))
    for c in sorted({x[1] for x in CODE_EVIDENCE} | set(TRUTH_SCAN) | {'train/RUNLOG.md'}):
        p = os.path.join(ROOT, c)
        if os.path.exists(p): files['code:' + c] = dict(rel=c, bytes=os.path.getsize(p), sha256=sha(p))
    # ---- claims
    C = build_claims(Res(lines), D, a, files)
    lost = [x for x in C if not x['line'] and not x.get('literal')]
    if lost and not is_test: refuse('CLAIM_NOT_IN_RESULT', '%d claim(s), first: %s (%s)' % (len(lost), lost[0]['printed'][:80], lost[0]['why']))
    # ---- section 9: rehearsals and mount records (ruling 86(b); ruling 94(e), (f))
    reh = rehearsal_evidence(a.get('evidence') if is_test and a.get('evidence') else ROOT)
    if reh['problems'] and not is_test: refuse('REHEARSAL_EVIDENCE', '; '.join(reh['problems'][:6]))
    AU = audit_md(a, D, files, None, codes, dict(eval_walk=ew, freeze=fz, assemble=ac, tasks=trows, rehearsal=reh), is_test, marks)
    CL = claims_md(a, C, files, 'yes', is_test)
    out = a['outdir']
    if not is_test and under(out, TRAIN): refuse('OUTDIR', '%s lies under train/' % out)
    os.makedirs(out, exist_ok=True)
    for name, L in (('AUDIT.md', AU), ('CLAIMS.md', CL)):
        p = os.path.join(out, name)
        with open(p + '.part', 'w', encoding='utf-8', newline='\n') as f: f.write('\n'.join(L) + '\n')
        os.replace(p + '.part', p)
    print('write_audit_claims: wrote AUDIT.md (%d lines) and CLAIMS.md (%d claims, %d literal lines) to %s%s' % (
        len(AU), len(C), sum(1 for x in C if x.get('literal')), out, ' (TEST OUTPUT)' if is_test else ''), flush=True)
    if lost: refuse('CLAIM_NOT_IN_RESULT', '%d claim(s) not found (test mode wrote CLAIMS.md first): %s' % (len(lost), lost[0]['printed'][:80]))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
