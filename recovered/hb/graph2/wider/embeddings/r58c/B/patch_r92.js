// agent B, r58c: print leak_audit.json ruling92.text (agent A, leak_audit.py 629c0df3: both stage-B guards' docker run
// lines equal apart from the disk values) in RESULT.md (write_result.py) and AUDIT.md (write_audit_claims.py), with
// checks that fail on the before bytes (r58c/B/pre-mf12/write_result.py, r58c/B/pre-r92/write_audit_claims.py).
const fs = require('fs');
function patch(P, pairs) {
  let s = fs.readFileSync(P, 'utf8');
  for (const [a, b] of pairs) { if (s.split(a).length !== 2) throw new Error(P + ': not exactly once: ' + a.slice(0, 90)); s = s.replace(a, () => b); }
  fs.writeFileSync(P, s); console.log('patched', P);
}
patch('train/write_result.py', [
  [`        L.append('- Leak audit (ruling 60): %s; checkpoints and tasks per split %s; failures %d; container mounts listed %d (table in AUDIT.md,'
                 ' with ruling 35\\'s disclosure).' % ('PASS' if LK.get('ok') else 'FAIL', json.dumps({k: [v['checkpoints'], v['tasks']] for k, v in LK.get('splits', {}).items()}), len(LK.get('failures', [])), len(LK.get('mounts', []))))
        J['leak_audit'] = dict(ok=LK.get('ok'), checkpoints_tasks={k: [v['checkpoints'], v['tasks']] for k, v in LK.get('splits', {}).items()},
                               failures=len(LK.get('failures', [])), parts_rows=LK.get('c4_parts'))`,
   `        R92 = LK.get('ruling92') or {}
        L.append('- Leak audit (ruling 60): %s; checkpoints and tasks per split %s; failures %d; container mounts listed %d (table in AUDIT.md,'
                 ' with ruling 35\\'s disclosure). %s (leak_audit.json ruling92.text; check ok = %s)' % ('PASS' if LK.get('ok') else 'FAIL', json.dumps({k: [v['checkpoints'], v['tasks']] for k, v in LK.get('splits', {}).items()}), len(LK.get('failures', [])), len(LK.get('mounts', [])),
                 R92.get('text') or 'Ruling 92: no ruling92.text in leak_audit.json.', R92.get('ok')))
        J['leak_audit'] = dict(ok=LK.get('ok'), checkpoints_tasks={k: [v['checkpoints'], v['tasks']] for k, v in LK.get('splits', {}).items()},
                               failures=len(LK.get('failures', [])), parts_rows=LK.get('c4_parts'), ruling92=dict(ok=R92.get('ok'), text=R92.get('text')))`]]);
patch('r58c/write_audit_claims.py', [
  [`            ' parent\\'s ancestors.txt and sizes.json to fix the held-out assignment and lag in the plan (rulings 49-52); no triple,'
            ' path or co-change pair is read there, and no training or scoring path of stage B opens a held-out parent\\'s folder.'), '']`,
   `            ' parent\\'s ancestors.txt and sizes.json to fix the held-out assignment and lag in the plan (rulings 49-52); no triple,'
            ' path or co-change pair is read there, and no training or scoring path of stage B opens a held-out parent\\'s folder.'), '',
        '**Ruling 92 (the two stage-B guards; leak_audit.json ruling92.text; check ok = %s):** %s' % (
            (LK.get('ruling92') or {}).get('ok'), (LK.get('ruling92') or {}).get('text') or '(not in leak_audit.json)'), '']`]]);
// tests
patch('train/r58/tests/test_write_result.py', [
  [`               failures=[], mounts=[1, 2, 3], c4_parts=2385), open(LKP, 'w'))`,
   `               failures=[], mounts=[1, 2, 3], c4_parts=2385, ruling92=dict(ok=True, text=R92T)), open(LKP, 'w'))`],
  [`# ---- leak audit, held-out hand-off, anchor, assemble-checks log\n`,
   `# ---- leak audit, held-out hand-off, anchor, assemble-checks log\nR92T = 'RULING-92-GUARDS-TEXT both guards run kge-B1 the same way apart from the disk values.'\n`],
  [`ok_new, ev_new = mf12_ok(wr); ok_pre, ev_pre = mf12_ok(PM)\n`,
   `ok_new, ev_new = mf12_ok(wr); ok_pre, ev_pre = mf12_ok(PM)
# leak_audit.json ruling92.text (agent A, leak_audit.py 629c0df3) beside the leak-audit line; the pre-mf12 bytes drop it
O92 = fresh(os.path.join(D, 'out_pre92')); rc92 = exits(PM.main, full + ['--outdir', O92])
md92 = open(os.path.join(O92, 'RESULT.md')).read() if os.path.exists(os.path.join(O92, 'RESULT.md')) else ''
check('r92_text_printed_pass_after', R92T in md and (J.get('leak_audit') or {}).get('ruling92', {}).get('text') == R92T, 'RESULT.md and result.json')
check('r92_text_printed_fail_before', rc92 == 0 and md92 and R92T not in md92, 'pre-mf12 exit', rc92, 'wrote', bool(md92))
`]]);
patch('r58c/B/tests/test_write_audit_claims.py', [
  [`R89 = 'RULING-89-PER-USE-TEXT stage B loads a graph only for a plan checkpoint; 2385 parts checked.'\n`,
   `R89 = 'RULING-89-PER-USE-TEXT stage B loads a graph only for a plan checkpoint; 2385 parts checked.'\nR92 = 'RULING-92-GUARDS-TEXT both guards run kge-B1 the same way apart from the disk values.'\n`],
  [`disclosure81=dict(text=R81), ruling89=dict(ok=True, text=R89), splits=`,
   `disclosure81=dict(text=R81), ruling89=dict(ok=True, text=R89), ruling92=dict(ok=True, text=R92), splits=`],
  [`PRE = load_module('wac_preB', os.path.join(ROOT, 'r58c', 'B', 'pre', 'write_audit_claims.py'))\n`,
   `check('r92_text_in_audit_and_result', ('**Ruling 92 (the two stage-B guards; leak_audit.json ruling92.text; check ok = True):** ' + R92) in au
      and R92 in open(os.path.join(RD, 'RESULT.md')).read(), 'AUDIT.md section 1 and RESULT.md')
P92 = load_module('wac_pre92', os.path.join(ROOT, 'r58c', 'B', 'pre-r92', 'write_audit_claims.py')); P92.TEST_OUT = os.path.join(D, 'pre92-out')
P92.WRITE_RESULT_PIN = wac.WRITE_RESULT_PIN  # the same writer bytes: only the AUDIT.md text differs
rc92 = exits(P92.main, list(wa)); au92 = open(os.path.join(P92.TEST_OUT, 'r58c-test', 'AUDIT.md')).read() if os.path.exists(os.path.join(P92.TEST_OUT, 'r58c-test', 'AUDIT.md')) else ''
check('r92_fail_before_pre92_wac', au92 != '' and '**Ruling 92 ' not in au92, 'pre-r92 exit', rc92, 'wrote AUDIT.md', au92 != '')
PRE = load_module('wac_preB', os.path.join(ROOT, 'r58c', 'B', 'pre', 'write_audit_claims.py'))
`]]);
