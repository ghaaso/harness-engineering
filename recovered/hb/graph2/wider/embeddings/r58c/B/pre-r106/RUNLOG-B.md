## Round r58c, agent B (appended by the lead; written 2026-11-14T21:35Z, revised after the reset at about 22:40Z)

Lines for train/RUNLOG.md (rulings 58/83: each PASS line after its sha256 line; the logs open with these bytes). The
three role files did not change after the reset; the selectB and report logs are produced again by r58c/B/TEST-QUEUE.md
steps 1-3 (test_gate and test_write_result import leak_audit.py 629c0df3; the writers changed). Append these lines only
after those steps pass:

```
sha256 d42cd9004130c97648945887a9c6645334ce211650395ffb80a5f6d248850ce1 selectB train/selectB.py
PASS selectB r58c/B/out/logs/role_selectB.log
sha256 74d8ef99f280e8a84f57d0bf6f499a076b8a7a99a9de95217dcf88177cf20a70 report train/report.py
PASS report r58c/B/out/logs/role_report.log
sha256 41371c7d93d06f9649c8dc262f5019797726e18a854880ce65d9441d42cb4ddb item27 train/item27.py
PASS item27 r58c/B/out/logs/test_item27.log
```
27cc2726b7608b804a88e1ddfe9c11d973b73b89e39564816265df98dd2dc54b *fixes/tests/test_select_report.py
61d1c51ec5837867853dfa186bdfc4d16a765644e4c4298d17f44bde1801f1ba *orchestrator/END-ORDER.md
ba0ca39de0ec3ba9edf90fe3428ef035957fd6557145d0f74e2fccad59343568 *orchestrator/assemble_checks.py
f09ba080d6d697eee2a83896b71358c126d1f795d9983a0ba8a272bc4fa6bffe *orchestrator/end_of_run.sh
9a1a14bf6d25c328d86167057cb8fed9a676e4597db4ec5cd686294798bade39 *parallel/tests/test_assemble_checks.sh
a2d3cebbecdf19daa9d4b22c078a075be25d3080269011ead74a89d91522f5ef *r58c/B/CONFLICTS.md
6a94e138a7c61f1898ca75e894a8fecbec9a6fd761b69fefe81e6ffcbf72b63c *r58c/B/INTERFACE-for-A.md
1b72ca5c160e1e6b369e3309ba473ffec4cedb1c06ed979dabd7a79319f032b1 *r58c/B/STATE-after-reset.md
b004ce52c28057271efa8a107a92ed6837580ae6bab6b267d9dff1f6c02b0a93 *r58c/B/TEST-QUEUE.md
11ce34c3c79c9320d703edd0babcc37c39f8e75676eaf8cdeb3a77e90cb59dfb *r58c/B/eor/end_of_run.before-fakeps.sh
9b26532ae805e4a4827935c11dff20554eba35f5da9c059c2df4d8736c8764cf *r58c/B/eor/fake_ps.sh
e1077accdccbe0e85f13f36bef3556bafe2e58a4ea71e07160d8f9b95e1daa0f *r58c/B/eor/make_copy.js
3680f873c88782085aa382830e91e729e2832b234fa618bed5c3ee595b51751a *r58c/B/eor/test_end_of_run.sh
7e12385a688a890798cd30388249d95ac913a822a1554b9b09b25faa305251a3 *r58c/B/freeze_check.sh
a196b5f5c94c8ec116f2691ae8514c73b554fd2655bcef21295fc77539fb41d1 *r58c/B/freeze_list.sh
ac9d5191cbc9ac3e774716feb5676301139fa2574cd1b0829b38a2a3a95d78ea *r58c/B/frozen/plan.json
d928cfd2273b3d687b437a4606fd1488a0dbe45a6209ff12bf0a480e231c35f2 *r58c/B/ktest.sh
db4316c3f1868f1cd48f42d9e1b42b84051c436dc4cdd5a2d6dd4adcf2764ce1 *r58c/B/lane_step.sh
759990b6e0a3b351d652f706c11f6bb65433345a07c28c78d3ce7c3cf8eb87a2 *r58c/B/patch_endorder_final.js
953feedb69e8ac033a05085b5a7da89119ae60e752768b50286828488cf6fd78 *r58c/B/patch_endorder_review1.js
08f655a8627681fa8d161fb521b54825e331c0d150ddbbbf0876ae6aa12571d8 *r58c/B/patch_memgate.js
659adcd265bf17df1210b8b7976a3927a5d3bfe5b931b3e69845b3b7e0aadcc1 *r58c/B/patch_mf12.js
28f62d725f9e550fc6107f3e1ebaf7a5edf793cc506877ad684099565072b3f2 *r58c/B/patch_mf12_docs.js
6e8a84d57ada82dab69a25e18081d75dc9a7d541463a42801a1b7dc8a4a43718 *r58c/B/patch_r92.js
cbd98f08f8e668337a257ab7e4a77a8c1f017e444cbfe212b423fdade2bd36ce *r58c/B/patch_race.js
1cdcb6e7d2074da87b00b8bc79b156f6435eccfbed3e0203d11a457830d44b54 *r58c/B/pre-memgate/END-ORDER.md
eb7d897c88dd2f37b857b88819c6438671cb4c1e406dd3ac806cb682dea77f5d *r58c/B/pre-memgate/end_of_run.sh
13272ee46fd4d1343e2f453787bddf91cb52d9170c761aba0206d0de3691ebf6 *r58c/B/pre-memgate/ktest.sh
447e7064c0ee3aa317913ced5e75ce3dafb0cc5a9e43241fdc9498fa947fce88 *r58c/B/pre-memgate/lane_step.sh
203916cc654844a661460bf6c878d036efc63435cd2003a440b5ab4e6279ad83 *r58c/B/pre-memgate/race_gate.sh
4f9331abedd7a45be2127ca1b2d8af417ca4e0c99a3ec2dd589700d5f81aa47f *r58c/B/pre-memgate/rerun_check.sh
30ed630b289bbbc67aca8d2834419dc1e4b39e32a45cd4603b06d5f39191ef6b *r58c/B/pre-memgate/test_end_of_run.sh
9853d1340da12df5ff932b5336fc5814f6f6f7e6db2636d282c7f413323bc4b1 *r58c/B/pre-mf12/write_result.py
9c378b93c961624f6080bb5b83876da47b4f79d160cba983e02d89f9191af449 *r58c/B/pre-r92/write_audit_claims.py
9ffe04952763b3dce2a2ec88863ce654cd3df065e6d2fc95afedefda21a7afb4 *r58c/B/pre-race/end_of_run.sh
0abd69388aa61834bf9a697fd740f3dbe36a108de8fb222ef12060e119640dc4 *r58c/B/pre-race/kt_inner.sh
db8b69e200588abb07d9c060eb7ee566bb886f1b90c3f0e89b68742d30355553 *r58c/B/pre-race/ktest.sh
de622aa2caff932aea371c536fb40146b52029b356ffcdb31b2556ac3a296910 *r58c/B/pre-race/lane_step.sh
1c7b6fb596db3f08552f616a1474a8e478a439f38979358b4f2716a7db456083 *r58c/B/pre-race/rerun_check.sh
6e34c429620b77e712437aa992b8f271a06c4887c8b8b9603467fb9c221fc084 *r58c/B/pre-race/test_end_of_run.sh
dddb22c9eea4ba193bfc67fc327bb2ef26912884f852be7a9c44dd78780e12dd *r58c/B/race_gate.sh
2586eb582c77e74df86630ac622137f57fc9280f4799c6f3f993c9747d16841a *r58c/B/rerun/rerun_check.py
501e3c3c7f0d6b93fd2393e63866a1cde1ce7699289444793f8825711d47fb49 *r58c/B/rerun_check.sh
6b3b478450a7338a802fd0cc126aa140bd1182bf372daa6b56f8becd9e8a811d *r58c/B/role_join.sh
96b7ff3b7576408db2c7875b7d920cb9991c81beabc808fc76607ba470b3cd2c *r58c/B/tests/fake_docker.sh
51694e0fb8e9e8c6b8660c94465808c45acada10f823d13bdccab5c5775d5d4b *r58c/B/tests/kt_inner.sh
a23952fa31dc962d6cb311c441681dff9182a9b1f2251e60b1e6e9eee36e22cd *r58c/B/tests/mf4.sh
b7bfeb1b2bbaac8e2bb1a4ed41957fd7e146648c928b65669c0fcd807265eb48 *r58c/B/tests/role.sh
02e2e96686c0d62427731a33c9ceaac395b9bdae7f1639bf5b67bd586a984aac *r58c/B/tests/role_report.sh
06b49a5485f979b8fd39767807c0891950423bec70f537808b06251869b9282a *r58c/B/tests/role_selectB.sh
54ca931d2e361bcffea94c260edd9b8acbb8e21575498df8d3b309e5ae07e593 *r58c/B/tests/test_b_units.py
2c8794b7537f85291e78927cabe646a88217ea53e6dfa4e5645d02959d48a0b7 *r58c/B/tests/test_freeze_check.sh
24279c2749b0bc8de57ca8d7c464e66faeca1610d7083e50caa8eee91c04d285 *r58c/B/tests/test_memgate_empty.sh
ea939dd854a4578b15f432f2ca5fa1f640a3a2262e3b96e9a24de6c4ff46d743 *r58c/B/tests/test_race_gate.sh
bd461387629c0a63ec07e1121e4e32986223fa1ac0cfddeb6c14dd4b993c34ff *r58c/B/tests/test_rerun_check.py
e1cad5feb63d19308fd43650c19fd9dfa7ac49095ccd5c2c86cb2c9d610a3aa1 *r58c/B/tests/test_write_audit_claims.py
40412721b2e4589f5535b24584b7ad56a824b15a457b8ff95bb246ea88d76378 *r58c/tests/test_r64.py
22a85a2f0507a426de0374cfceed5c2f0977aae3207ae2e886d4ea60584171c8 *r58c/tests/test_selection_freeze8.py
a4069b15dc939f76e4852e4495898a408e879d2aedde1c394e37acaeb9c2c9fa *r58c/write_audit_claims.py
3ab358a107a76321799c6339e927ab1dd5fcc0b6ba3a16171420d481b94b9b01 *train/item22.py
41371c7d93d06f9649c8dc262f5019797726e18a854880ce65d9441d42cb4ddb *train/item27.py
def933db4021af0451d1ab1e8148602bd4854dc4ed316ec7c5d04ae23df399bb *train/r58/tests/test_counts.py
b7d90d6eb1924ec9acf9c1bf53c8968a63e8460d879c293fcc464f47f97f9e2e *train/r58/tests/test_gate.py
e914984ed14a61c07a7772a1431424d71751e2826a42b9e0c1aa59b76d611ead *train/r58/tests/test_item27.py
46f8e0608a81774b1d8a51deceb66ef0d1979668d9c7012057d7ae62b6f2a7f8 *train/r58/tests/test_verdict.py
cf9b6ec372677430d67cde132f8528a0814928a4fe058ac7911bb337bd992bba *train/r58/tests/test_write_result.py
74d8ef99f280e8a84f57d0bf6f499a076b8a7a99a9de95217dcf88177cf20a70 *train/report.py
d42cd9004130c97648945887a9c6645334ce211650395ffb80a5f6d248850ce1 *train/selectB.py
a8135e3da0fa9f22d324022321adaaa3510f31b35ba59427518ce2aaa2f32921 *train/write_result.py
```

## Round 2 final, agent B, 2026-11-15 about 01:30Z (end-order-changes-2 changes 1, 3, 4, 5, 6, 9; END-ORDER text changes 1, 2, 5, 8, 10-18)

What changed (detail in CONFLICTS.md notes 9-17 and INTERFACE-for-A.md's ruling-94 section):
- Change 1 (ruling 94): `r58c/B/mounts-B.json` regenerated by `gen_mounts.js` in the shape agent A's `leak_audit.py`
  reads (no `_about` key; bare steps 2c, 4, 5, 6, 8, 9.1-9.4; no `<STAMP>` in a src: kge-R1 mounts
  `r58c/B/rerun-out` at `/w/rerun-out` and works in `/w/rerun-out/$STAMP`); an older record is kept as
  `r58c/mounts/<name>.<UTC>.json` (lane_step.sh, rerun_check.sh) and `write_audit_claims.py` lists those too.
  Check: `test_mounts_vs_leak_audit.py` (A's reader on the lists; the before bytes in `pre-r94b/` fail).
- Change 3: `ktest.sh` waits for three samples 30 s apart, free >= 6 GB and commit < 40 GB.
- Change 4: `train/item27.py` refuses without the coordinator's `tune_rank_check` line (test_item27_trc).
- Change 5: timings on a full-size stand-in (below); limits in END-ORDER section 0 and beside `LIMIT_R<N>`.
- Change 6: AUDIT.md section 9 (write_audit_claims r86b_*, r94e_*, r94f_*).
- Change 9: the 2e wrapper `r58c/B/tests/wr_rehearsal.sh`; `ktest.sh` exits with the container's code;
  `role.sh` and `kt_inner.sh` now exit 1 when a test fails (they exited 0; test_wrapper_exit.sh, before bytes in
  `pre-exitcode/`).

Defects found and fixed in this round (each with a check that fails on the before bytes):
- `docker exec ... touch /tmp/go` was rewritten by Git Bash into a Windows path, so the release never reached the
  container (ktest-b30, b31 "release failed"): `MSYS_NO_PATHCONV=1` in `race_gate.sh` and `end_of_run.sh`; check in
  test_race_gate.sh with a native docker stand-in (before bytes in `pre-pathconv/`).
- `ktest.sh`'s sample loop used `set --` and overwrote the inner script's arguments (ktest-b32 ran role_report.sh
  with the sample's numbers): variables instead; check in test_memgate_empty.sh (before bytes in `pre-argfix/`).
- Editing ktest.sh while ktest-b34 ran corrupted that run. ktest-b30..b34 are void.
- `write_audit_claims.py`'s leak claim line lacked the ruling-92 suffix that write_result prints, so four claims were
  NOT FOUND (exit 24, ktest-b42): fixed; fail-before log `r58c/B/logs/test_write_audit_claims.pre-r92line.log`.
- Incident 2026-11-14 23:05Z: a `node r58c/B/mounts.js flags` call created empty directories `train/selectB` and
  `train/leak_audit` (mkdir of the src of an rw mount); both were empty and removed with rmdir at once; nothing was
  read or written in them. `mounts.js flags` creates a writable src by design (the real step's output folder, when
  lane_step.sh launches it); only `mounts.js check` is for inspection, and only check was used after 23:05Z.

Change 5 timings (stand-in `r58c/B/out/timing/asm`: the frozen real plan, 2,385 parts, 4,001,445 score rows):
assemble 86.24 s (16.6-17.0 s per arm) + assemble_checks 31.27 s = 117.51 s (ktest-b45); selectB 88.56 s (ktest-b46);
report.main 121.10 s (ktest-b49); item22 325 s (ktest-b48). Answer_level and the leak audit are agent A's (then still open; filled since: END-ORDER section 0 limits table).

Lines for train/RUNLOG.md (rulings 58/83; the lead appends them; item27.py changed in change 4):

```
sha256 d42cd9004130c97648945887a9c6645334ce211650395ffb80a5f6d248850ce1 selectB train/selectB.py
PASS selectB r58c/B/out/logs/role_selectB.log
sha256 74d8ef99f280e8a84f57d0bf6f499a076b8a7a99a9de95217dcf88177cf20a70 report train/report.py
PASS report r58c/B/out/logs/role_report.log
sha256 5e19b395fbbe23410d305d498bbaef1758ed308cf389a89886481ef54be13745 item27 train/item27.py
PASS item27 r58c/B/out/logs/test_item27.log
```

Files of this round (sha256 at 01:30Z; RUNLOG-B.md's own hash is in the report):

```
d10daa6a054825206a558465060ff2b927bab73dbf774722547659691028609f *orchestrator/END-ORDER.md
48c46d8c7356fa7fb44d0a83695d67188dde8c6d3296e86c0cfbe3b69abb3ba7 *orchestrator/end_of_run.sh
5a93dc91ea11c1dbd60511aa7e9af744c0f4e1ba4e22d8c87b67939ccdcc88bb *r58c/B/CONFLICTS.md
52e9ef173e761559a5fe833798019efc19f0e53284c1b56814b16074f16e6b9e *r58c/B/INTERFACE-for-A.md
a0b0e0de8dfb5c25175a27d19ba4e84a1b2ef4b3adfee6b9baa7988625d420ec *r58c/B/TEST-QUEUE.md
9031ab4cee974cff94f14c16ff44b7c55e56b368169afbd78b673a9addbb2bc4 *r58c/B/freeze_check.sh
acdd95e8ca0a05d1201750e247d10ba8cc34cac602409ecc55e19ea663b86d1e *r58c/B/freeze_list.sh
5534c1e3778f7daa38c7fa17a990de5dcf873822ede152d6bf28ac9da7fe16b9 *r58c/B/gen_mounts.js
4f5696bcc888fe5520922aeab9ab3130ee1e1e487f4643ebe2d54434de72e1ad *r58c/B/ktest.sh
c0b4680aa53b5ae6e94035ac5efd5e925ce58e4c6dc2fc5747a82005b0e2d926 *r58c/B/lane_step.sh
a33da8ad07037002724a5265642561ecdc7ff84c3bb78c2aa8ac3d443313789f *r58c/B/mounts-B.json
731423eb21f82e0a40cdd08e63606ee29bc1ffc4a9a41c503b357fd05d3941e9 *r58c/B/mounts.js
0b8ad655b6c7155587b8a6b3a109ee3e449c7a5fc702bb41e6324c28a5b5f169 *r58c/B/patch_r94_freeze.js
b718d8efd82bda8b91b751b2bfa71b22b30c771838c54ef9f8ce22fb854a3dde *r58c/B/patch_r94_tests.js
2c3ffa67a3175d55348689b1d656f5efb997817062a10bc22ac445d5c82a3cc9 *r58c/B/patch_r94_wac.js
a9ed223f209b2c10bf03a49e14ec31bb7b07366c3e99d3935edaae2c7de0f522 *r58c/B/patch_r94b.js
65d0de36803f12d0d61fb28da1caf145e67172d3f6f0b3e76fde5f58ad7972c7 *r58c/B/race_gate.sh
a77c8881b7d3fc0bad84a941916659ae0a8bca79956b7f1766b4073e1e652113 *r58c/B/rerun_check.sh
ac5dc031d8d76be39ddbefd6e34f72d308cec10cebc738d5413b5e4f3d12a9cf *r58c/B/tests/fake_docker.sh
68cb6a7e1a7ae30c40e79e9986aef41ade16f53d4180e1eeeb864bf4efbadae5 *r58c/B/tests/kt_inner.sh
ec0ed772d58f1798e8895e7b73d323735d665f8fa5388552c7c50b1b8cb0f073 *r58c/B/tests/role.sh
2435812ae90e595d6903311d95b2f602ed115d8e73af57079af9416467f4ba96 *r58c/B/tests/test_freeze_check.sh
f6c1254893643c3572f6d313131ab057c4ddfe43665150fbc64bead0a3848d9a *r58c/B/tests/test_item27_trc.py
337a31910068c6c759267e9cdfd2ff77b7f2a5d989816db25670e71ad6ce0d7f *r58c/B/tests/test_memgate_empty.sh
6d23ae46535a7373164f6b18b82a652de9a06eb830e3684d6527b420ca4696e9 *r58c/B/tests/test_mounts_vs_leak_audit.py
3fd066f042f4d06241535fa0dde006e2869aabd2008a33d04b6f7d41057dd5d8 *r58c/B/tests/test_race_gate.sh
78b7756557174040de7c8efd28e04add664416989b6f16501d7510ed6e92011a *r58c/B/tests/test_wr_refuses_test_return.py
d8a87afe7b4e3e78420cc3afb8ab7f16b737d966efd16ff8206f2b96eb2909a8 *r58c/B/tests/test_wrapper_exit.sh
766d0cc75146443e310ec548011188511ecd56f5824ca52e62d44097ab998464 *r58c/B/tests/test_write_audit_claims.py
4dabe1674a3195713b82dae840f7cb6a9f42696f3a20c1e8e58104e031c423ea *r58c/B/tests/wr_rehearsal.sh
6afa97c00fb1a439ee4c2faa17d245a2aff57720fcd09f5893c90cf59e86ddfe *r58c/B/timing/make_full_copy.js
7964ed55b9945d3f7c38a85b99f4b3992075d8209704d7f4582a7f2e4ec27c76 *r58c/B/timing/time.sh
c056d382e82090a77966fc85be9fb423568f9552eef061f23043ed02dc08bbf1 *r58c/B/timing/time_item22.sh
7fd41d4a57681bb35d9b1eae2c6193ab5f5cb26b2d52b8da417b855a4955983e *r58c/B/timing/time_steps.py
bd1408a4500706dae320da3fc705350a909145a98f9fbf00f136b26f2564e4bc *r58c/write_audit_claims.py
5e19b395fbbe23410d305d498bbaef1758ed308cf389a89886481ef54be13745 *train/item27.py
```

## Round 3 (the coordinator's order after ruling 95), agent B, 2026-11-15

- ktest-b56 01:35Z exit 0: `selectB.py --test` then `report.py --test` as they are (`r58c/B/rehearsal/report_test.sh`,
  `KT_TRAIN_RW="selectB-test report"`); `train/report/test.json` d78f637f1f5ad271ad0a244c063f59ce078343267e3df9adc2829163bc033800,
  `test: true`; `r58c/B/REPORT-TEST-READY` written 01:36:09Z. Log `r58c/B/out/logs/report-test.log`.
- ktest-b57 01:44Z exit 0: the harness `r58c/B/rehearsal/tune_harness.py` (not report.main) on pick8 and
  `r58c/A/out/fakesel`; `r58c/handoff-test/report/tune.json` f8da1c6d6413aa460d0a095e77624acb9468545f2b96960d7af200f630e41644;
  `compare_rank.py`: the 96 cells of the grader's TEST tune-rank.json equal it (largest difference 0). Log
  `r58c/B/out/logs/tune-harness.log`.
- **ktest-b58 01:48Z exit 14: VOID** (the coordinator held 2e: the returns were graded from the old pick8 hand-offs,
  CONFLICTS.md note 18). Its log `r58c/B/out/logs/wr_rehearsal.log` is kept; it is not 2e's result. Nothing new in
  `grader-returns/test/` was opened after it.
- Ruling 95 in `r58c/write_audit_claims.py` (section 9 lists ktest-r5 and ktest-r6 with sha256, not its own ktest-r7;
  before bytes `r58c/B/pre-r95/`; test_write_audit_claims r95_*, ktest-b59). `lane_step.sh`: ktest-r4 `-m 4400m`
  (coordinator, round 3; before bytes `r58c/B/pre-r4mem/`). `ktest.sh`: `KT_TRAIN_RW` (before bytes `r58c/B/pre-ktrw/`).
- Reruns on agent A's leak_audit.py 0693c858...cc16: ktest-b59 (test_write_result), b60 (test_gate), b61
  (test_mounts_vs_leak_audit), all exit 0.
- Round 3, the coordinator's later orders (about 02:30Z):
  - `lane_step.sh`: ktest-r4 `-m 4g --memory-swap 4g` and ruling 79's start rule, free >= 6 GB AND commit < 38 GB
    (`MEM_R4`, `COMMIT_R4`); every other step keeps 1536m and commit < 40 GB; time limit 3600 s. Before bytes
    `r58c/B/pre-r4g/`. test_memgate_empty 33 checks, exit 0.
  - `freeze_list.sh`: a `# test output` block lists every file under train/report/ and train/selectB-test/ with sha256
    (`*.part` excluded); freeze_check checks it as block 1. Before bytes `r58c/B/pre-testout/`; test_freeze_check test 13.
  - END-ORDER: section 0 (r4 4g, the 38 GB rule, the shared lock), the limits row, step 3 (the new block, four
    blocks), reset (f) (no stale-lock removal while a ktest-G* runs or grader-running.txt exists).
  - CONFLICTS.md notes 20 (updated), 21 (tune_harness.py refuses six arms as it is), 22 (the lock; end_of_run.sh takes none).
  - New: `r58c/B/rehearsal/harness_tune.sh` (the harness alone; nothing under grader-returns/ read or hashed).
