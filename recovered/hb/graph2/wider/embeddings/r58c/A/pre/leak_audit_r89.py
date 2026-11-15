"""leak_audit.py: the leak audit of addendum 8 item 18, by ruling 60 (with ruling 35's disclosure).

For every checkpoint used in either split and every task assigned to it (tune: plan.json `assignment` over
eval/tune_tasks.jsonl; held-out: plan.json `heldout.assignment` over the T1 held-out rows of build/tasks/tasks.jsonl,
which carry ids, parents and seeds only), checked from the RAW facts cache (build/facts/cache/<sha>/commits.jsonl,
the commits a checkpoint's facts were built from) and from git itself (the repository, read-only), not from the
lane's derived files:
  c1  the task commit is not in the checkpoint's history. Tune: the commit (tune_tasks.jsonl) is not among C's raw
      commits. Both splits: every raw commit of C is P or a git ancestor of P (`git rev-list P`); the task commit
      is a child of P, so it cannot be one of them. (Held-out task commits are not known to this script.)
      AR2-5: C's commits.jsonl must be non-empty, hold only 40-hex shas and contain C itself, else c1 fails.
  c2  ruling 49: C == P, or C is a git ancestor of P (`git merge-base --is-ancestor`) and C's raw commits are a
      subset of P's.
  c3  C is not later than P in ruling 50's order (author time, committer time, sha; from `git show`).
  c4  the task's checkpoint in plan.json is the one checked, and, when parts folders are given, every part's
      counts.json places each task on its planned checkpoint.
  c5  no truth file is mounted in a training or scoring container: the docker -v / --volume / --mount sources of the
      given launcher scripts (orchestrator/guard-stageB.sh, train/heldout.sh, ...) and of `docker inspect` mount lists
      (JSON files, if given; each entry must carry Source and Destination) are classified: anything under a `sealed`
      folder or named *reference*.jsonl is held-out truth (never allowed); eval/tune_tasks.jsonl,
      eval/tune_commits.jsonl, eval/git/pilot_rows.tsv and eval/git/june_namestatus.txt (and any tune_refs.jsonl)
      carry TUNE truth: allowed by item 18 and reported. A mounted folder is expanded to every file under it when it
      lies inside the lane (--lane-host maps it to /w here) or under a --host-map prefix; a source outside the lane is
      listed file by file (outside_lane) and fails when it cannot be read here or holds sealed/ or a reference file at
      any depth. Every file list is kept whole in the JSON; the markdown prints each list's count and names the JSON
      field that holds it (coordinator: never cut silently).
  c6  rulings 78 and 81: the held-out container (kge-H1) mounts ONLY the exact (host, destination) pairs of
      HELDOUT_ALLOW below, and the probe container (kge-H1P) only those of PROBE_ALLOW; any other mount fails, a mount
      of a folder that contains an allowed one fails (named so), a missing allowed mount fails, every mount but the
      output folder must be read-only, and a per-commit folder or file (named by a 40-hex sha) under any mount must be
      a tuning or a held-out parent of the plan. The staged facts and source store are read: exactly the plan's 70
      held-out parents (probe: the largest tune parent) and only the blobs their trees name; common/ only *.js and
      srcstore.
Ruling 81 disclosure: AUDIT-leak.md states that export/ (every exported graph, held-out ones included) is mounted,
that the protection against truth from a later parent is per task, and the count of exported held-out histories
(export/graphs/<P>/ancestors.txt) that name another held-out parent, beside the sibling-seed disclosure.
MF-10 (AR2-2): --heldout-tasks must hash to TASKS_SHA256 and hold 418 unique T1 held-out rows whose parents are
exactly plan.heldout.assignment's 70; the planned held-out parts rows are fixed at 3 x 418.
Coverage (review audit-result-3; a vacuous audit is a FAIL): at least one launcher script per container role in
--roles (default stageB,heldout; a script's role is read from its name), at least one MOUNT ROW per role (AR2-4), in
real mode an inspect capture for kge-B1, kge-H1 and kge-H1P, and the parts rows (c4) of each split equal the planned
count: tune = configs x 3 seeds x tune tasks (15 x 3 x 388 = 17,460 at stage B's plan), held-out = 3 x 418.
Ruling 72: every file of the mounted eval/ folder with class, size and sha256; the code lines showing that training
takes no task and scoring takes only (task id, seed, candidates), in train/stageB.py, train/kge.py, train/heldout.py
and eval/evalcore.py; every file-read site of train/kge.py, train/stageB.py and train/heldout.py (READ_SITE), and
train/kge.py fails the audit when any of its read sites names a task or truth file.
--test marks the result test: true (write_result.py refuses it) and allows --expect-rows split=N,...,
--override-assign, --tasks-sha256 and --stage-rel / --probe-stage-rel (the staged folders, relative to the lane);
its default outputs go to the system temp folder, never to train/leak_audit/. Unknown options are refused (exit 2).
Real mode (ruling 84): EMB_ROOT must resolve to the lane folder (this script reads no other environment variable).
Output: a markdown table for AUDIT.md (per split and checkpoint) with rulings 35 and 81's disclosures, and a JSON file
(default train/leak_audit/leak_audit.json, the path write_result.py reads).
usage: python leak_audit.py --repo <repo> --facts <facts cache> --heldout-tasks <build tasks.jsonl>
         [--plan PATH] [--scripts a.sh,b.sh] [--mounts inspect.json,...] [--parts dir,...] [--lane-host C:/...]
         [--build-host C:/.../build] [--host-map HOST=LOCAL,...] [--roles stageB,heldout] [--out-md PATH] [--out-json PATH]
         [--test [--expect-rows tune=N,heldout=M] [--override-assign split:P=C,...] [--tasks-sha256 HEX]
                 [--stage-rel REL] [--probe-stage-rel REL]]   (tests only)
"""
import os, sys, json, re, subprocess, collections, datetime, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('EMB_ROOT') or os.path.dirname(HERE)

DISCLOSURE_35 = ('Ruling 35 (disclosure): while building the evaluation core, one builder\'s look at a temp file showed the names '
                 'of files in two held-out commits (dated 2026-08-03). No truth was computed or used from it; tuning truth came '
                 'from git for the June commits only.')
DISCLOSURE_SIBLING = ('Sibling seeds (disclosure): the held-out rows a run reads are truth-free one by one, but the task rows of one '
                      'parent together list most of that commit\'s changed files (item 4). Ranking a task reads only its own row: no '
                      'code path uses a sibling seed (by_ck groups tasks per checkpoint only to batch them; scoring takes one task\'s '
                      'id, seed and candidates).')
DISCLOSURE_81 = ('Ruling 81 (disclosure): one container serves all 70 held-out parents, and it mounts export/ whole, so the graph '
                 'and the facts of a later held-out parent, which hold the changes of earlier held-out task commits, are readable '
                 'in it: %d of the %d exported held-out histories (export/graphs/<P>/ancestors.txt) name another held-out parent. '
                 'The protection against truth from a later parent is per task, not per mount: a task is served only by the model '
                 'trained on its own parent\'s graph (s = 1); candidates, comparators and packs are keyed by the task\'s own '
                 'parent; and the audit shows for every task that the checkpoint used is its parent (ruling 60), that nothing was '
                 'folded in (ruling 65) and, through the grader, that the task commit is not in that checkpoint\'s history '
                 '(ruling 73). One container per parent is not built.')
TASKS_SHA256 = '89a45cb38dbbbc618d8a745a263afc38db71f9382369e5bb60b5809dba32173b'  # build/tasks/tasks.jsonl (heldout.py pins the same)
TASKS_ROWS, TASKS_PARENTS = 418, 70
TUNE_TRUTH = ('eval/tune_tasks.jsonl', 'eval/tune_commits.jsonl', 'eval/git/pilot_rows.tsv', 'eval/git/june_namestatus.txt',
              'eval/git/pilot_commits.json')
# ruling 72: every file of the mounted eval/ folder is listed with its class; why each tune-truth file is truth
EVAL_WHY = {'eval/tune_tasks.jsonl': 'per task: truth = the commit\'s other changed files',
            'eval/tune_commits.jsonl': 'per commit: seeds (changed files) and task ids',
            'eval/git/pilot_rows.tsv': 'pilot rows with the truth label y',
            'eval/git/june_namestatus.txt': 'git name-status of the June (tune) commits',
            'eval/git/pilot_commits.json': 'pilot commits with their changed files',
            'eval/comparators/metrics.json': 'comparator metrics computed against tune truth (aggregates, no file list)',
            'eval/gate.json': 'evaluation-core gate counts (aggregates, no file list)'}
