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
report.main 121.10 s (ktest-b49); item22 325 s (ktest-b48). Answer_level and the leak audit are agent A's (PENDING).

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