- 02:28Z ktest-b62 `harness_tune.sh` on the rebuilt fakesel (FAKESEL-READY 02:26:34Z, manifest 229cb87e): exit 1,
  tune_harness.py as it is refuses six arms (line 44). Not coded around; ROUND3-BLOCKED (CONFLICTS.md note 21).
  compare_rank not run (it reads grader-returns/test/tune-rank.json; left for 2e).
- Round 3, rulings 96 (c), 97 (b), (d), D1, E1 and the mount orders (03:30Z-05:30Z):
  - `train/write_result.py` 47d6223c...: ruling 96 (c)'s limit (r96_limit); ruling 97 as ONE limits bullet of three parts
    ((b) with the route audit's counts, (d) with the late-50 and held-out median pool sizes, D1 under (d)); real run
    refuses (exit 10) without the protocol texts or a real e5_route.json naming this item27.json. Worst case 149 lines.
    Before bytes `pre-r96/`, `pre-r97/`. `r58c/write_audit_claims.py`: claims for all of it, the E1 note in AUDIT.md
    section 1, ktest-r11 among the after-audit records (ruling 95), WRITE_RESULT_PIN 47d6223c...
  - New `r58c/B/e5_route_audit.py` (step 9.2a, ktest-r11; kge.route imported); mounts-B.json ktest-r11; lane_step.sh
    LIMIT_R11 1800 (stand-in 7.0 s, ktest-b83); freeze_list.sh lists the script. Tests: test_e5_route_audit.py (b80),
    test_write_result + test_write_audit_claims (b82), test_freeze_check 14 (host), test_mounts_vs_leak_audit (b86 failed
    on its own expectation only: ktest-r11 missing from the expected scope; added; b90).
  - 2e on the final writer bytes: ktest-b84 exit 0, result.json test true, returns bc2d56da / dc9bc94c / 67aa54c8,
    scorer files_sha256 ea50bfbd...; ktest-b85 compare_rank rc 0, 416 cells, largest difference 0.
  - `r58c/B/ktest.sh`: r58b/ only `pre` and `logs/test_verdict.log` (plus wr_rehearsal's two TEST records),
    grader-returns/ only for wr_rehearsal.sh and compare_only.sh (CONFLICTS.md note 27; before bytes `pre-kt58b/`;
    test_memgate_empty 40 checks; reruns b84-b89, all exit 0).
- 2026-11-15 ~05:30-05:55Z, ROUND4 (the Lead's two items):
  - Item 2 (ruling 94(d)): no real step reads `r58c/A/logs` (r7 included: its 2b/2e evidence is r58c/rehearsal/,
    heldout-launch/, r58c/B/out/rehearsal, r58c/B/out/logs). Removed from mounts-B.json ktest-r1..r4, r6..r9 (40 lines,
    mounts.js check ok) and from gen_mounts.js BASE; END-ORDER section 0 says so; CONFLICTS.md note 28; before bytes
    `pre-alogs/`. test_freeze_check case 15 (host, PASS); ktest-b91 test_mounts_vs_leak_audit PASS (waited on the lock
    for agent A's ktest-a47).
  - Item 1: END-ORDER 2a/2b from agent A's ROUND6 (the probe's renamed held-out-only relations, other-to-code,
    NEW_REL_FILE_SHARE 0.8; rehearse.sh's default arms E4 E5 E1 INJ, INJ's command chain as in rehearse.sh and
    rehearsal.py, its pass rule and no mid-run stop) and the card window's length (INJ stand-in 1,304.5 s, slowest
    setting 115.9 s big E5, RSS 1,603 MB, container 1,733 MB, card memory not measured; recomputed from
    r58c/A/out/inject_standin/*/inject_case.json). Still open: heldout.sh's staging check, A's tests off r58b/out/hstage,
    the root-file byte comparison (agent A's next report).
- 2026-11-15 ~06:00-06:25Z, ROUND5: END-ORDER 2b's pending lines from agent A's ROUND7 (rehearsal staging check exit 8,
  hstage removed, A's narrowed r58b mounts, the root-file comparison, leak_audit.py 6a2bf7f4); reruns on 6a2bf7f4:
  ktest-b92 test_mounts_vs_leak_audit PASS, ktest-b93 role_report p2 PASS; CONFLICTS.md note 29; r58c/FINAL-CHANGED.txt
  (both agents' files changed since END-ORDER 61d1c51e); r58c/B/ROUND5-DONE. Editing stopped.

- 2026-11-15 ~06:35-07:15Z, ROUND6 (ruling 98; the last edit round): lane_step.sh 2de011cd (step 9.1 verdict check,
  exit 10; before bytes r58c/B/pre-r98/lane_step.sh ad894853); train/write_result.py 53b629d1 (rulings 43 and 98 as one
  limits bullet, blank line after the limits heading dropped, 149 lines kept); r58c/write_audit_claims.py c7f2dda8
  (AUDIT.md section 7b caps from the guard log, the 43/98 claim, --progress/--guard-log test options, exit 36);
  tests: test_r10_verdict.sh (new), test_write_result.py e5ce5992, test_write_audit_claims.py b2648994. Host:
  test_freeze_check, test_memgate_empty, test_race_gate, test_r10_verdict all PASS (r58c/B/out/logs/*-r6.log).
  ktest-b94 role_report p2 PASS. Host dry count of the real guard log and progress file (counts only). END-ORDER
  rows 84 (r10 figure), 2c (c13/c16 picks), 2g (ruled; correction on 2e), 9.1, 9.3, 9.4, step 1 (ruling 98).
  CONFLICTS.md note 30. No 2e re-run (note 30 (e)). r58c/FINAL-CHANGED.txt regenerated; r58c/B/ROUND6-DONE.

- 2026-11-15 ~07:25-07:35Z, ROUND7 (END-ORDER and every FINAL-CHANGED file frozen; outputs, logs and records only):
  CONFLICTS.md note 30 (e) correction (dc9bc94c is the pick8 tune-item24 return; the late-50 return db31e7e9 left
  grader-returns/test/ at 02:48Z) and (f); ktest-b95 wr_rehearsal.sh (2e on write_result 53b629d1) exit 0; read-only
  listing of the leak_audit.json readers for the last revision (in the report); r58c/B/ROUND7-DONE.

## Round 8 (rulings 103, 104 and 105; changes C18-C50), agent B, 2026-11-15 about 09:40-11:20Z

- Before bytes: `r58c/B/pre-r103/` (ruling 103 work, C18-C28) and `r58c/B/pre-r104/` (C29-C48). Current bytes
  (sha256, first 8): rerun_check.sh ee79fd29, mounts.js a237cb3c, record_check.js 944429c7 (new), freeze_list.sh
  bba4e3ae, graph_rows.js ef14c710, lane_step.sh e063a905, ktest.sh 44274a69, e5_route_audit.py c4c5d7d2,
  r58c/write_audit_claims.py d299f772, orchestrator/end_of_run.sh 8bee89df; the TEST mounts file
  r58c/B/out/r103/test-mounts.json 03c72c9a.
- C21 (ruling 103(d)), the cause of the empty `train/selectB`: my own host look-up at 2026-11-15T08:13:00.744Z,
  `node r58c/B/mounts.js flags .../mounts-B.json ktest-r1`, while building KT_AS (no container); the old line 64 made
  every writable source on every call. The coordinator removed the folder with `rmdir` at 09:37:10Z (train/RUNLOG.md).
  Now only `flags ... --create` (a real launch: lane_step.sh real run, rerun_check.sh, end_of_run.sh) creates.
- C19 flags (ruling 103(b) with 104(b)), built on the host with `mounts.js flags` and no `--create`, no container:
  ktest-r4 real 45 rows / 10,752 characters, TEST 46 rows / 10,935 (3 rows left out of each, sources missing:
  tune_inputs/facts, tune_inputs/common, and the writable row: train/report/answer_level in the real list,
  r58c/B/out/r4test in the TEST list); ktest-r8 real 44 / 10,547,
  TEST 45 / 10,748; ktest-r9 real 77 / 18,749, TEST 78 / 18,976 (at least the real line, 104(b)). Windows limit 32,767.
  `graph_rows.js test-check` accepts all three TEST entries; the real mounts-B.json is refused (rc 3).
- Host tests, all exit 0 (logs `r58c/B/logs/`): test_memgate_cleanup PASS (3 checks; 09:48Z), test_memgate_empty PASS
  (40; 09:53Z), test_r10_verdict PASS (42, the C19/C21/C29/C45 cases; 10:05Z), test_kt_as PASS (15, C21/C26; 10:08Z),
  test_rerun_r103 PASS (8, ruling 103(a); 10:09Z), test_rerun_r101 PASS (7; 10:10Z), test_eor_lock PASS (8; 10:10Z),
  test_freeze_check PASS (86 lines 10:15Z; 88 with the two C42 lines, 10:31Z, `test_freeze_check.c42.log`).
  test_end_of_run (end_of_run.sh 8bee89df, C41/C48), test_race_gate and the containers ktest-b107
  (test_mounts_vs_leak_audit on leak_audit 8c53e487, test_e5_route_audit C31, test_gate) and ktest-b108 (role_report
  p2: test_write_result, test_write_audit_claims C43) were queued behind the lane lock; their results are under "Results" below.
- CONFLICTS.md notes 35 (2d's left-out tests), 36 (C49: where the held-out non-finite count goes) and 37 (the r8/r9
  TEST runs' names; the r4 TEST run waits for the tuning staging).

- C23 listing (2026-11-15T10:35Z; host, `node r58c/B/c23_listing.js LANE`: every `test_*` file under fixes/, parallel/, r58b/, r58c/, orchestrator/ and train/r58/tests outside pre*/, out/ and logs/, matched by folder and name against END-ORDER 2d; agent A's by bare name): files 82, named in 2d 54, left out 28.
  Named in 2d:
    fixes/tests/test_select_report.py   parallel/tests/test_assemble_checks.sh   r58c/A/test_heldout_mounts.sh   
  r58c/A/test_heldout_r101.sh   r58c/A/test_heldout_rehearsal_check.sh   r58c/A/test_inject_kinds.py   
  r58c/A/test_kt_inner.sh   r58c/A/test_ktest_race.sh   r58c/A/test_precheck_seed.py   r58c/A/test_probe_r97.py   
  r58c/A/test_probe_seq_r101.py   r58c/A/test_r101_real_lists.py   r58c/A/test_rehearsal_inj.py   
  r58c/A/test_rehearsal_negative.py   r58c/A/test_rehearse_inj.sh   r58c/A/test_rehearse_stop.sh   
  r58c/A/test_save_record_r104.sh   r58c/A/test_staging_blobs.sh   r58c/A/test_sums_filter.js   
  r58c/A/test_tune_staging.sh   r58c/B/eor/test_end_of_run.sh   r58c/B/eor/test_eor_lock.sh   
  r58c/B/tests/test_b_units.py   r58c/B/tests/test_e5_route_audit.py   r58c/B/tests/test_freeze_check.sh   
  r58c/B/tests/test_item27_trc.py   r58c/B/tests/test_kt_as.sh   r58c/B/tests/test_memgate_cleanup.sh   
  r58c/B/tests/test_memgate_empty.sh   r58c/B/tests/test_mounts_vs_leak_audit.py   r58c/B/tests/test_pass_paths.sh   
  r58c/B/tests/test_r10_verdict.sh   r58c/B/tests/test_race_gate.sh   r58c/B/tests/test_rerun_check.py   
  r58c/B/tests/test_rerun_r101.sh   r58c/B/tests/test_rerun_r103.sh   r58c/B/tests/test_sr6_guard.py   
  r58c/B/tests/test_tune_harness.py   r58c/B/tests/test_wr_refuses_test_return.py   r58c/B/tests/test_wrapper_exit.sh 
    r58c/B/tests/test_write_audit_claims.py   r58c/tests/test_r64.py   r58c/tests/test_selection_freeze8.py   
  train/r58/tests/test_answer_level.py   train/r58/tests/test_counts.py   train/r58/tests/test_gate.py   
  train/r58/tests/test_heldout.py   train/r58/tests/test_heldout_e4.py   train/r58/tests/test_item22.py   
  train/r58/tests/test_item27.py   train/r58/tests/test_leak_audit.py   train/r58/tests/test_probe.py   
  train/r58/tests/test_verdict.py   train/r58/tests/test_write_result.py 
  Left out, and why (CONFLICTS.md note 35):
  - fixes/tests/test_e5_equiv.py: (a) for a ruling: bytes a later step runs, unchanged since the release gate
  - fixes/tests/test_guard_host.sh: (b) stage A/B only, run over, code frozen
  - fixes/tests/test_ops_stageB.py: (b) stage A/B only, run over, code frozen
  - fixes/tests/test_r49_50_detail.py: (b) stage A/B only, run over, code frozen
  - fixes/tests/test_r49_52.py: (b) stage A/B only, run over, code frozen
  - fixes/tests/test_r53_58_unit.py: (a) for a ruling: bytes a later step runs, unchanged since the release gate
  - fixes/tests/test_r55.py: (b) stage A/B only, run over, code frozen
  - fixes/tests/test_r59.py: (b) stage A/B only, run over, code frozen
  - fixes/tests/test_r59_start.py: (b) stage A/B only, run over, code frozen
  - fixes/tests/test_r64.py: (a) for a ruling: bytes a later step runs, unchanged since the release gate
  - fixes/tests/test_r65_66.py: (b) stage A/B only, run over, code frozen
  - fixes/tests/test_rename.py: (b) stage A/B only, run over, code frozen
  - orchestrator/delta-review/test-rerun/test_end_of_run-r.sh: (c) a copy kept as a record
  - orchestrator/deltacheck/fixes/tests/test_r49_50_detail.py: (c) a copy kept as a record
  - orchestrator/deltacheck/fixes/tests/test_r49_52.py: (c) a copy kept as a record
  - orchestrator/deltacheck/fixes/tests/test_r53_58_unit.py: (c) a copy kept as a record
  - orchestrator/deltacheck/fixes/tests/test_r55.py: (c) a copy kept as a record
  - orchestrator/deltacheck/fixes/tests/test_r59.py: (c) a copy kept as a record
  - orchestrator/deltacheck/fixes/tests/test_r59_start.py: (c) a copy kept as a record
  - orchestrator/deltacheck/fixes/tests/test_rename.py: (c) a copy kept as a record
  - orchestrator/deltacheck/fixes/tests/test_select_report.py: (c) a copy kept as a record
  - parallel/tests/test_guard_stageAB.sh: (b) stage A/B only, run over, code frozen
  - parallel/tests/test_rerun_compare_host.sh: (b) stage A/B only, run over, code frozen
  - parallel/tests/test_rerun_driver.sh: (b) stage A/B only, run over, code frozen
  - parallel/tests/test_swap.sh: (b) stage A/B only, run over, code frozen
  - r58b/eor/test_end_of_run.sh: (c) a copy kept as a record
  - r58c/r92/test_guard_host_new.sh: (b) stage A/B only, run over, code frozen
  - r58c/r92/test_guard_host_old.sh: (b) stage A/B only, run over, code frozen

### Round 8, results and the last items (C49, C50), 2026-11-15 10:45-11:20Z

- Results (exit 0 each unless named): test_end_of_run PASS (43 checks, `r58c/B/logs/test_end_of_run.run.out`),
  test_race_gate PASS (22), test_memgate_empty PASS (40), test_rerun_r103 PASS (8), test_rerun_r101 PASS (7),
  test_eor_lock PASS (8); ktest-b107 (10:48:56-10:51:18Z): test_mounts_vs_leak_audit PASS (8 checks, leak_audit 8c53e487,
  ktest-eor in scope), test_e5_route_audit PASS (13), test_gate PASS; ktest-b108 role_report p2 (10:52:34-10:59:24Z) and
  the join: RESULT PASS report.
- C45, the TEST runs: ktest-r8 (`r58c/B/lane-steps/ktest-r8-20261115T101652Z.log`) PRECHECK PASS, 4 s, container peak
  107,368,448 bytes; ktest-r9 first run (`ktest-r9-20261115T102934Z.log`) rc 1, "2: no freeze sha256 given": my 2d
  command lacked the freeze hash (CONFLICTS.md note 38); again with `--freeze-sha256 049ba85b...` (the TEST record)
  (`ktest-r9-20261115T104953Z.log`, mount record `r58c/B/out/mounts-test/ktest-r9-20261115T104953Z.json` 33102af1)
  PRECHECK PASS, 3 s, container peak 35,123,200 bytes. TEST 78 rows against real 77 (7 the same, 71 TEST only, 70 real
  only). Both peaks far under 512 MB. The limits table of END-ORDER section 0 now has one row each (step 5, step 8).
- C49 (ruling 105(c)): it fits, and it is built. `train/write_result.py` cd2bd6f9 (before bytes
  `r58c/B/pre-r105/write_result.py`): optional coordinator line `nonfinite_heldout` {count, seeds, parents}; absent or 0
  prints nothing; above 0 one sentence on the ruling-97 bullet (no new line); another shape exit 10.
  `r58c/write_audit_claims.py` 0c21809b (before bytes `r58c/B/pre-r105/write_audit_claims.py`, and the first C49
  bytes 4f580d21 as `r58c/B/pre-r105/write_audit_claims.c49a.py`): two claim rows, and the anchor in the files table
  (b108 showed the rows citing "(no file: anchor)"; fixed, with a check that fails on 4f580d21). WRITE_RESULT_PIN
  cd2bd6f9. Tests: test_write_result 15a69951 (c49_absent_by_default, c49_count_above_0_one_sentence_worst_case_unchanged
  149 = 149, c49_count_0_prints_nothing, c49_wrong_shape_refuses_exit_10 [10,10,10,10,10],
  c49_fail_before_pre_r105_prints_nothing) and test_write_audit_claims a2b91f46 (c49_nonfinite_sentence_claims_found,
  c49_fail_before_pre_r105_has_no_claim_row, c49_claim_rows_cite_the_anchor_file, c49_fail_before_c49a_rows_have_no_file):
  ktest-b109 role_report p2 (11:03:19-11:10:26Z) PASS and the join RESULT PASS report. ktest-b110 wr_rehearsal (11:11:40-11:11:48Z, the 2e rehearsal on write_result cd2bd6f9) RESULT PASS 2e, RESULT.md 144 lines (no nonfinite_heldout line, as before).
- C50 (text): END-ORDER 2a, 2b, 7 (the 4g cap or a pre-freeze ruling's H1_CAP 4g/5g/6g, heldout.sh exit 8 otherwise,
  lines 54-58 of 7627c3e1), 2a (the card's three-unit figure from probe.json, A's 3,661 MB a CPU stand-in; near 3.5 GB
  is reported), 7 (the lock through step 7, lines 128-137), 2d/2e (the formal rebuild of the TEST record and the three
  TEST hand-offs, graded again). Agent A's ROUND10-DONE 10:51:32Z (heldout.sh 7627c3e1; test_h1cap_r105.sh).
- C23 listing again after ROUND10 (11:05Z): files 83, named in 2d 55 (adds `r58c/A/test_h1cap_r105.sh`), left out 28,
  the same 28 as above.
- CONFLICTS.md notes: 36 (C49; superseded the same day: built, line format for the coordinator to confirm), 38 (the r9
  TEST command).

### The C1-C50 table (`node r58c/B/c_table.js LANE`; file:line is the first line holding a fixed anchor string)

| item | owner | file:line | test log |
|---|---|---|---|
| C1 | B | r58c/B/graph_rows.js:6; orchestrator/END-ORDER.md:62 | r58c/A/logs/test_r101_real_lists.log; r4 TEST re-measure waits (note 37 b) |
| C2 | B | r58c/B/mounts-B.json:900; orchestrator/END-ORDER.md:816 | r58c/B/lane-steps/ktest-r8-20261115T101652Z.log; ktest-r9-20261115T104953Z.log |
| C3 | A | train/leak_audit.py:26; orchestrator/END-ORDER.md:990 | r58c/A/logs/test_r101_real_lists.log |
| C4 | B | r58c/B/freeze_list.sh:34; orchestrator/END-ORDER.md:716 | r58c/B/logs/test_freeze_check.c42.log (cases 17, 18) |
| C5 | B | orchestrator/END-ORDER.md:276 | text only |
| C6 | B | orchestrator/end_of_run.sh:157; orchestrator/END-ORDER.md:89 | r58c/B/logs/test_end_of_run.run.out (43 checks) |
| C7 | B | r58c/B/freeze_list.sh:61; orchestrator/END-ORDER.md:983 | r58c/B/logs/test_freeze_check.c42.log (case 16) |
| C8 | B | r58c/B/pass_paths.js:4; r58c/B/ktest.sh:44; orchestrator/END-ORDER.md:531 | r58c/B/logs/test_pass_paths.log; r58c/B/logs/test_kt_as.log |
| C9 | B | train/write_result.py:155; orchestrator/END-ORDER.md:1059 | r58c/B/out/logs/test_write_result.log |
| C10 | B | r58c/B/freeze_list.sh:62; orchestrator/END-ORDER.md:742 | r58c/B/logs/test_freeze_check.c42.log (case 16) |
| C11 | B | r58c/B/freeze_list.sh:48; orchestrator/END-ORDER.md:703 | r58c/B/logs/test_freeze_check.c42.log (cases 16, 18) |
| C12 | A | train/heldout.sh:95 | r58c/A/logs/test_heldout_r101.r104.log |
| C13 | A+B | train/heldout.py:811; orchestrator/END-ORDER.md:330; orchestrator/END-ORDER.md:922 | r58c/A/logs/test_probe_seq_r101.log |
| C14 | B | orchestrator/END-ORDER.md:510; r58c/B/TEST-QUEUE.md:119 | r58c/B/TEST-QUEUE.md q9-q20 |
| C15 | B+A | train/item27.py:36; train/answer_level.py:249 | r58c/B/out/logs/test_item27_trc.log; r58c/A/logs/test_answer_level.log |
| C16 | B+A | r58c/B/rerun_check.sh:14; r58c/B/lane_step.sh:14; r58c/B/freeze_list.sh:86; train/heldout.sh:128 | r58c/B/logs/test_rerun_r101.log; r58c/B/logs/test_r10_verdict.log; r58c/A/logs/test_heldout_r101.r104.log |
| C17 | B | train/selectB.py:101; train/write_result.py:612 | r58c/B/out/logs/test_sr6_guard.log; r58c/B/out/logs/test_write_result.log |
| C18 | B | r58c/B/rerun_check.sh:25; orchestrator/END-ORDER.md:465 | r58c/B/logs/test_rerun_r103.log |
| C19 | B | r58c/B/graph_rows.js:16; r58c/B/lane_step.sh:111; orchestrator/END-ORDER.md:78 | r58c/B/logs/test_r10_verdict.log |
| C20 | A | train/leak_audit.py:462; orchestrator/END-ORDER.md:992 | r58c/A/logs/test_r101_real_lists.log; r58c/B/out/logs/test_mounts_vs_leak_audit.log |
| C21 | B | r58c/B/mounts.js:13; r58c/B/freeze_list.sh:37; orchestrator/END-ORDER.md:49 | r58c/B/logs/test_freeze_check.c42.log (9b, 19); r58c/B/logs/test_kt_as.log; r58c/B/logs/test_r10_verdict.log |
| C22 | B | orchestrator/END-ORDER.md:330 | text only |
| C23 | B | orchestrator/END-ORDER.md:518; r58c/B/RUNLOG-B.md:277 | r58c/B/c23_listing.js (host) |
| C24 | B+A | orchestrator/END-ORDER.md:997; train/leak_audit.py:568 | r58c/A/logs/test_r101_real_lists.log |
| C25 | B | orchestrator/END-ORDER.md:162; orchestrator/END-ORDER.md:761 | text only (timed at step 3) |
| C26 | B | r58c/B/ktest.sh:105 | r58c/B/logs/test_kt_as.log |
| C27 | B | orchestrator/END-ORDER.md:764 | text only |
| C28 | B | r58c/B/record_check.js:2; r58c/B/freeze_list.sh:23; orchestrator/END-ORDER.md:165 | r58c/B/logs/test_freeze_check.c42.log (case 20) |
| C29 | B | r58c/B/lane_step.sh:83; r58c/B/graph_rows.js:27; orchestrator/END-ORDER.md:73 | r58c/B/logs/test_r10_verdict.log |
| C30 | B | orchestrator/END-ORDER.md:630; orchestrator/END-ORDER.md:559 | text only |
| C31 | B | r58c/B/e5_route_audit.py:58; orchestrator/END-ORDER.md:1038 | r58c/B/out/logs/test_e5_route_audit.log |
| C32 | B | orchestrator/END-ORDER.md:356; orchestrator/END-ORDER.md:647; orchestrator/END-ORDER.md:708 | text only |
| C33 | B | orchestrator/END-ORDER.md:213; orchestrator/END-ORDER.md:912 | text only |
| C34 | B | orchestrator/END-ORDER.md:1093 | text only |
| C35 | B | r58c/B/freeze_list.sh:59; orchestrator/END-ORDER.md:729 | r58c/B/logs/test_freeze_check.c42.log (case 35) |
| C36 | A | train/heldout.sh:81; orchestrator/END-ORDER.md:907 | r58c/A/logs/test_save_record_r104.log |
| C37 | B | orchestrator/END-ORDER.md:922 | text only |
| C38 | B | orchestrator/END-ORDER.md:221 | text only |
| C39 | B | r58c/B/lane_step.sh:23; orchestrator/END-ORDER.md:121 | r58c/B/logs/test_r10_verdict.log |
| C40 | B | orchestrator/END-ORDER.md:861 | text only |
| C41 | B | orchestrator/end_of_run.sh:27; orchestrator/END-ORDER.md:250 | r58c/B/logs/test_end_of_run.run.out (43 checks) |
| C42 | A | r58c/A/mounts-A.json:124; orchestrator/END-ORDER.md:103 | r58c/A/logs/test_heldout_mounts.r104.log; r58c/B/logs/test_freeze_check.c42.log (case 15) |
| C43 | B | r58c/write_audit_claims.py:557; orchestrator/END-ORDER.md:1132 | r58c/B/out/logs/test_write_audit_claims.log |
| C44 | B | orchestrator/END-ORDER.md:1158 | text only |
| C45 | B | r58c/B/lane_step.sh:57; orchestrator/END-ORDER.md:144 | r58c/B/lane-steps/ktest-r8-20261115T101652Z.log; r58c/B/lane-steps/ktest-r9-20261115T104953Z.log |
| C46 | A | train/heldout.py:23; orchestrator/END-ORDER.md:874 | text only |
| C47 | B | orchestrator/END-ORDER.md:274 | text only |
| C48 | B | r58c/B/lane_step.sh:7; r58c/B/rerun_check.sh:59; orchestrator/end_of_run.sh:156 | r58c/B/logs/test_kt_as.log; r58c/B/logs/test_end_of_run.run.out (43 checks) |
| C49 | B | orchestrator/END-ORDER.md:284; orchestrator/END-ORDER.md:949; orchestrator/END-ORDER.md:1079; train/write_result.py:401; r58c/write_audit_claims.py:479; r58c/B/CONFLICTS.md:345 | r58c/B/out/logs/test_write_result.log; r58c/B/out/logs/test_write_audit_claims.log (role_report p2, ktest-b109); r58c/B/out/logs/wr_rehearsal.log (ktest-b110) |
| C50 | A+B | train/heldout.sh:54; orchestrator/END-ORDER.md:344; orchestrator/END-ORDER.md:350; orchestrator/END-ORDER.md:898; orchestrator/END-ORDER.md:566 | r58c/A/logs/test_h1cap_r105.log (agent A, RUNLOG-A ROUND10); END-ORDER text |

### Round 8, final hashes of agent B's listed files (2026-11-15T11:13:44Z; sha256sum form, the bytes FINAL-CHANGED lists)

```
ad45731a46d6b9fb8c7049adf64e7b2bac175de97c55243c410a3dc6a3d17ac4 *orchestrator/END-ORDER.md
8bee89df284113f97bfa54d555524a3d135b12255956bcf3b12d0f0a40c162d1 *orchestrator/end_of_run.sh
52e9ef173e761559a5fe833798019efc19f0e53284c1b56814b16074f16e6b9e *r58c/B/INTERFACE-for-A.md
35bf52f2f7e602b7dd9377d52ab38d206034a5474b124fa42ac1b0c96f3466c5 *r58c/B/c23_listing.js
4ca704ddeed17eceb24b1ede73f961070393ff1b699c42c5a16b13abca7556da *r58c/B/c_table.js
c4c5d7d245954d8ff12980397be0f58b78d4d0a47cc4279dfcef95174dd238d7 *r58c/B/e5_route_audit.py
587fcb47cffd54bbecaf556ea644126ead296761242dcc01c9b9b0097864a151 *r58c/B/eor/fake_docker_eor.sh
bd5c670aa6d503652e271ccf4c4ad0c1f809df826e7ba3ce4620cf4cf0bc6641 *r58c/B/eor/make_copy.js
6c46497f63d4b95f05b6eec452ced80ac9b17fa9f12396b583a9288f0d55c474 *r58c/B/eor/test_end_of_run.sh
db44e78c27c91ec1d0fd7d8cfe62b3ac03ff7de88024014c346149cfa73cbd8c *r58c/B/eor/test_eor_lock.sh
587b01d7b72d4ac62b23b6c49cd8faac60605426b633b0caeef7a01350f29cee *r58c/B/freeze_check.sh
bba4e3aee8211b0274f1311e2eaf43024c047cea8196aa9a98c4c1c5828f1aca *r58c/B/freeze_list.sh
2ef204300f9537dc91ad96aa51310364829a55b61880a490ed8e0c321257c590 *r58c/B/gen_mounts.js
ef14c7106b588d3bd8031254642db647388d65fa763343fc6450df955d13ac79 *r58c/B/graph_rows.js
44274a695eaf6a34d365216dc78478244ce0d2ea0275670584b8a557973cca04 *r58c/B/ktest.sh
e063a905316c2a673b94dd0b575c2ab9447f698f097e0e5251640b57b438794a *r58c/B/lane_step.sh
46ec08eef6e5ac62d6698d7e5204c6dfa4bcf24d4819a2b6c7ae8ad27af30880 *r58c/B/mounts-B.json
a237cb3c731262866f73310b9347ded6348098750edc680bfd6d774e275d0538 *r58c/B/mounts.js
03c72c9ac49b0c65729194186ee00064e8ded9db6df97d1eaafd3509a77a656d *r58c/B/out/r103/test-mounts.json
d0c95c57722de4b603ddcf40caa5d90fff7f8734fc95d93580e85b134c378ebf *r58c/B/pass_paths.js
0b8ad655b6c7155587b8a6b3a109ee3e449c7a5fc702bb41e6324c28a5b5f169 *r58c/B/patch_r94_freeze.js
b718d8efd82bda8b91b751b2bfa71b22b30c771838c54ef9f8ce22fb854a3dde *r58c/B/patch_r94_tests.js
2c3ffa67a3175d55348689b1d656f5efb997817062a10bc22ac445d5c82a3cc9 *r58c/B/patch_r94_wac.js
a9ed223f209b2c10bf03a49e14ec31bb7b07366c3e99d3935edaae2c7de0f522 *r58c/B/patch_r94b.js
65d0de36803f12d0d61fb28da1caf145e67172d3f6f0b3e76fde5f58ad7972c7 *r58c/B/race_gate.sh
944429c7aa0c88a03ae9d19fb36353d1da87aab72e4210fa92c276b984a21057 *r58c/B/record_check.js
2a6d4c438947eca18b76e29417f57bef466051f2751f67568705b5a7a676182b *r58c/B/rehearsal/compare_only.sh
b3ea63de379235b1ed8208bf0f654b011ca79e2b2c2213e684bcd4db7b7d5a4d *r58c/B/rehearsal/compare_rank.py
979f8f563f6a15384f25bdc89a85998f0991ca0b755b3d901646526ecadcff9e *r58c/B/rehearsal/harness.sh
326c571b832d4c4fb22a3c91771287bbcfd247ca7dfaa9a0873f2fdacb7c5c14 *r58c/B/rehearsal/harness_tune.sh
0348585638e0bb67b7a6acc34d9baaca131cb9655401f6bf5be57ed4f399faa0 *r58c/B/rehearsal/report_test.sh
f91bc8c25d8315f1abaf8af8bb0eb96f7976d50b88701d7ae92e36bc8e828cf9 *r58c/B/rehearsal/tune_harness.py
ee79fd29e3c1c2abf650f62dae7cf53ad01bad619818e4118d7521fd860a823d *r58c/B/rerun_check.sh
fb431cfaa64f6ce070b69589c01d0240b1ce9860a8b6742fc7fea257c76cfcd7 *r58c/B/tests/dry_guard.py
ac5dc031d8d76be39ddbefd6e34f72d308cec10cebc738d5413b5e4f3d12a9cf *r58c/B/tests/fake_docker.sh
eb61c76d5f5c2da1bdbccb9ef23b976b7034d7737315413c07d4d795a338e81c *r58c/B/tests/kt_inner.sh
ec0ed772d58f1798e8895e7b73d323735d665f8fa5388552c7c50b1b8cb0f073 *r58c/B/tests/role.sh
988cf2b60af747037fde4d62757916ba6c3b0c74d8627568b6bea043b01224d4 *r58c/B/tests/test_e5_route_audit.py
58f38985437b4b8dfc2e5175efcdcd326ec15732b6682ac2f2827cf785fbee43 *r58c/B/tests/test_freeze_check.sh
74583933c6ca7c7187ba8cd9d6201b34e834f83be6d96faa0f565faf2e1c43bb *r58c/B/tests/test_item27_trc.py
581a13d939c63fc96baac81997a8d4a3e17ac16002b25ddbd14cc287ea823344 *r58c/B/tests/test_kt_as.sh
2333242900acf231e51c85bcdbd6c97bedbe22717f98528d8b9b7a4d1bbcfa6e *r58c/B/tests/test_memgate_cleanup.sh
d02b5ebfb89737f6fe08dc67e74442c99d780fc4c16c3653930119847713ce48 *r58c/B/tests/test_memgate_empty.sh
4b487eeb5ac101396d74ec5180863825ee6230b8e9785045bdcd3d9fbd76d972 *r58c/B/tests/test_mounts_vs_leak_audit.py
b52b2b528ed1a40431379bbffaed8402b1ad3e69ba30182c5e545c8d90c9046f *r58c/B/tests/test_pass_paths.sh
798532b4b1b8af917b163d41fffc254015c6a8ca5f2015908dde63b81adeeb0a *r58c/B/tests/test_r10_verdict.sh
3fd066f042f4d06241535fa0dde006e2869aabd2008a33d04b6f7d41057dd5d8 *r58c/B/tests/test_race_gate.sh
3ddf3140108200f031c40851c5682e9790ddee771e7bbd9ef5a8d450420dc143 *r58c/B/tests/test_rerun_r101.sh
fd6847a06d06a4cefa83c144d1a4d5288a9a4632363e9e5fa4eca1a3d8f0fe57 *r58c/B/tests/test_rerun_r103.sh
87f48d2bc28fc3c86cc6419c64be10241f2ae38e8edf9383850039a63081c68d *r58c/B/tests/test_sr6_guard.py
dea18e3ccf97b7f9b0cafd74cd2c915089ccfbbf611e95fd8058e0e4c7d36d9c *r58c/B/tests/test_tune_harness.py
78b7756557174040de7c8efd28e04add664416989b6f16501d7510ed6e92011a *r58c/B/tests/test_wr_refuses_test_return.py
d8a87afe7b4e3e78420cc3afb8ab7f16b737d966efd16ff8206f2b96eb2909a8 *r58c/B/tests/test_wrapper_exit.sh
a2b91f46511fa7b7c50dbb495db4b22ed347ab260f44ef8da19841acc38fdbdf *r58c/B/tests/test_write_audit_claims.py
4dabe1674a3195713b82dae840f7cb6a9f42696f3a20c1e8e58104e031c423ea *r58c/B/tests/wr_rehearsal.sh
6afa97c00fb1a439ee4c2faa17d245a2aff57720fcd09f5893c90cf59e86ddfe *r58c/B/timing/make_full_copy.js
adc4ea39375d66dafcd3805ef2d3c718093bf946ebaa2567f141414af9df2aef *r58c/B/timing/mem.sh
6d461c5e5f69e5f1ddb4fbb8168d6ae0f8970c7bd570deebeb10c9e605c7e329 *r58c/B/timing/mem_run.py
7964ed55b9945d3f7c38a85b99f4b3992075d8209704d7f4582a7f2e4ec27c76 *r58c/B/timing/time.sh
c056d382e82090a77966fc85be9fb423568f9552eef061f23043ed02dc08bbf1 *r58c/B/timing/time_item22.sh
6528f55bec6db24564f8879df66be253aa34047087251b7ac290f2a7a611b7d4 *r58c/B/timing/time_r11.py
f8341f68ceb4e750ed3a5ffe08d4aa0cf2586e234ab8815e44d44256a3ad059b *r58c/B/timing/time_r11.sh
7fd41d4a57681bb35d9b1eae2c6193ab5f5cb26b2d52b8da417b855a4955983e *r58c/B/timing/time_steps.py
5f6fdcea4a3bc537b68c3fd97ed31b3437a1a8b83bf83caf9c5f2aef766a94d8 *r58c/handoff-test/report/tune.json
0c21809bdf319a671e3852881ed46982f1480c6f0769695c683c2aba9407ac02 *r58c/write_audit_claims.py
5406fd622fff079ac3585be4830c18f70cd9182cfa91649a57d427a2fd566357 *train/item27.py
15a69951984044b9f4056c574fc25c50052e64190e6b3886bb6ad457920455cc *train/r58/tests/test_write_result.py
d54cb864e38f9ed35a0fb03150cec5a4f8ab08d6ae6a45634578e3d0f815b885 *train/selectB.py
cd2bd6f95e1c1afdb67e161af7fdc27b101a86867864c9e17907d98dc49a0f1b *train/write_result.py
```
