"""heldout.py: the one held-out run of addendum 8 item 27 (ruling 58). Produces ranked lists and packs ONLY;
held-out truth stays with the grader (this script never opens sealed/, a reference file, or tune_tasks.jsonl in
a real run).

What it runs: the arm, configuration, w and epochs frozen by item27.py (train/heldout/item27.json, checked against
its .sha256 file and against the current bytes of every code file it lists), 3 seeds, at every held-out checkpoint
of plan.json (s = 1 at stage B's plan: C = P), exactly stage B's training path (kge.train on the whole checkpoint
graph, fixed epochs, no early stopping; stageB.score_tasks / write_parts / verify_parts; ruling 65's
check_no_fold on every unit and on every merged seed). E4 runs with ruling 67's settings, made here before torch
loads (CUBLAS_WORKSPACE_CONFIG=:4096:8, torch.use_deterministic_algorithms(True); the same two as detrun.py) and
every part's runner records ' det=1'. The model file is deleted once its scores are written and read back.
Then: per seed, the arm alone and fused (weighted RRF of PPR, CO and the embedding, k = 60, the frozen w), plus RRF,
PPR, CO and DIR (evalcore, on the held-out tasks), for both scopes; ranked lists per variant and scope
(ranked/<variant>_<scope>.jsonl.gz) for the grader's rank metrics; packs of the UNRESTRICTED lists through
answer_level.py (answers/<variant>.jsonl.gz) for the grader's answer-level measure; HANDOFF.json with sha256 of
everything. Resumable: units and every later step log to <out>/progress.jsonl (its own file) and are skipped when
done and their output exists.
Refusals: no frozen record or a hash mismatch (exit 5); plan hash or s differ from the record; the device or the
image (env KGE_IMAGE_ID, set by heldout.sh) differ from the record; a task row carrying truth-like keys or a
tasks path under sealed/ (exit 6); a test record without --test or a real record with --test.
usage:
  python heldout.py run [--freeze PATH] [--plan PATH] [--tasks PATH] [--out DIR]
  python heldout.py run --test --freeze <test record> --tasks <build tasks.jsonl> --out <dir> --parents p1,p2
                        [--test-epochs N]      (plumbing test: TUNE parents and tasks only)
"""
import os, sys, json, gzip, time, shutil, hashlib, collections, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('EMB_ROOT') or os.path.dirname(HERE)


def _opts(argv):
    o = dict(cmd=argv[0] if argv else 'run', test=False)
    i = 1
    while i < len(argv):
        if argv[i] == '--test': o['test'] = True; i += 1; continue
        o[argv[i][2:]] = argv[i + 1]; i += 2
    o.setdefault('freeze', os.path.join(HERE, 'heldout', 'item27.json'))
    o.setdefault('plan', os.path.join(HERE, 'stageB', 'plan.json'))
    o.setdefault('tasks', os.environ.get('GT_TASKS') or os.path.join(ROOT, '..', '..', 'build', 'tasks', 'tasks.jsonl'))
    o.setdefault('out', os.path.join(HERE, 'heldout'))
    return o


OPT = _opts(sys.argv[1:]) if __name__ == '__main__' else None
DET = False
if OPT is not None and os.path.exists(OPT['freeze']):
    try:
        DET = json.load(open(OPT['freeze']))['chosen']['arm'] == 'E4'
    except Exception:
        DET = False
if DET:  # ruling 67, before torch loads (as detrun.py)
    os.environ['CUBLAS_WORKSPACE_CONFIG'] = ':4096:8'
    import torch
    torch.use_deterministic_algorithms(True)
    assert torch.are_deterministic_algorithms_enabled()
os.environ['STAGEB_RUNNER'] = 'heldout.py' + (' det=1' if DET else '')

sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, 'export')); sys.path.insert(0, os.path.join(ROOT, 'eval'))
import kge, stageB, item27
import checkpoints as ck
import evalcore as ec
from atomic import put_json

SEEDS = (1, 2, 3); SCOPES = ('pool', 'unrestricted')
TRUTHY = ('truth', 'reference', 'references', 'files', 'defs', 'definitions', 'ref_files', 'ref_defs')


def now(): return datetime.datetime.utcnow().isoformat() + 'Z'