DERIVED = ('eval/comparators/metrics.json', 'eval/gate.json')
# ruling 72: the code lines showing that training and scoring take only task id, seed and candidates
CODE_EVIDENCE = (('train/stageB.py', r'def load_tasks|tune_tasks\.jsonl|def score_tasks|kge\.score\(|kge\.train\(arm, c\['),
                 ('train/kge.py', r'^def train\(|^def score\(|rows: \[\(task_id, seed_path'),
                 ('train/heldout.py', r'^TRUTHY = |if any\(k in r for k in TRUTHY\)|task_id=r\[.id.\], parent=P, seed=r\[.seed.\]\[.path.\]|'
                                      r'kge\.train\(self\.arm, self\.cfg, seed, C|stageB\.score_tasks\(os\.path\.join\(mdir'),
                 ('eval/evalcore.py', r'^def candidates\(|g\.pool\(task\[.seed.\]\)'))
CODE_NEED = (('train/stageB.py', 'def load_tasks'), ('train/stageB.py', 'def score_tasks'), ('train/kge.py', 'def train'),
             ('train/kge.py', 'def score'), ('train/heldout.py', 'TRUTHY = '), ('train/heldout.py', 'if any(k in r for k in TRUTHY)'))
TRUTH_READ = re.compile(r'''\[['"]truth['"]\]|get\(['"]truth['"]''')
# every construct that reads a file (the read sites of ruling 72 / AR2-9: not only lines with a keyword and `open(`)
READ_SITE = re.compile(r'\bopen\(|json\.load\(|np\.load\(|torch\.load\(|gzip\.open\(|read_text\(|read_bytes\(|Path\(|pd\.read_|'
                       r'read_score_table\(|read_graph\(|load_tasks\(|load_cands\(|os\.listdir\(|glob\.glob\(|loadtxt\(|genfromtxt\(')
TASK_WORDS = ('tune_tasks', 'tasks.jsonl', 'truth', 'sealed', 'reference', 'tune_commits', 'pilot_rows', 'namestatus')
READ_FILES = ('train/kge.py', 'train/stageB.py', 'train/heldout.py')
# rulings 78 and 81: the exact (host, destination) pairs of the held-out container and of its probe container.
# {W} = the lane on the host (--lane-host), {GB} = the build folder on the host (--build-host, default {W}/../../build),
# {S} / {PS} = the staged inputs (heldout_inputs / probe_inputs below the lane; --stage-rel / --probe-stage-rel in tests).
PRIMARY_REL = 'results/frozen/relational/95e990307da3b42b.json'
HELDOUT_ALLOW = (('{W}/train', '/w/train', 'ro'),                       # the lane's code (and the freeze record under it)
                 ('{W}/train/heldout', '/w/train/heldout', 'rw'),        # the freeze record and the run's only output
                 ('{W}/progress.jsonl', '/w/progress.jsonl', 'ro'),      # the coordinator's item27_freeze anchor (ruling 80)
                 ('{W}/eval/evalcore.py', '/w/eval/evalcore.py', 'ro'),  # the lane's code
                 ('{W}/export', '/w/export', 'ro'),                      # export/ (ruling 81: disclosed)
                 ('{S}/facts', '/build/facts/cache', 'ro'),              # the staged facts of the 70 held-out parents
                 ('{S}/common', '/build/arms/common', 'ro'),             # the shared harness code and the staged source store
                 ('{GB}/' + PRIMARY_REL, '/build/' + PRIMARY_REL, 'ro'),  # the frozen primary's options record
                 ('{GB}/tasks/tasks.jsonl', '/build/tasks/tasks.jsonl', 'ro'))  # the task list (ids, parents, seeds)
PROBE_ALLOW = (('{W}/train', '/w/train', 'ro'), ('{W}/train/probe', '/w/train/probe', 'rw'),
               ('{W}/eval/evalcore.py', '/w/eval/evalcore.py', 'ro'), ('{W}/export', '/w/export', 'ro'),
               ('{PS}/facts', '/build/facts/cache', 'ro'), ('{PS}/common', '/build/arms/common', 'ro'),
               ('{GB}/' + PRIMARY_REL, '/build/' + PRIMARY_REL, 'ro'))
STAGE_REL, PROBE_STAGE_REL = 'heldout_inputs', 'probe_inputs'
# ruling 89: the stage-B container's mount record (docker inspect, 2026-11-14 19:09Z) and the per-use rule
B1_INSPECT = ('orchestrator/kge-B1-inspect-20261114T190928Z.json', '052cbfa0ec863e3bb9e2069e99eb97b58a358cb53ded44f803d73dde8d4235e6')
# Every line of the frozen code that names a graph folder or loads a graph (GRAPH_RE) or passes a graph key on
# (CALL_RE) must match one rule here (file, pattern, class, key). Classes: 'definition'; 'plan-checkpoint' (a checkpoint
# of the plan); 'task-parent' (the task's own parent); 'tune-constant' (a constant sha checked to be a tuning
# checkpoint); 'caller-key' (the key its caller passes; its callers are listed); 'synthetic' (the probe's own folder);
# 'other-key' (a graph folder opened by a key that is neither: ruling 89 fails on it).
GRAPH_RE = re.compile(r"read_graph\(|\bG0\b|\bGRAPHS\b|'graphs0?'|\bGraph\(|PilotGraph\(")
CALL_RE = re.compile(r"kge\.train\(|kge\.score\(|ck\.assignment_m\(|ck\.checkpoints_m\(|proj\.project_selected\(|ck\.Facts\(|stageB\.score_tasks\(")
STAGEB_CODE = ('train/stageB.py', 'train/kge.py', 'train/proj.py', 'export/checkpoints.py', 'eval/evalcore.py')
LATER_CODE = ('train/heldout.py',)
GRAPH_RULES = (
    ('train/stageB.py', r"^LARGEST_TUNE = '[0-9a-f]{40}'", 'tune-constant', 'LARGEST_TUNE'),
    ('train/stageB.py', r"for tag, sha in \(\('A', kge\.STAGEA_SHA\), \('L', LARGEST_TUNE\)\)", 'tune-constant', 'kge.STAGEA_SHA, LARGEST_TUNE (plan-time timing)'),
    ('train/stageB.py', r"kge\.train\(arm, row\['cfg'\], 1, sha,", 'tune-constant', 'sha of the timing loop (kge.STAGEA_SHA, LARGEST_TUNE)'),
    ('train/stageB.py', r"s, table = proj\.project_selected\(sel", 'caller-key', "proj.ntri over ck.checkpoints_m('tune', s) (tuning parents only)"),
    ('train/stageB.py', r"F = ck\.Facts\(\)", 'definition', 'export/checkpoints.py Facts (keys given per call)'),
    ('train/stageB.py', r"ck\.assignment_m\('tune', s, F\)", 'caller-key', "the tuning split's parents (ancestors.txt, sizes.json)"),
    ('train/stageB.py', r"ck\.assignment_m\('heldout', s, F\)", 'other-key', "every HELD-OUT parent: export/graphs/<P>/ancestors.txt and export/graphs0/<P>/sizes.json "
                                                                            "(lineage metadata, no triples), when make_plan writes the plan's held-out assignment"),
    ('train/stageB.py', r"os\.path\.join\(kge\.G0, C, 'sizes\.json'\)", 'plan-checkpoint', "C in plan['checkpoints'] (run_units)"),
    ('train/stageB.py', r"kge\.train\(arm, c\['cfg'\], seed, C,", 'plan-checkpoint', "C in plan['checkpoints'] (run_units)"),
    ('train/stageB.py', r"kge\.score\(reps_path, \[\(tid, t\['seed'\], cands\[sc\]\.get\(tid, \[\]\)\)\], t\['parent'\]\)", 'task-parent', "t['parent'] of a tuning task"),
    ('train/stageB.py', r"P = ck\.load_parents\(\); C = kge\.STAGEA_SHA", 'tune-constant', 'kge.STAGEA_SHA (plumbing test)'),
    ('train/kge.py', r"^G0 = os\.path\.join\(ROOT, 'export', 'graphs0'\)", 'definition', 'export/graphs0'),
    ('train/kge.py', r"^def read_graph\(sha\):", 'definition', 'read_graph(sha)'),
    ('train/kge.py', r"d = os\.path\.join\(G0, sha\)", 'caller-key', 'read_graph(sha): Graph(sha) and score(parent_sha)'),
    ('train/kge.py', r"self\.ents, self\.tri = read_graph\(sha\)", 'caller-key', 'Graph(sha) from train(checkpoint_sha)'),
    ('train/kge.py', r"G = Graph\(checkpoint_sha", 'caller-key', 'train(arm, config, seed, checkpoint_sha): stageB passes C in plan checkpoints'),
    ('train/kge.py', r"entsP, triP = read_graph\(parent_sha\)", 'caller-key', "score(reps, rows, parent_sha): stageB passes t['parent']"),
    ('train/kge.py', r"^STAGEA_SHA = '[0-9a-f]{40}'", 'tune-constant', 'STAGEA_SHA'),
    ('train/kge.py', r"train\(arm, cfg, seed, STAGEA_SHA, holdout=True", 'tune-constant', 'STAGEA_SHA (stage A)'),
    ('train/proj.py', r"os\.path\.join\(ROOT, 'export', 'graphs0', sha, 'sizes\.json'\)", 'caller-key', "ntri(c) for c in ck.checkpoints_m('tune', s)"),
    ('train/proj.py', r"F = ck\.Facts\(\)", 'definition', 'export/checkpoints.py Facts'),
    ('train/proj.py', r"ck\.checkpoints_m\('tune', s, F\)", 'caller-key', 'the tuning split only'),
    ('export/checkpoints.py', r"open\(os\.path\.join\(self\.root, 'graphs', s, 'ancestors\.txt'\)\)", 'caller-key', 'Facts.hist(s): the parents its caller names'),
    ('export/checkpoints.py', r"open\(os\.path\.join\(self\.root, 'graphs0', s, 'sizes\.json'\)\)", 'caller-key', 'Facts.co(s): the parents its caller names'),
    ('eval/evalcore.py', r"^GRAPHS = os\.path\.join\(ROOT, 'export', 'graphs'\)", 'definition', 'export/graphs'),
    ('eval/evalcore.py', r"d = os\.path\.join\(GRAPHS, sha\)", 'caller-key', 'PilotGraph(sha): candidates(task) uses the task\'s parent; stage B calls no graph function of evalcore'),
    ('eval/evalcore.py', r"g = PilotGraph\(sha\); _GCACHE\[sha\] = g", 'caller-key', 'graph(sha), from candidates(task): the task\'s parent'),
    ('train/heldout.py', r"os\.path\.join\(kge\.G0, C, 'sizes\.json'\)", 'plan-checkpoint', 'C of plan.heldout.checkpoints (units)'),
    ('train/heldout.py', r"_, info, _ = kge\.train\(self\.arm, self\.cfg, seed, C,", 'plan-checkpoint', 'C of plan.heldout.checkpoints (units)'),
    ('train/heldout.py', r"stageB\.score_tasks\(os\.path\.join\(mdir", 'task-parent', "the tasks of C, each scored at its own parent"),
    ('train/heldout.py', r"F = ck\.Facts\(os\.path\.join\(ROOT, 'export'\)\)", 'caller-key', 'F.valid(C, P) and F.key for the plan\'s (P, C) pairs'),
    ('train/heldout.py', r"^def largest\(G0, shas\):", 'definition', 'largest(G0, shas): sizes.json of the shas given'),
    ('train/heldout.py', r"s = json\.load\(open\(os\.path\.join\(G0, C, 'sizes\.json'\)\)\)", 'caller-key', 'largest(): sizes.json only'),
    ('train/heldout.py', r"G0 = os\.path\.join\(ROOT, 'export', 'graphs0'\)", 'definition', 'export/graphs0 (probe)'),
    ('train/heldout.py', r"C, s = largest\(G0, plan\['heldout'\]\['checkpoints'\]\)", 'plan-checkpoint', 'plan.heldout.checkpoints: sizes.json only (ruling 79)'),
    ('train/heldout.py', r"T, ts = largest\(G0, plan\['checkpoints'\]\)", 'plan-checkpoint', "plan['checkpoints'] (tuning): sizes.json"),
    ('train/heldout.py', r"synth_graph\(os\.path\.join\(g0, sha(_f)?\), s, os\.path\.join\(G0, T, 'entities\.tsv'\)", 'plan-checkpoint', 'T, the largest tuning checkpoint (entities.tsv)'),
    ('train/heldout.py', r"kge\.G0 = o\['g0'\]", 'synthetic', "the probe's synthetic graph folder"),
    ('train/heldout.py', r"ents, _ = kge\.read_graph\(o\['sha'\]\)", 'synthetic', "the probe's synthetic graph"),
    ('train/heldout.py', r"kge\.train\(o\['arm'\], cfg\['cfg'\], 1, o\['sha'\], holdout=False", 'synthetic', "probe_one/probe_full: o['sha'] under kge.G0 = o['g0'], the probe's synthetic graph"),
    ('train/heldout.py', r"kge\.score\(os\.path\.join\(mdir, 'reps\.pt'\), \[\(t\['task_id'\], t\['seed'\], cands\[sc\]\[t\['task_id'\]\]\)\], o\['sha'\]\)", 'synthetic', "probe_full: scored at o['sha'], the probe's synthetic graph"),
)
SHA40 = re.compile(r'^([0-9a-f]{40})(\.absent)?(\.json)?$')
KEYS = ('repo', 'facts', 'heldout_tasks', 'plan', 'scripts', 'mounts', 'parts', 'lane_host', 'build_host', 'host_map', 'roles',
        'out_md', 'out_json')
TEST_KEYS = ('expect_rows', 'override_assign', 'tasks_sha256', 'stage_rel', 'probe_stage_rel', 'expect_parts', 'b1_inspect_sha256')


class Git:
    def __init__(self, repo):
        self.repo = repo; self._rl = {}; self._key = {}; self._anc = {}

    def run(self, *a):
        p = subprocess.run(['git', '-c', 'safe.directory=*', '-C', self.repo] + list(a), capture_output=True, text=True)
        return p.returncode, p.stdout

    def revlist(self, s):
        if s not in self._rl:
            rc, out = self.run('rev-list', s)
            if rc != 0: raise RuntimeError('git rev-list %s failed' % s)
            self._rl[s] = set(out.split())
        return self._rl[s]

    def key(self, s):
        if s not in self._key:
            rc, out = self.run('show', '-s', '--format=%at %ct', s)
            a, c = out.split()[:2]; self._key[s] = (int(a), int(c), s)
        return self._key[s]

    def is_ancestor(self, c, p):
        if (c, p) not in self._anc:
            self._anc[(c, p)] = self.run('merge-base', '--is-ancestor', c, p)[0] == 0
        return self._anc[(c, p)]


def raw_hist(facts, s, cache={}):
    if s not in cache:
        cache[s] = frozenset(json.loads(l).get('sha') for l in open(os.path.join(facts, s, 'commits.jsonl')) if l.strip())
    return cache[s]


def hist_ok(h, C, anc=None):
    """AR2-5: a raw history that is non-empty and holds only 40-hex shas, each C itself or an ancestor of C (anc = the
    rev-list of C). The review asked for C in the history; the facts cache lists the PR commits before a checkpoint and
    not the merge checkpoint itself (19 of the plan's 123 checkpoints hold themselves), so ancestry stands in for it."""
    return (bool(h) and all(isinstance(x, str) and re.match(r'^[0-9a-f]{40}$', x) for x in h)
            and (C in h if anc is None else (h <= anc or C in h)))


def check_pair(git, facts, C, P, commit=None):
    hc, hp = raw_hist(facts, C), raw_hist(facts, P)
    rl = git.revlist(P)
    hok = hist_ok(hc, C, git.revlist(C))
    c1 = hok and (commit is None or commit not in hc) and hc <= rl
    c2 = C == P or (git.is_ancestor(C, P) and hc <= hp)
    c3 = git.key(C) <= git.key(P)
    return dict(c1=c1, c2=c2, c3=c3, c1_commit_checked=commit is not None, c1_history_ok=hok, c1_history_commits=len(hc), c1_history_has_C=C in hc,
                c1_commits_outside_P=len(hc - rl), c2_ancestor=(C == P or git.is_ancestor(C, P)), c2_subset=hc <= hp)


MOUNT_RE = re.compile(r'(?:^|\s)(?:-v|--volume)(?:\s+|=)(\S+)|--mount[\s=]+\S*?(?:source|src)=([^,\s"\']+)')
BLOCK_RE = re.compile(r'^\s*([A-Za-z_][A-Za-z0-9_]*)=')