class Run:
    def __init__(self, o):
        self.o = o; self.out = o['out']; os.makedirs(self.out, exist_ok=True)
        self.prog = os.path.join(self.out, 'progress.jsonl')

    def log(self, unit, status, **kw):
        with open(self.prog, 'a') as f: f.write(json.dumps(dict(step='heldout', unit=unit, status=status, t=now(), **kw)) + '\n')

    def done(self):
        if not os.path.exists(self.prog): return set()
        return {r.get('unit') for r in stageB._lines(self.prog) if r.get('status') == 'done'}

    # ------------------------------------------------------------ checks
    def verify(self):
        o = self.o
        rec, fh = item27.verify(o['freeze'])
        if bool(rec.get('test')) != bool(o['test']):
            raise SystemExit('heldout: the record test=%s does not match --test=%s' % (rec.get('test'), o['test']))
        bad = [p for p, h in rec['code_sha256'].items() if h is not None and (not os.path.exists(os.path.join(ROOT, p))
                                                                             or stageB.sha256_file(os.path.join(ROOT, p)) != h)]
        if bad:
            print('heldout: refusing (exit 5): code differs from the frozen record: %s' % bad, flush=True); raise SystemExit(5)
        plan = json.load(open(o['plan']))
        if plan.get('plan_hash') != rec['plan_hash'] or int(plan['s']) != int(rec['s']):
            print('heldout: refusing (exit 5): plan %s s=%s, record %s s=%s' % (plan.get('plan_hash'), plan['s'], rec['plan_hash'], rec['s']), flush=True)
            raise SystemExit(5)
        if kge.DEVICE.type != rec['device']:
            print('heldout: refusing (exit 5): device %s, record %s (ruling 41)' % (kge.DEVICE.type, rec['device']), flush=True); raise SystemExit(5)
        if os.environ.get('KGE_IMAGE_ID') != rec['image_id']:
            print('heldout: refusing (exit 5): KGE_IMAGE_ID %s, record %s (ruling 41)' % (os.environ.get('KGE_IMAGE_ID'), rec['image_id']), flush=True)
            raise SystemExit(5)
        self.rec, self.fh, self.plan = rec, fh, plan
        self.arm = rec['chosen']['arm']; self.cid = rec['chosen']['config_id']; self.cfg = rec['chosen']['cfg']
        self.w = float(rec['chosen']['w']); self.epochs = int(rec['chosen']['epochs'])
        if o['test'] and o.get('test-epochs'): self.epochs = int(o['test-epochs'])
        print('heldout: record %s sha256 %s: %s %s w %g epochs %d s %d device %s det %s' % (
            o['freeze'], fh[:12], self.arm, self.cid, self.w, self.epochs, rec['s'], rec['device'], DET), flush=True)

    def load_tasks(self):
        o = self.o
        if 'sealed' in os.path.abspath(o['tasks']).replace('\\', '/').split('/'):
            print('heldout: refusing (exit 6): tasks path under sealed/', flush=True); raise SystemExit(6)
        split = 'tune' if o['test'] else 'heldout'
        rows = []
        for l in open(o['tasks']):
            if not l.strip(): continue
            r = json.loads(l)
            if r.get('set') != 'T1' or r.get('split') != split: continue
            if any(k in r for k in TRUTHY):
                print('heldout: refusing (exit 6): task %s carries a truth-like key' % r.get('id'), flush=True); raise SystemExit(6)
            rows.append(r)
        if o.get('parents'):
            want = set(o['parents'].split(','))
            if not o['test']: raise SystemExit('heldout: --parents is for the plumbing test only')
            rows = [r for r in rows if r['parent'] in want]
        if o['test']:
            assert all(r['split'] == 'tune' for r in rows), 'the plumbing test runs on tune tasks only'
        hp = self.plan['heldout'] if not o['test'] else dict(assignment=self.plan['assignment'], lag_by_parent=self.plan['lag_by_parent'],
                                                             checkpoints=self.plan['checkpoints'])
        F = ck.Facts(os.path.join(ROOT, 'export'))
        self.tasks = []
        for r in rows:
            P = r['parent']; C = hp['assignment'][P]
            assert C in hp['checkpoints'] and F.valid(C, P), ('leak rule', r['id'], P, C)
            self.tasks.append(dict(task_id=r['id'], parent=P, seed=r['seed']['path'], checkpoint=C, lag=hp['lag_by_parent'][P]))
        self.tasks.sort(key=lambda t: (F.key(t['checkpoint']), t['task_id']))
        self.ckpts = sorted({t['checkpoint'] for t in self.tasks}, key=F.key)
        self.cands = {sc: {t['task_id']: ec.candidates(t, sc) for t in self.tasks} for sc in SCOPES}
        self.lag = {t['task_id']: t['lag'] for t in self.tasks}
        print('heldout: %d tasks (%s), %d checkpoints, split %s' % (len(self.tasks), len({t['parent'] for t in self.tasks}), len(self.ckpts), split), flush=True)

    # ------------------------------------------------------------ units (stage B's path)
    def part_dir(self, seed, C): return os.path.join(self.out, 'parts', self.arm, self.cid, 's%d' % seed, C)

    def part_ok(self, out):
        try: return json.load(open(os.path.join(out, 'meta.json'))).get('freeze_sha256') == self.fh and os.path.exists(os.path.join(out, 'counts.json'))
        except Exception: return False

    def units(self):
        by_ck = collections.defaultdict(list)
        for t in self.tasks: by_ck[t['checkpoint']].append(t)
        failed = 0
        for seed in SEEDS:
            for C in self.ckpts:
                unit = 'unit/%s/%s/s%d/%s' % (self.arm, self.cid, seed, C[:12])
                out = self.part_dir(seed, C)
                if unit in self.done() and self.part_ok(out): continue
                mdir = out + '.model'; t0 = time.time()
                try:
                    nco = json.load(open(os.path.join(kge.G0, C, 'sizes.json')))['co_changed_triples']
                    meta = dict(arm=self.arm, config_id=self.cid, cfg=self.cfg, seed=seed, checkpoint=C, freeze_sha256=self.fh,
                                plan_hash=self.plan['plan_hash'], split='tune (plumbing test)' if self.o['test'] else 'heldout', **stageB.runner_info())
                    if nco == 0:
                        per = {t['task_id']: dict(parent=t['parent'], checkpoint=C, lag=self.lag[t['task_id']], note='checkpoint has no co_changed fact',
                                                  **{sc: dict(seeds=1, seeds_unscored=1, cands=len(self.cands[sc][t['task_id']]),
                                                              cands_unscored=len(self.cands[sc][t['task_id']])) for sc in SCOPES}) for t in by_ck[C]}
                        stageB.write_parts(out, {sc: {} for sc in SCOPES}, per, dict(meta, trained=False))
                        self.log(unit, 'done', tasks=len(per), trained=False); continue
                    _, info, _ = kge.train(self.arm, self.cfg, seed, C, holdout=False, outdir=mdir, max_epochs=self.epochs, es=False)
                    tables, per = stageB.score_tasks(os.path.join(mdir, 'reps.pt'), by_ck[C], self.cands, None, self.lag, C)
                    stageB.check_no_fold(per, self.rec['s'], unit)  # ruling 65, held-out split
                    meta.update(epochs=info['epochs'], wall_s=info['wall_s'], peak_rss_mb=info['peak_rss_mb'], losses=info['losses'],
                                reps_bytes=os.path.getsize(os.path.join(mdir, 'reps.pt')), tasks=len(per), **kge.cuda_peak())
                    stageB.write_parts(out, tables, per, meta)
                    stageB.verify_parts(out, tables, per)
                    os.remove(os.path.join(mdir, 'reps.pt')); shutil.rmtree(mdir, ignore_errors=True)
                    self.log(unit, 'done', tasks=len(per), wall_s=round(time.time() - t0, 1), reps_deleted=not os.path.exists(mdir))
                except Exception as e:
                    if os.path.exists(out) and unit not in self.done(): shutil.rmtree(out, ignore_errors=True)
                    shutil.rmtree(mdir, ignore_errors=True)
                    self.log(unit, 'failed', error=repr(e)[:300]); failed += 1
                    print('FAILED', unit, repr(e), flush=True)
        return failed

    # ------------------------------------------------------------ tables, ranked lists, packs
    def assemble(self):
        tdir = os.path.join(self.out, 'tables'); os.makedirs(tdir, exist_ok=True)
        want = {t['task_id']: t['checkpoint'] for t in self.tasks}
        comp = {}
        for sc in SCOPES:
            T = ec.comparator_tables(sc, self.tasks)
            comp[sc] = T
            for n in ('RRF', 'PPR', 'CO', 'DIR'):
                p = os.path.join(tdir, '%s_%s.tsv.gz' % (n, sc)); ec.write_score_table(p, T[n])
        counts = {}
        for seed in SEEDS:
            per = {}; tabs = {sc: {} for sc in SCOPES}
            for C in self.ckpts:
                d = self.part_dir(seed, C)
                assert self.part_ok(d), ('part missing or from another freeze', d)
                for tid, r in json.load(open(os.path.join(d, 'counts.json'))).items():
                    assert tid in want and tid not in per and r['checkpoint'] == C == want[tid], ('task placement', tid, C)
                    per[tid] = r
                for sc in SCOPES:
                    for tid, row in ec.read_score_table(os.path.join(d, sc + '.tsv.gz')).items():
                        assert tid in want and want[tid] == C and tid not in tabs[sc], ('score row placement', tid, sc)
                        tabs[sc][tid] = row
            assert set(per) == set(want), ('tasks missing', len(set(want) - set(per)))
            stageB.check_no_fold(per, self.rec['s'], 'heldout merge s%d' % seed)  # ruling 65 on the merge
            counts['s%d' % seed] = per
            for sc in SCOPES:
                ec.write_score_table(os.path.join(tdir, 'alone_%s_s%d.tsv.gz' % (sc, seed)), tabs[sc])
                fz = {t['task_id']: ec.fused_with(t['task_id'], self.cands[sc][t['task_id']], comp[sc]['PPR'].get(t['task_id'], {}),
                                                  comp[sc]['CO'].get(t['task_id'], {}), tabs[sc].get(t['task_id'], {}), self.w) for t in self.tasks}
                ec.write_score_table(os.path.join(tdir, 'fused_%s_s%d.tsv.gz' % (sc, seed)), fz)
        put_json(os.path.join(tdir, 'counts.json'), counts)

    def variants(self):
        v = [('%s_%s_s%d' % (self.arm, k, s), 'tables/%s_%%s_s%d.tsv.gz' % (k, s)) for k in ('alone', 'fused') for s in SEEDS]
        return v + [(n, 'tables/%s_%%s.tsv.gz' % n) for n in ('RRF', 'PPR', 'CO', 'DIR')]

    def ranked(self):
        rdir = os.path.join(self.out, 'ranked'); os.makedirs(rdir, exist_ok=True)
        for name, pat in self.variants():
            for sc in SCOPES:
                T = ec.read_score_table(os.path.join(self.out, pat % sc))
                p = os.path.join(rdir, '%s_%s.jsonl.gz' % (name, sc))
                with gzip.open(p + '.part', 'wt', encoding='utf-8') as f:
                    for t in self.tasks:
                        f.write(json.dumps(dict(id=t['task_id'], variant=name, scope=sc,
                                                ranked=ec.rank(t['task_id'], self.cands[sc][t['task_id']], T.get(t['task_id'], {})))) + '\n')
                os.replace(p + '.part', p)

    def packs(self):
        import answer_level
        adir = os.path.join(self.out, 'answers'); os.makedirs(adir, exist_ok=True)
        tf = os.path.join(self.out, 'tasks_used.jsonl')
        ids = {t['task_id'] for t in self.tasks}
        with open(tf, 'w') as f:
            for l in open(self.o['tasks']):
                if l.strip() and json.loads(l)['id'] in ids: f.write(l if l.endswith('\n') else l + '\n')
        res = {}
        for name, _ in self.variants():
            res[name] = answer_level.pack(os.path.join(self.out, 'ranked', '%s_unrestricted.jsonl.gz' % name), tf,
                                          os.path.join(adir, '%s.jsonl.gz' % name))
        return res

    def handoff(self, packs):
        files = {}
        for sub in ('tables', 'ranked', 'answers'):
            for f in sorted(os.listdir(os.path.join(self.out, sub))):
                files['%s/%s' % (sub, f)] = stageB.sha256_file(os.path.join(self.out, sub, f))
        put_json(os.path.join(self.out, 'HANDOFF.json'), dict(
            written=now(), freeze=os.path.basename(self.o['freeze']), freeze_sha256=self.fh, chosen=self.rec['chosen'],
            tasks=len(self.tasks), checkpoints=len(self.ckpts), seeds=list(SEEDS), test=bool(self.o['test']),
            note='ranked lists (both scopes) and packs (unrestricted, frozen typed primary options, 8,000-token primary) only; '
                 'no metric was computed here; the truth is with the grader', packs=packs, files=files))

    def run(self):
        self.verify(); self.load_tasks()
        failed = self.units()
        if failed:
            print('heldout: %d unit(s) failed; rerun to redo them (finished units are kept)' % failed, flush=True); raise SystemExit(2)
        for step, fn in (('assemble', self.assemble), ('ranked', self.ranked)):
            if step in self.done() and os.path.isdir(os.path.join(self.out, 'tables' if step == 'assemble' else 'ranked')): continue
            fn(); self.log(step, 'done')
        packs = self.packs(); self.log('packs', 'done', packs={k: v.get('packed') for k, v in packs.items()})
        self.handoff(packs); self.log('handoff', 'done')
        print('heldout: finished; HANDOFF.json written; %d variants packed' % len(packs), flush=True)


if __name__ == '__main__':
    if OPT['cmd'] != 'run': raise SystemExit('usage: heldout.py run ...')
    Run(OPT).run()