def mounts_of_script(path):
    """[(line number, host source as written, container destination with its mode suffix or '', block)] of every
    docker -v / --volume / --mount in a script; block = the shell variable whose (continued) assignment holds the line."""
    out = []; block = ''; cont = False
    for i, l in enumerate(open(path, encoding='utf-8', errors='replace'), 1):
        m = BLOCK_RE.match(l)
        if m and not cont: block = m.group(1)
        elif not cont and not l.startswith((' ', '\t')): block = ''
        cont = l.rstrip('\r\n').endswith('\\')
        if l.lstrip().startswith('#'): continue
        if 'docker' not in l and '-v ' not in l and '--volume' not in l and '--mount' not in l: continue
        for mm in MOUNT_RE.finditer(l):
            if mm.group(1):
                spec = mm.group(1).replace('"', '').replace("'", ''); drive = ''
                if re.match(r'^[A-Za-z]:/', spec): drive, spec = spec[:2], spec[2:]  # C:/... host paths
                parts = re.split(r':(?=/)', spec, maxsplit=1)
                src = drive + parts[0]; dst = parts[1] if len(parts) > 1 else ''
                if dst: out.append((i, src, dst, block))  # a bind mount names a container path (`grep -v` does not)
            elif mm.group(2):
                out.append((i, mm.group(2), '', block))
    return out


def expand_vars(src, script_text):
    """Resolve $W / ${W} style variables assigned plainly in the script (W=... lines)."""
    env = dict(re.findall(r'^\s*([A-Z_][A-Z0-9_]*)=([^\s;]+)', script_text, re.M))
    dflt = re.compile(r'^\$\{[A-Z_0-9]+:-(.*)\}$')  # WD=${GUARD_WD:-C:/...} -> its default
    env = {k: (dflt.match(v).group(1) if dflt.match(v) else v) for k, v in env.items()}
    for _ in range(4):
        src = re.sub(r'\$\{?([A-Z_][A-Z0-9_]*)\}?', lambda m: env.get(m.group(1), m.group(0)), src)
    return src.strip('"\'')


def norm(p):
    """Comparable form of a host path: C:/ form, '/' separators, normalised, no trailing slash, case-folded."""
    p = host_norm(p.replace('\\', '/'))
    p = os.path.normpath(p).replace('\\', '/').rstrip('/')
    return p.lower()


def local_of(host_src, lane_host, host_map):
    """The local path of a host source: inside the lane (lane_host -> ROOT) or under a --host-map prefix; else None."""
    s = norm(host_src)
    pairs = ([(lane_host, ROOT)] if lane_host else []) + list(host_map)
    for hp, lp in sorted(pairs, key=lambda x: -len(x[0])):
        h = norm(hp)
        if s == h or s.startswith(h + '/'):
            return os.path.join(lp, *[x for x in host_norm(host_src.replace('\\', '/'))[len(host_norm(hp.replace('\\', '/')).rstrip('/')):].split('/') if x])
    return None


def walk_files(local, rel_to, skip_scores=True):
    files = []
    if os.path.isdir(local):
        for dp, dn, fn in os.walk(local):
            if skip_scores: dn[:] = [d for d in dn if d not in ('parts', 'quarantine', '__pycache__')]  # score/model folders hold no task file
            for f in fn: files.append(os.path.relpath(os.path.join(dp, f), rel_to).replace('\\', '/'))
    elif os.path.exists(local):
        files.append(os.path.relpath(local, rel_to).replace('\\', '/'))
    return sorted(files)


def is_heldout_truth(f):
    return 'sealed' in f.replace('\\', '/').lower().split('/') or bool(re.search(r'reference[s]?[^/]*\.jsonl$', f, re.I))


def classify(host_src, lane_host, kind, host_map=()):
    """-> (class, files, outside_lane): 'heldout_truth' | 'tune_truth' | 'clean' | 'unreadable' for one mount source,
    expanded to every file under it (inside the lane, or outside it through --host-map)."""
    s = host_src.replace('\\', '/')
    if is_heldout_truth(s): return 'heldout_truth', [s], None
    lh = lane_host.replace('\\', '/').rstrip('/') if lane_host else None
    inside = bool(lh) and (norm(s) == norm(lh) or norm(s).startswith(norm(lh) + '/'))
    local = local_of(s, lane_host, host_map)
    if inside:
        files = walk_files(local, ROOT)
    elif local is not None and os.path.exists(local):
        files = walk_files(local, local if os.path.isdir(local) else os.path.dirname(local), skip_scores=False)
    else:
        return ('unreadable', [], dict(host=s, listed=False))
    outside = None if inside else dict(host=s, listed=True, files=len(files))
    bad_h = [f for f in files if is_heldout_truth(f)]
    if bad_h: return 'heldout_truth', bad_h, outside
    tt = [f for f in files if f in TUNE_TRUTH or os.path.basename(f) == 'tune_refs.jsonl'] if inside else []
    if tt: return 'tune_truth', tt, outside
    return 'clean', files, outside


def role_of(name):
    """The container role of a launcher script or an inspect file, read from its name."""
    b = os.path.basename(name)
    if 'kge-H1P' in b or 'probe' in b: return 'heldout'  # the ruling-79 probe container (launched by heldout.sh)
    if 'heldout' in b or 'kge-H' in b: return 'heldout'
    if 'stageA' in b or 'kge-A' in b: return 'stageA'
    if 'stageB' in b or 'guard' in b or 'kge-B' in b: return 'stageB'
    return 'other'


def host_norm(s):
    """C:/... form of a host path written as /c/..., /run/desktop/mnt/host/c/... or C:\\..."""
    s = s.replace('\\', '/')
    m = re.match(r'^(?:/run/desktop/mnt/host)?/([a-zA-Z])/(.*)$', s)
    return (m.group(1).upper() + ':/' + m.group(2)) if m and not re.match(r'^[A-Za-z]:/', s) else s


def audit_mounts(scripts, inspects, lane_host, host_map=()):
    rows = []; problems = []
    for sp in scripts:
        txt = open(sp, encoding='utf-8', errors='replace').read()
        heldout = role_of(sp) == 'heldout'
        for ln, src, dst, block in mounts_of_script(sp):
            hs = expand_vars(src, txt); dst = expand_vars(dst, txt)
            cls, files, outside = classify(hs, lane_host, 'script', host_map)
            mode = 'ro' if re.search(r':ro$', dst) else 'rw'
            line = txt.splitlines()[ln - 1]
            probe = heldout and (block == 'PRB' or 'kge-H1P' in line or 'train/probe' in line or 'probe_inputs' in line)
            reh = heldout and block == 'REH'  # ruling 86(b)'s test-mode rehearsal: tuning data, not under ruling 81's allow-list
            rows.append(dict(source='%s:%d' % (os.path.basename(sp), ln), host=hs, dest=re.sub(r':(ro|rw)$', '', dst), mode=mode,
                             container=('rehearsal' if reh else 'probe' if probe else 'held-out') if heldout else 'stage B / tuning', role=role_of(sp),
                             cls=cls, files=files, n_files=len(files), outside_lane=outside, ok=cls not in ('heldout_truth', 'unreadable'), probe=probe))
    for ip in inspects:
        j = json.load(open(ip)); name = os.path.basename(ip)
        heldout = role_of(name) == 'heldout'; probe = 'kge-H1P' in name or 'probe' in name
        ms = j if isinstance(j, list) else [j]
        if ms and all(isinstance(x, dict) and 'Mounts' in x for x in ms):  # a whole `docker inspect` record (ruling 89's kge-B1 capture)
            ms = [m for x in ms for m in (x.get('Mounts') or [])]
        if not ms: problems.append('%s holds no mount' % name)
        for k, m in enumerate(ms):
            if not isinstance(m, dict) or not m.get('Source') or not m.get('Destination'):  # MF-10 / AR2-4
                problems.append('%s entry %d has no Source or no Destination' % (name, k)); continue
            hs = host_norm(m['Source']); cls, files, outside = classify(hs, lane_host, 'inspect', host_map)
            rows.append(dict(source=name, host=hs, dest=m['Destination'], mode='rw' if m.get('RW') else 'ro',
                             container=('probe' if probe else 'held-out') if heldout else 'stage B / tuning', role=role_of(name),
                             cls=cls, files=files, n_files=len(files), outside_lane=outside, ok=cls not in ('heldout_truth', 'unreadable'), probe=probe))
    return rows, problems


def graph_sites(files):
    """Ruling 89: every graph-folder line (GRAPH_RE, CALL_RE) of the files, classified by GRAPH_RULES (comment and
    docstring-only lines without code are skipped); unclassified lines and rules that match nothing are problems."""
    sites, problems, used = [], [], set()
    for rel in files:
        p = os.path.join(ROOT, rel)
        if not os.path.exists(p): problems.append('%s: missing' % rel); continue
        for i, l in enumerate(open(p, encoding='utf-8'), 1):
            s = l.strip()
            if s.startswith('#') or not (GRAPH_RE.search(l) or CALL_RE.search(l)): continue
            hit = [k for k, (f, pat, cls, key) in enumerate(GRAPH_RULES) if f == rel and re.search(pat, l)]
            if not hit:
                if '(' not in l and '=' not in l: continue  # prose (a docstring line) names no key
                problems.append('%s:%d is a graph site no rule classifies: %s' % (rel, i, s[:120])); continue
            used.update(hit); f, pat, cls, key = GRAPH_RULES[hit[0]]
            sites.append(dict(file=rel, line=i, cls=cls, key=key, text=s[:150]))
    for k, (f, pat, cls, key) in enumerate(GRAPH_RULES):
        if f in files and k not in used: problems.append('rule %s %r matches no line (the code changed)' % (f, pat[:60]))
    return sites, problems


def ruling89(plan, parts, test, expect_parts=None):
    """Ruling 89: (1) every part's meta.json names its checkpoint: a stage-B (tune) part one of plan['checkpoints'],
    a held-out part one of plan['heldout']['checkpoints']; the stage-B parts count is planned (configs x 3 seeds x
    checkpoints = 2,385 at this plan); (2) the frozen stage-B code opens a graph folder only by a plan checkpoint or a
    task's own parent (GRAPH_RULES), and the constants it trains on are tuning checkpoints. Returns a dict with a
    stable key 'text' (AUDIT.md: a limit of the isolation, not a clean pass, beside ruling 81's disclosure)."""
    tune_c, held_c = set(plan['checkpoints']), set(plan['heldout']['checkpoints'])
    tune_p = set(plan['assignment']); bad = []; seen = collections.Counter(); names = collections.Counter()
    for spec in parts:
        split, d = (spec.split('=', 1) if '=' in spec and not re.match(r'^[A-Za-z]:[\\/]', spec) else (None, spec))
        for dp, dn, fn in os.walk(d):
            if 'counts.json' not in fn or dp.endswith(('.part', '.model')): continue
            C = os.path.basename(dp)
            sp = split
            if sp is None:
                ps = {r.get('parent') for r in json.load(open(os.path.join(dp, 'counts.json'))).values()}
                sp = 'tune' if ps and ps <= tune_p else 'heldout'
            seen[sp] += 1
            mp = os.path.join(dp, 'meta.json')
            if not os.path.exists(mp): bad.append('%s: no meta.json' % os.path.relpath(dp, d)); continue
            mc = json.load(open(mp)).get('checkpoint'); names[(sp, mc)] += 1
            want = tune_c if sp == 'tune' else held_c
            if mc != C or mc not in want:
                bad.append('%s: meta names checkpoint %s (folder %s), not one of the plan\'s %d %s checkpoints' % (
                    os.path.relpath(dp, d), mc, C[:12], len(want), 'tuning' if sp == 'tune' else 'held-out'))
    n_cfg = sum(len(v) for v in plan['configs'].values())
    want_n = expect_parts if (test and expect_parts is not None) else n_cfg * 3 * len(tune_c)
    if seen['tune'] != want_n: bad.append('stage-B parts %d, planned %d (configs %d x 3 seeds x %d checkpoints)' % (seen['tune'], want_n, n_cfg, len(tune_c)))
    sites, sp_bad = graph_sites(STAGEB_CODE + LATER_CODE)
    consts = {}
    for rel, name in (('train/kge.py', 'STAGEA_SHA'), ('train/stageB.py', 'LARGEST_TUNE')):
        m = re.search(r"^%s = '([0-9a-f]{40})'" % name, open(os.path.join(ROOT, rel), encoding='utf-8').read(), re.M)
        consts[name] = m.group(1) if m else None
        if not m or m.group(1) not in tune_c: sp_bad.append('%s.%s = %s is not a tuning checkpoint of the plan' % (rel, name, consts[name]))
    calls = sorted(set(re.findall(r'\bec\.(\w+)\(', open(os.path.join(ROOT, 'train', 'stageB.py'), encoding='utf-8').read())))
    if not set(calls) <= {'write_score_table', 'read_score_table'}: sp_bad.append('stageB.py calls evalcore %s (a graph function?)' % calls)
    other = [s for s in sites if s['cls'] == 'other-key' and s['file'] in STAGEB_CODE]
    stageb_sites = [s for s in sites if s['file'] in STAGEB_CODE]; later = [s for s in sites if s['file'] in LATER_CODE]
    cite = lambda ss: ', '.join('%s:%d' % (s['file'], s['line']) for s in ss)
    ok = not bad and not sp_bad and not other
    text = ('Ruling 89 (a limit of the isolation, not a clean pass): the stage-B container kge-B1 (its docker inspect record %s, '
            'sha256 %s) mounted eval/ and export/ read-only and train/; export/ also holds the exported graphs of the %d held-out '
            'parents, which contain the changes of held-out task commits, so held-out material was mounted in a training container '
            'from the first stage-B unit on. That cannot be undone; the rule that holds is per use. Parts: %d stage-B parts (planned %d), '
            'each meta.json naming its checkpoint: %s; %d held-out parts checked against the plan\'s %d held-out checkpoints. Code: '
            'the frozen stage-B code loads a graph only by a checkpoint of the plan or a task\'s own parent (graph loads at %s; '
            'every site in leak_audit.json ruling89.sites), and the constants it trains on (STAGEA_SHA %s, LARGEST_TUNE %s) are '
            'tuning checkpoints%s. The same rule covers the later scoring container that mounts export/ (train/heldout.py: %d '
            'graph sites, each keyed by a checkpoint of the plan, a task\'s own parent or the probe\'s synthetic graph).') % (
        B1_INSPECT[0], B1_INSPECT[1], len(plan['heldout']['assignment']), seen['tune'], want_n,
        'all among the plan\'s %d tuning checkpoints' % len(tune_c) if not [b for b in bad if 'tuning' in b] else 'NOT all among them (%d)' % len(bad),
        seen['heldout'], len(held_c), cite([s for s in stageb_sites if s['cls'] in ('plan-checkpoint', 'task-parent', 'tune-constant') or 'read_graph' in s['text'] or 'Graph(' in s['text']][:12]),
        (consts['STAGEA_SHA'] or '?')[:12], (consts['LARGEST_TUNE'] or '?')[:12],
        '' if not other else '; EXCEPT that %s opens graph folders by another key: %s; the audit fails on it until the coordinator rules'
                              % (cite(other), '; '.join(s['key'] for s in other)), len(later))
    return dict(ok=ok, parts=dict(stageB=seen['tune'], planned=want_n, heldout=seen['heldout'], problems=bad),
                sites=sites, site_problems=sp_bad, other_key_sites=other, constants=consts, stageB_evalcore_calls=calls, text=text)


def allow_pairs(allow, lane_host, build_host, stage_rel, probe_stage_rel):
    W = lane_host.replace('\\', '/').rstrip('/'); GB = (build_host or os.path.normpath(os.path.join(W, '..', '..', 'build'))).replace('\\', '/').rstrip('/')
    sub = dict(W=W, GB=GB, S=W + '/' + stage_rel, PS=W + '/' + probe_stage_rel)
    return [(norm(h.format(**sub)), d, mode, h.format(**sub)) for h, d, mode in allow]


def sha_folders(local):
    """Every directory or file below `local` whose name is a 40-hex sha (a per-commit folder or tree file)."""
    out = set()
    if not local or not os.path.isdir(local): return out
    for dp, dn, fn in os.walk(local):
        for x in dn + fn:
            m = SHA40.match(x)
            if m: out.add(m.group(1))
    return out


def ruling81(rows, plan, lane_host, build_host, stage_rel, probe_stage_rel, host_map=()):
    """c6 (rulings 78, 81): exact allow-lists, read-only modes, per-commit names, and the staged folders' contents."""
    parents = set(plan['heldout']['assignment']); tune_p = set(plan['assignment'])
    out = dict(parents=len(parents), problems=[], staged={}, containers={})
    for cont, allow, srel in (('held-out', HELDOUT_ALLOW, stage_rel), ('probe', PROBE_ALLOW, probe_stage_rel)):
        pairs = allow_pairs(allow, lane_host, build_host, stage_rel, probe_stage_rel)
        ok_pairs = {(h, d) for h, d, _, _ in pairs}
        ms = [m for m in rows if m['container'] == cont]
        out['containers'][cont] = dict(mount_rows=len(ms), allowed=len(pairs))
        if not ms: out['problems'].append('no %s launcher line or inspect capture given' % cont); continue
        by_src = collections.defaultdict(list)
        for m in ms: by_src[m['source'].split(':')[0]].append(m)
        for src, group in sorted(by_src.items()):
            seen = set()
            for m in group:
                key = (norm(m['host']), m['dest'].rstrip('/'))
                if key in ok_pairs:
                    seen.add(key)
                    want = [mode for h, d, mode, _ in pairs if (h, d) == key][0]
                    if m['mode'] != want: out['problems'].append('%s: %s -> %s is %s, the allow-list says %s' % (m['source'], m['host'], m['dest'], m['mode'], want))
                    continue
                holds = [raw for h, d, _, raw in pairs if h.startswith(key[0] + '/')]
                if holds: out['problems'].append('%s: %s -> %s contains the allowed %s (ruling 81)' % (m['source'], m['host'], m['dest'], holds[0]))
                else: out['problems'].append('%s: %s -> %s is not in the %s allow-list (ruling 81)' % (m['source'], m['host'], m['dest'], cont))
            miss = [raw + ' -> ' + d for h, d, _, raw in pairs if (h, d) not in seen]
            if miss: out['problems'].append('%s: allowed %s mount(s) missing: %s' % (src, cont, miss))
        # per-commit names under every mount: a tuning or a held-out parent of the plan only
        for m in ms:
            local = local_of(m['host'], lane_host, host_map)
            if local and os.path.isdir(local) and not m['dest'].startswith('/w/train'):
                odd = sorted(sha_folders(local) - parents - tune_p)
                if odd: out['problems'].append('%s: %d per-commit name(s) under %s are neither a tuning nor a held-out parent: %s'
                                               % (m['source'], len(odd), m['host'], odd))
        # the staged facts and source store
        want_p = parents if cont == 'held-out' else None
        for dest in ('/build/facts/cache', '/build/arms/common'):
            for m in [m for m in ms if m['dest'].rstrip('/') == dest]:
                local = local_of(m['host'], lane_host, host_map)
                if not local or not os.path.isdir(local):
                    out['problems'].append('%s: staged source %s is not readable here' % (m['source'], m['host'])); continue
                st = out['staged'].setdefault(cont, {})
                if dest == '/build/facts/cache':
                    got = set(os.listdir(local)); st['facts'] = len(got)
                    if want_p is None: want_p = got if (got and got <= tune_p and len(got) == 1) else {'<the largest tune parent>'}
                    if got != want_p: out['problems'].append('%s: staged facts %d folders, %d not a %s parent, %d parent(s) missing: extra %s'
                                                             % (m['source'], len(got), len(got - want_p), cont, len(want_p - got), sorted(got - want_p)))
                else:
                    tdir = os.path.join(local, 'srcstore', 'trees'); bdir = os.path.join(local, 'srcstore', 'blobs')
                    if not os.path.isdir(tdir) or not os.path.isdir(bdir):
                        out['problems'].append('%s: staged common/ has no srcstore/trees and blobs' % m['source']); continue
                    wp = want_p if want_p is not None else set()
                    tp, extra = set(), []
                    for t in os.listdir(tdir):
                        mt = re.match(r'^([0-9a-f]{40})(\.absent)?\.json$', t)
                        if not mt or mt.group(1) not in wp: extra.append(t)
                        elif not mt.group(2): tp.add(mt.group(1))
                    named = set()
                    for P in tp: named |= {h2 + '.txt' for h2 in json.load(open(os.path.join(tdir, P + '.json'))).values()}
                    blobs = set(os.listdir(bdir))
                    odd = sorted(f for f in os.listdir(local) if f != 'srcstore' and not f.endswith('.js'))
                    st.update(trees=len(tp), blobs=len(blobs), common_other=odd)
                    if extra or tp != wp or blobs != named or odd:
                        out['problems'].append('%s: staged common/ trees %d (%d not a %s parent: %s), %d parent(s) without a tree, blobs %d '
                                               '(%d unnamed, %d missing), other files %s' % (m['source'], len(tp), len(extra), cont, sorted(extra),
                                                                                          len(wp - tp), len(blobs), len(blobs - named), len(named - blobs), odd))
    out['ok'] = not out['problems']
    return out


def planned_rows(plan, tune_tasks, n_held):
    """Coverage: the c4 parts rows a finished run must show per split."""
    n_cfg = sum(len(v) for v in plan['configs'].values())
    tune_n = sum(1 for t in tune_tasks if t['parent'] in plan['assignment'])
    return dict(tune=n_cfg * 3 * tune_n, heldout=3 * n_held)


def pin_heldout_tasks(path, plan, sha_want):
    """MF-10 (AR2-2): (rows, problems): the task list's sha256, 418 unique T1 held-out rows, parents = plan.heldout's 70."""
    bad = []
    got = sha256_file(path)
    if got != sha_want: bad.append('held-out task list %s hashes to %s, pinned %s' % (path, got[:16], sha_want[:16]))
    held = []
    for l in open(path):
        if not l.strip(): continue
        r = json.loads(l)
        if r.get('set') == 'T1' and r.get('split') == 'heldout': held.append(dict(task_id=r['id'], parent=r['parent'], commit=None))
    ids = [t['task_id'] for t in held]; ps = {t['parent'] for t in held}
    if len(held) != TASKS_ROWS or len(set(ids)) != len(ids) or len(ps) != TASKS_PARENTS or ps != set(plan['heldout']['assignment']):
        bad.append('held-out task rows %d (want %d), unique %d, parents %d (want %d, equal to plan.heldout: %s)'
                   % (len(held), TASKS_ROWS, len(set(ids)), len(ps), TASKS_PARENTS, ps == set(plan['heldout']['assignment'])))
    return held, bad


def disclosure81(plan):
    """Ruling 81: how many exported held-out histories name another held-out parent (export/graphs/<P>/ancestors.txt)."""
    hp = set(plan['heldout']['assignment']); n = 0; missing = []
    for P in sorted(hp):
        f = os.path.join(ROOT, 'export', 'graphs', P, 'ancestors.txt')
        if not os.path.exists(f): missing.append(P); continue
        anc = {l.strip() for l in open(f) if l.strip()}
        n += int(bool((anc - {P}) & hp))
    return dict(heldout_parents=len(hp), histories_naming_another_heldout_parent=n, ancestors_missing=missing,
                text=DISCLOSURE_81 % (n, len(hp)), sibling_seeds=DISCLOSURE_SIBLING)


def eval_listing():
    """Ruling 72: every file under the mounted eval/ folder, file by file: class, size, sha256, and why it is truth."""
    out = []
    base = os.path.join(ROOT, 'eval')
    for dp, dn, fn in os.walk(base):
        dn[:] = sorted(d for d in dn if d != '__pycache__')
        dn[:] = [d for d in dn if d != 'sealed']  # never opened
        for f in sorted(fn):
            p = os.path.join(dp, f); rel = os.path.relpath(p, ROOT).replace('\\', '/')
            cls = 'tune truth' if rel in TUNE_TRUTH else 'derived from tune truth (aggregates)' if rel in DERIVED else 'no truth'
            out.append(dict(file=rel, cls=cls, bytes=os.path.getsize(p), sha256=sha256_file(p), why=EVAL_WHY.get(rel, '')))
    return out


def sha256_file(p):
    import hashlib
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()


def code_evidence():
    """Ruling 72: the lines where stage B and the held-out driver load tasks, train (no task argument) and score ((task id,
    seed, candidates) only), and every line of the training/scoring code that reads a task's 'truth' key (must be none)."""
    lines = []; truth_reads = []
    for rel, pat in CODE_EVIDENCE:
        rx = re.compile(pat)
        for i, l in enumerate(open(os.path.join(ROOT, rel), encoding='utf-8'), 1):
            if rx.search(l): lines.append(dict(file=rel, line=i, text=l.strip()[:150]))
    for rel in ('train/stageB.py', 'train/kge.py', 'train/proj.py', 'export/checkpoints.py', 'train/heldout.py'):
        for i, l in enumerate(open(os.path.join(ROOT, rel), encoding='utf-8'), 1):
            if TRUTH_READ.search(l): truth_reads.append(dict(file=rel, line=i, text=l.strip()[:150]))
    need = [(f, t) for f, t in CODE_NEED if not any(c['file'] == f and c['text'].startswith(t) for c in lines)]
    return dict(lines=lines, truth_key_reads=truth_reads, missing=need, ok=not truth_reads and not need)


def read_sites(rel):
    """AR2-9: every line of a code file that reads a file (READ_SITE), with whether it names a task or truth file."""
    out = []
    for i, l in enumerate(open(os.path.join(ROOT, rel), encoding='utf-8'), 1):
        s = l.strip()
        if s.startswith('#') or not READ_SITE.search(l): continue
        out.append(dict(file=rel, line=i, text=s[:150], names_task_file=any(w in l for w in TASK_WORDS)))
    return out


def kge_reads_no_task_file(path=None):
    """The training code (train/kge.py) reads no task or truth file: every read site of it is listed, and the check
    fails on any read site (open, json.load, Path, np.load, torch.load, ...) that names a task or truth file."""
    rel = os.path.relpath(path or os.path.join(HERE, 'kge.py'), ROOT).replace('\\', '/')
    sites = read_sites(rel)
    bad = [(s['line'], s['text']) for s in sites if s['names_task_file']]
    return dict(ok=not bad, open_lines=bad, read_sites=len(sites))


def refuse(code, msg):
    print('leak audit: refusing (exit %d): %s' % (code, msg), flush=True)
    raise SystemExit(code)


def parse(argv):
    """Strict options: every key must be known (unknown keys are refused, exit 2); test-only keys need --test."""
    test = '--test' in argv; argv = [x for x in argv if x != '--test']
    if len(argv) % 2: refuse(2, 'options come in --key value pairs (odd count)')
    a = {}
    for k, v in zip(argv[::2], argv[1::2]):
        if not k.startswith('--'): refuse(2, 'not an option: %r' % k)
        key = k[2:].replace('-', '_')
        if key not in KEYS + TEST_KEYS: refuse(2, 'unknown option %r' % k)
        if key in TEST_KEYS and not test: refuse(2, '--%s is for --test only' % k[2:])
        a[key] = v
    return a, test


def main(argv):
    a0, test = parse(argv)
    if not test:
        er = os.environ.get('EMB_ROOT')
        if er and os.path.normcase(os.path.realpath(er)) != os.path.normcase(os.path.realpath(os.path.dirname(HERE))):
            refuse(2, 'real mode (ruling 84): EMB_ROOT %s is not the lane folder' % er)
    tdef = os.path.join(tempfile.gettempdir(), 'leak_audit_test')  # MF-10: a test never writes the real path by default
    a = dict(plan=os.path.join(HERE, 'stageB', 'plan.json'), scripts='', mounts='', parts='', roles='stageB,heldout', host_map='',
             out_md=os.path.join(tdef if test else os.path.join(HERE, 'leak_audit'), 'AUDIT-leak.md'),
             out_json=os.path.join(tdef if test else os.path.join(HERE, 'leak_audit'), 'leak_audit.json'))
    a.update(a0)
    for k in ('repo', 'facts', 'heldout_tasks'):
        if k not in a: refuse(2, '--%s is required' % k.replace('_', '-'))
    if test:
        real_out = os.path.normcase(os.path.realpath(os.path.join(HERE, 'leak_audit')))
        for k in ('out_md', 'out_json'):
            p = os.path.normcase(os.path.realpath(a[k]))
            if p == real_out or p.startswith(real_out + os.sep): refuse(2, '--test output %s is under the real train/leak_audit' % a[k])
    lane_host = a.get('lane_host') or ROOT
    host_map = [tuple(x.split('=', 1)) for x in a['host_map'].split(',') if x] if a.get('host_map') else []
    stage_rel = a.get('stage_rel', STAGE_REL); probe_stage_rel = a.get('probe_stage_rel', PROBE_STAGE_REL)
    git = Git(a['repo']); facts = a['facts']
    plan = json.load(open(a['plan']))
    tune = [json.loads(l) for l in open(os.path.join(ROOT, 'eval', 'tune_tasks.jsonl')) if l.strip()]
    held, pin_bad = pin_heldout_tasks(a['heldout_tasks'], plan, a.get('tasks_sha256', TASKS_SHA256))
    assign = dict(tune=dict(plan['assignment']), heldout=dict(plan['heldout']['assignment']))
    for item in filter(None, a['override_assign'].split(',')) if a.get('override_assign') else []:
        sp, pc = item.split(':'); P, C = pc.split('='); assign[sp][P] = C
    res = dict(written=datetime.datetime.utcnow().isoformat() + 'Z', s=plan['s'], plan_hash=plan.get('plan_hash'), splits={}, failures=[], test=test,
               heldout_tasks=dict(file=a['heldout_tasks'], sha256=sha256_file(a['heldout_tasks']), rows=len(held), problems=pin_bad))
    for split, rows in (('tune', [dict(task_id=t['task_id'], parent=t['parent'], commit=t['commit']) for t in tune]), ('heldout', held)):
        per_ck = collections.OrderedDict()
        for t in rows:
            C = assign[split][t['parent']]
            r = check_pair(git, facts, C, t['parent'], t['commit'])
            d = per_ck.setdefault(C, dict(checkpoint=C, tasks=0, parents=set(), c1=0, c2=0, c3=0, c_eq_p=0, commit_checked=0, history_commits=0))
            d['tasks'] += 1; d['parents'].add(t['parent']); d['c_eq_p'] += int(C == t['parent'])
            for k in ('c1', 'c2', 'c3'): d[k] += int(r[k])
            d['commit_checked'] += int(r['c1_commit_checked']); d['history_commits'] = r['c1_history_commits']
            if not (r['c1'] and r['c2'] and r['c3']):
                res['failures'].append(dict(split=split, task=t['task_id'], parent=t['parent'], checkpoint=C, **r))
        for d in per_ck.values(): d['parents'] = len(d['parents'])
        res['splits'][split] = dict(checkpoints=len(per_ck), tasks=len(rows), rows=list(per_ck.values()))
    # c4: parts place every task on its planned checkpoint
    c4 = []; c4_by = collections.Counter()
    for pd in filter(None, a['parts'].split(',')):
        pd = pd.split('=', 1)[1] if re.match(r'^(tune|heldout)=', pd) else pd
        for dp, dn, fn in os.walk(pd):
            if 'counts.json' in fn and not dp.endswith(('.part', '.model')):
                C = os.path.basename(dp)
                for tid, rec in json.load(open(os.path.join(dp, 'counts.json'))).items():
                    P = rec.get('parent'); sp = 'tune' if P in assign['tune'] else 'heldout'
                    ok = rec.get('checkpoint') == C == assign[sp].get(P)
                    c4.append(ok); c4_by[sp] += 1
                    if not ok: res['failures'].append(dict(split=sp, task=tid, parent=P, checkpoint=C, c4=False))
    res['c4_parts'] = dict(task_rows=len(c4), ok=sum(c4), by_split=dict(c4_by))
    scripts = [p for p in a['scripts'].split(',') if p]; inspects = [p for p in a['mounts'].split(',') if p]
    res['mounts'], inspect_bad = audit_mounts(scripts, inspects, lane_host, host_map)
    res['outside_lane'] = [dict(source=m['source'], host=m['host'], files=m['files'], listed=m['outside_lane']['listed'])
                           for m in res['mounts'] if m.get('outside_lane')]
    # coverage (audit-result-3, AR2-4): every role has a launcher and mount rows, every split its planned parts rows
    want = planned_rows(plan, tune, TASKS_ROWS)
    if test and a.get('expect_rows'): want.update({k: int(v) for k, v in (x.split('=') for x in a['expect_rows'].split(','))})
    cov = list(inspect_bad) + list(pin_bad)
    roles = [r for r in a['roles'].split(',') if r]
    if not test and not {'stageB', 'heldout'} <= set(roles): cov.append('--roles must include stageB and heldout (given %s)' % roles)
    have = collections.Counter(role_of(sp) for sp in scripts)
    rows_by = collections.Counter(m['role'] for m in res['mounts'])
    for r in roles:
        if not have[r]: cov.append('no launcher script for the %s role' % r)
        if not rows_by[r]: cov.append('no mount row for the %s role' % r)
    if not test:
        for cn in ('kge-B1', 'kge-H1', 'kge-H1P'):
            if not any(os.path.basename(p).startswith(cn + '-') or os.path.basename(p).startswith(cn + '.') for p in inspects):
                cov.append('no docker inspect capture for %s' % cn)
    for sp, n in sorted(want.items()):
        if c4_by[sp] != n: cov.append('%s parts rows %d, planned %d' % (sp, c4_by[sp], n))
    res['coverage'] = dict(ok=not cov, problems=cov, planned_rows=want, roles=roles, mount_rows_by_role=dict(rows_by))
    # ruling 89: the stage-B inspect capture named by the ruling, its hash pinned
    b1 = [p for p in inspects if os.path.basename(p) == os.path.basename(B1_INSPECT[0])]
    b1_want = a.get('b1_inspect_sha256', B1_INSPECT[1]) if test else B1_INSPECT[1]
    if not test and not b1: cov.append('ruling 89: the stage-B inspect capture %s is not among --mounts' % B1_INSPECT[0])
    for p in b1:
        if sha256_file(p) != b1_want: cov.append('ruling 89: %s hashes to %s, pinned %s' % (p, sha256_file(p)[:16], b1_want[:16]))
    res['coverage']['ok'] = not cov
    res['ruling89'] = ruling89(plan, [p for p in a['parts'].split(',') if p], test, int(a['expect_parts']) if test and a.get('expect_parts') else None)
    res['ruling78'] = ruling81(res['mounts'], plan, lane_host, a.get('build_host'), stage_rel, probe_stage_rel, host_map)
    res['kge_reads_no_task_file'] = kge_reads_no_task_file()
    res['read_sites'] = {rel: read_sites(rel) for rel in READ_FILES}
    res['eval_files'] = eval_listing(); res['code_evidence'] = code_evidence()
    res['disclosure81'] = disclosure81(plan)
    res['eval_mounted_in'] = sorted({m['source'] for m in res['mounts'] if m['host'].replace('\\', '/').rstrip('/').endswith('/eval')})
    for m in res['mounts']:
        if not m['ok']: res['failures'].append(dict(mount={k: m[k] for k in ('source', 'host', 'dest', 'cls')}))
    res['ok'] = (not res['failures'] and res['kge_reads_no_task_file']['ok'] and res['code_evidence']['ok'] and res['coverage']['ok']
                 and res['ruling78']['ok'] and res['ruling89']['ok'])
    os.makedirs(os.path.dirname(os.path.abspath(a['out_json'])), exist_ok=True)
    jname = os.path.basename(a['out_json'])
    json.dump(res, open(a['out_json'], 'w'), indent=1, default=list)
    L = ['## Leak audit (addendum 8 item 18, ruling 60)', '',
         'Written by train/leak_audit.py %s; s = %s, plan_hash %s. Checked from the raw facts cache (commits.jsonl) and git.' % (res['written'], plan['s'], plan.get('plan_hash')),
         'c1 task commit not in C\'s history (tune: by sha; both splits: every raw commit of C is P or a git ancestor of P; C\'s raw '
         'history non-empty and containing C); c2 ruling 49 (C = P, or git ancestor with a raw-history subset); c3 C not later than P (ruling 50 order).', '',
         'Held-out task list: %s, sha256 %s, %d T1 held-out rows%s.' % (a['heldout_tasks'], res['heldout_tasks']['sha256'], len(held),
                                                                       '' if not pin_bad else ' (FAIL: ' + '; '.join(pin_bad) + ')'), '',
         '| split | checkpoint | tasks | parents | C = P | c1 | c2 | c3 | raw history commits |', '|---|---|---|---|---|---|---|---|---|']
    for split in ('tune', 'heldout'):
        for d in res['splits'][split]['rows']:
            L.append('| %s | %s | %d | %d | %d | %d | %d | %d | %d |' % (split, d['checkpoint'], d['tasks'], d['parents'], d['c_eq_p'], d['c1'], d['c2'], d['c3'], d['history_commits']))
    L += ['', 'Totals: ' + '; '.join('%s %d checkpoints, %d tasks' % (k, v['checkpoints'], v['tasks']) for k, v in res['splits'].items()) +
          '; parts rows placed on their planned checkpoint %d of %d.' % (res['c4_parts']['ok'], res['c4_parts']['task_rows']), '',
          'Coverage (a vacuous audit fails): %s.' % ('ok' if res['coverage']['ok'] else 'FAIL: ' + '; '.join(res['coverage']['problems'])), '',
          'Rulings 78 and 81 (held-out and probe mounts = the exact allow-lists of leak_audit.py; the %d held-out parents\' facts and source store only): %s.' % (
              res['ruling78']['parents'], ('ok, staged %s' % json.dumps(res['ruling78']['staged'])) if res['ruling78']['ok'] else 'FAIL: ' + '; '.join(res['ruling78']['problems'])), '',
          '| mount (script:line or inspect) | container | host source | destination | mode | class | files (all in %s mounts[i].files) | ok |' % jname,
          '|---|---|---|---|---|---|---|---|']
    for i, m in enumerate(res['mounts']):
        L.append('| %s | %s | %s | %s | %s | %s | %d (mounts[%d]) | %s |' % (m['source'], m['container'], m['host'], m['dest'], m['mode'], m['cls'], m['n_files'], i, 'yes' if m['ok'] else 'NO'))
    L += ['', 'Sources outside the lane, listed file by file (%d; every file in %s outside_lane[i].files): %s.' % (
              len(res['outside_lane']), jname, '; '.join('%s (%d files%s)' % (o['host'], len(o['files']), '' if o['listed'] else ', NOT READABLE HERE') for o in res['outside_lane']) or 'none'),
          '', 'Training code (train/kge.py) reads no task or truth file: %s (%d read sites; every read site of kge.py, stageB.py and heldout.py is in %s read_sites).' % (
              'yes' if res['kge_reads_no_task_file']['ok'] else 'NO ' + str(res['kge_reads_no_task_file']['open_lines']), res['kge_reads_no_task_file']['read_sites'], jname),
          '', '### Tuning truth inside the mounted eval/ folder (ruling 72)', '',
          'The whole eval/ folder is mounted read-only in: %s. Every file in it:' % (', '.join(res['eval_mounted_in']) or 'no listed container'), '',
          '| file | class | bytes | sha256 | why |', '|---|---|---|---|---|'] + [
          '| %s | %s | %d | %s | %s |' % (e['file'], e['cls'], e['bytes'], e['sha256'], e['why']) for e in res['eval_files']] + [
          '', 'Code lines showing that training takes no task and scoring takes only (task id, seed, candidates):', ''] + [
          '- `%s:%d` %s' % (c['file'], c['line'], c['text'].replace('|', '/')) for c in res['code_evidence']['lines']] + [
          '', 'Lines of train/stageB.py, train/kge.py, train/proj.py, export/checkpoints.py, train/heldout.py that read a task\'s truth key: %s.' % (
              'none' if not res['code_evidence']['truth_key_reads'] else res['code_evidence']['truth_key_reads']), '',
          'Failures: %d (every one in %s failures).' % (len(res['failures']), jname), '',
          'Ruling 89 check: %s.' % ('ok' if res['ruling89']['ok'] else 'FAIL: ' + '; '.join((res['ruling89']['parts']['problems'] + res['ruling89']['site_problems'])[:8]
                                                                                        + ['other-key site %s:%d' % (s['file'], s['line']) for s in res['ruling89']['other_key_sites']])), '',
          DISCLOSURE_35, '', res['disclosure81']['text'], '', res['ruling89']['text'], '', DISCLOSURE_SIBLING, '']
    os.makedirs(os.path.dirname(os.path.abspath(a['out_md'])), exist_ok=True)
    with open(a['out_md'], 'w') as f: f.write('\n'.join(L))
    print('leak audit', 'PASS' if res['ok'] else 'FAIL', json.dumps({k: (v['checkpoints'], v['tasks']) for k, v in res['splits'].items()}),
          'failures', len(res['failures']), 'mount rows', len(res['mounts']), 'coverage', res['coverage']['problems'] or 'ok',
          'ruling78/81', res['ruling78']['problems'] or 'ok', 'ruling89', 'ok' if res['ruling89']['ok'] else (res['ruling89']['parts']['problems'][:3] + res['ruling89']['site_problems'][:3]
                                                                                     + ['other-key %s:%d' % (s['file'], s['line']) for s in res['ruling89']['other_key_sites']]),
          'test' if test else '', flush=True)
    return res


if __name__ == '__main__':
    main(sys.argv[1:])
