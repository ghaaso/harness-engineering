## Leak audit (addendum 8 item 18, ruling 60)

Written by train/leak_audit.py 2026-11-14T16:02:04.949514Z; s = 1, plan_hash 71116daa652f5272a577a5b3f16c90d41bb64e08c7cfdad2820e18713f5ceb70. Checked from the raw facts cache (commits.jsonl) and git.
c1 task commit not in C's history (tune: by sha; both splits: every raw commit of C is P or a git ancestor of P); c2 ruling 49 (C = P, or git ancestor with a raw-history subset); c3 C not later than P (ruling 50 order).

| split | checkpoint | tasks | parents | C = P | c1 | c2 | c3 |
|---|---|---|---|---|---|---|---|
| tune | 2fa68134d22d | 3 | 1 | 3 | 3 | 3 | 3 |
| tune | 8b506c0dac14 | 6 | 1 | 6 | 6 | 6 | 6 |
| tune | 957f69c6163c | 3 | 1 | 3 | 3 | 3 | 3 |
| tune | bab61a000a0d | 6 | 1 | 6 | 6 | 6 | 6 |
| tune | 1ff40626e7e7 | 3 | 1 | 3 | 3 | 3 | 3 |
| tune | e6f60ae7c7f5 | 9 | 1 | 9 | 9 | 9 | 9 |
| tune | 0476b6e4a871 | 8 | 1 | 8 | 8 | 8 | 8 |
| tune | 82866932d1d1 | 3 | 1 | 3 | 3 | 3 | 3 |
| tune | c55c6cd3a0bf | 9 | 1 | 9 | 9 | 9 | 9 |
| tune | 47004d15521e | 2 | 1 | 2 | 2 | 2 | 2 |
| tune | 7766ca7a0ca5 | 2 | 1 | 2 | 2 | 2 | 2 |
| tune | 45713b7ff308 | 8 | 1 | 8 | 8 | 8 | 8 |
| tune | dc831a9616f1 | 6 | 1 | 6 | 6 | 6 | 6 |
| tune | a2b4daa3d834 | 2 | 1 | 2 | 2 | 2 | 2 |
| tune | cd806c803c4a | 5 | 1 | 5 | 5 | 5 | 5 |
| tune | df61262aacfd | 5 | 1 | 5 | 5 | 5 | 5 |
| tune | ec1b5dfb5af0 | 5 | 1 | 5 | 5 | 5 | 5 |
| tune | 2cff6332bae9 | 2 | 1 | 2 | 2 | 2 | 2 |
| tune | b87058f23701 | 6 | 1 | 6 | 6 | 6 | 6 |
| tune | 65a83c41667e | 2 | 1 | 2 | 2 | 2 | 2 |
| tune | f593b73d789d | 7 | 1 | 7 | 7 | 7 | 7 |
| tune | d96a8dabd82d | 9 | 1 | 9 | 9 | 9 | 9 |
| tune | d26c2b056044 | 8 | 1 | 8 | 8 | 8 | 8 |
| tune | 2920d3d96000 | 3 | 1 | 3 | 3 | 3 | 3 |
| tune | a9ad236e04ac | 6 | 1 | 6 | 6 | 6 | 6 |
| tune | 1c6b380205c5 | 7 | 1 | 7 | 7 | 7 | 7 |
| tune | 8a80e31563cf | 12 | 1 | 12 | 12 | 12 | 12 |
| tune | c8c7cfc43720 | 16 | 1 | 16 | 16 | 16 | 16 |
| tune | cc857d357a6d | 5 | 1 | 5 | 5 | 5 | 5 |
| tune | 3d5378ef0a0c | 7 | 1 | 7 | 7 | 7 | 7 |
| tune | 040c21b83aea | 3 | 1 | 3 | 3 | 3 | 3 |
| tune | 8f33e2448a1d | 5 | 1 | 5 | 5 | 5 | 5 |
| tune | c89e021f3149 | 7 | 1 | 7 | 7 | 7 | 7 |
| tune | 9647afdaca18 | 4 | 1 | 4 | 4 | 4 | 4 |
| tune | f117fb3c34b7 | 3 | 1 | 3 | 3 | 3 | 3 |
| tune | d40de52eaef6 | 9 | 1 | 9 | 9 | 9 | 9 |
| tune | 0a0a297908f8 | 3 | 1 | 3 | 3 | 3 | 3 |
| tune | bbded3a274ab | 18 | 1 | 18 | 18 | 18 | 18 |
| tune | 9d8961594ba5 | 5 | 1 | 5 | 5 | 5 | 5 |
| tune | d310349868c9 | 9 | 1 | 9 | 9 | 9 | 9 |
| tune | f94ede296b4c | 27 | 1 | 27 | 27 | 27 | 27 |
| tune | c293916e5d81 | 22 | 1 | 22 | 22 | 22 | 22 |
| tune | 89d41d69aef7 | 11 | 1 | 11 | 11 | 11 | 11 |
| tune | dfe87430ac1b | 4 | 1 | 4 | 4 | 4 | 4 |
| tune | 64adbdd06dd8 | 2 | 1 | 2 | 2 | 2 | 2 |
| tune | 31ac1ebae55b | 21 | 1 | 21 | 21 | 21 | 21 |
| tune | 02b9557c6bee | 2 | 1 | 2 | 2 | 2 | 2 |
| tune | 1a92ea23aa09 | 17 | 1 | 17 | 17 | 17 | 17 |
| tune | b2c981e7be8a | 11 | 1 | 11 | 11 | 11 | 11 |
| tune | ba2b9651515c | 2 | 1 | 2 | 2 | 2 | 2 |
| tune | ded44c816b7e | 12 | 1 | 12 | 12 | 12 | 12 |
| tune | 99df571683a6 | 3 | 1 | 3 | 3 | 3 | 3 |
| tune | 7b3a74528189 | 13 | 1 | 13 | 13 | 13 | 13 |
| heldout | cdf04549269a | 2 | 1 | 2 | 2 | 2 | 2 |
| heldout | 00c0a1f7c319 | 10 | 1 | 10 | 10 | 10 | 10 |
| heldout | 1bb2276b4028 | 8 | 1 | 8 | 8 | 8 | 8 |
| heldout | 4f28f33f1ab2 | 7 | 1 | 7 | 7 | 7 | 7 |
| heldout | b3e7c518e654 | 9 | 1 | 9 | 9 | 9 | 9 |
| heldout | eddc5c6a216c | 3 | 1 | 3 | 3 | 3 | 3 |
| heldout | edcf8f30ac07 | 9 | 1 | 9 | 9 | 9 | 9 |
| heldout | 436e18096082 | 9 | 1 | 9 | 9 | 9 | 9 |
| heldout | 157158eb8b84 | 6 | 1 | 6 | 6 | 6 | 6 |
| heldout | 9712da443a04 | 3 | 1 | 3 | 3 | 3 | 3 |
| heldout | 76061e00d177 | 2 | 1 | 2 | 2 | 2 | 2 |
| heldout | 028721d0c76f | 4 | 1 | 4 | 4 | 4 | 4 |
| heldout | c99e6b0172b1 | 12 | 1 | 12 | 12 | 12 | 12 |
| heldout | 3892b6208e41 | 7 | 1 | 7 | 7 | 7 | 7 |
| heldout | a60a0a696389 | 7 | 1 | 7 | 7 | 7 | 7 |
| heldout | c27bb399279f | 4 | 1 | 4 | 4 | 4 | 4 |
| heldout | 76525fbfba84 | 6 | 1 | 6 | 6 | 6 | 6 |
| heldout | 5f44fac522b8 | 5 | 1 | 5 | 5 | 5 | 5 |
| heldout | 5356305eb53b | 3 | 1 | 3 | 3 | 3 | 3 |
| heldout | 8d4a7981766d | 3 | 1 | 3 | 3 | 3 | 3 |
| heldout | c1eb31b8975a | 3 | 1 | 3 | 3 | 3 | 3 |
| heldout | 80746425dff6 | 12 | 1 | 12 | 12 | 12 | 12 |
| heldout | c3754ddec989 | 2 | 1 | 2 | 2 | 2 | 2 |
| heldout | 6ad09848b33a | 3 | 1 | 3 | 3 | 3 | 3 |
| heldout | 963776a7739f | 5 | 1 | 5 | 5 | 5 | 5 |
| heldout | 74098bbd47d2 | 5 | 1 | 5 | 5 | 5 | 5 |
| heldout | d03f2773b4ee | 3 | 1 | 3 | 3 | 3 | 3 |
| heldout | 9365c23715bd | 4 | 1 | 4 | 4 | 4 | 4 |
| heldout | a855d552716c | 5 | 1 | 5 | 5 | 5 | 5 |
| heldout | 414da6526799 | 2 | 1 | 2 | 2 | 2 | 2 |
| heldout | 9bffc57c09d1 | 5 | 1 | 5 | 5 | 5 | 5 |
| heldout | f57288f1f9a1 | 4 | 1 | 4 | 4 | 4 | 4 |
| heldout | 83d80e8516b0 | 2 | 1 | 2 | 2 | 2 | 2 |
| heldout | 7133e9e011eb | 9 | 1 | 9 | 9 | 9 | 9 |
| heldout | 30e90887e06b | 17 | 1 | 17 | 17 | 17 | 17 |
| heldout | 5616f1764142 | 10 | 1 | 10 | 10 | 10 | 10 |
| heldout | 6c2ef8248d94 | 6 | 1 | 6 | 6 | 6 | 6 |
| heldout | a440db383ccb | 2 | 1 | 2 | 2 | 2 | 2 |
| heldout | 01ac9e84d3bb | 6 | 1 | 6 | 6 | 6 | 6 |
| heldout | 7b395a5dc9d9 | 4 | 1 | 4 | 4 | 4 | 4 |
| heldout | e5f93471dce7 | 4 | 1 | 4 | 4 | 4 | 4 |
| heldout | 4953f1a8df8f | 2 | 1 | 2 | 2 | 2 | 2 |
| heldout | f1ee0c5b4111 | 10 | 1 | 10 | 10 | 10 | 10 |
| heldout | 9e22a61ad46d | 6 | 1 | 6 | 6 | 6 | 6 |
| heldout | ed309767a24f | 5 | 1 | 5 | 5 | 5 | 5 |
| heldout | 789d522079fb | 7 | 1 | 7 | 7 | 7 | 7 |
| heldout | 34b5dd6b5593 | 3 | 1 | 3 | 3 | 3 | 3 |
| heldout | 275a4945dab0 | 3 | 1 | 3 | 3 | 3 | 3 |
| heldout | 19c93443811d | 2 | 1 | 2 | 2 | 2 | 2 |
| heldout | f286ec634c35 | 3 | 1 | 3 | 3 | 3 | 3 |
| heldout | 7b2e4646aa1e | 2 | 1 | 2 | 2 | 2 | 2 |
| heldout | 109da0393eb4 | 6 | 1 | 6 | 6 | 6 | 6 |
| heldout | 383dea747472 | 5 | 1 | 5 | 5 | 5 | 5 |
| heldout | 6cd54ed2a66f | 3 | 1 | 3 | 3 | 3 | 3 |
| heldout | 5dd258aaeb52 | 8 | 1 | 8 | 8 | 8 | 8 |
| heldout | b71a3999b94b | 20 | 1 | 20 | 20 | 20 | 20 |
| heldout | 8fb7d33535dd | 3 | 1 | 3 | 3 | 3 | 3 |
| heldout | 19e80c01f5ab | 17 | 1 | 17 | 17 | 17 | 17 |
| heldout | 26c9f1edbb91 | 7 | 1 | 7 | 7 | 7 | 7 |
| heldout | 7d567c7bbc04 | 3 | 1 | 3 | 3 | 3 | 3 |
| heldout | 10be6cca7599 | 6 | 1 | 6 | 6 | 6 | 6 |
| heldout | 7006d5a38dd7 | 6 | 1 | 6 | 6 | 6 | 6 |
| heldout | f4b9ad99c34a | 8 | 1 | 8 | 8 | 8 | 8 |
| heldout | 3fff69e0d977 | 9 | 1 | 9 | 9 | 9 | 9 |
| heldout | 370e83a8a39d | 7 | 1 | 7 | 7 | 7 | 7 |
| heldout | 2fe77f52c4ab | 6 | 1 | 6 | 6 | 6 | 6 |
| heldout | da9d2f36fea0 | 9 | 1 | 9 | 9 | 9 | 9 |
| heldout | c79bec77a7c5 | 4 | 1 | 4 | 4 | 4 | 4 |
| heldout | 1c546a31060d | 14 | 1 | 14 | 14 | 14 | 14 |
| heldout | 2c7f91e18293 | 2 | 1 | 2 | 2 | 2 | 2 |

Totals: tune 53 checkpoints, 388 tasks; heldout 70 checkpoints, 418 tasks; parts rows placed on their planned checkpoint 629 of 629.

| mount (script:line or inspect) | container | host source | class | ok |
|---|---|---|---|---|
| fake-heldout.sh:2 | held-out | C:/x/hb/graph2/build/sealed/refs | heldout_truth (C:/x/hb/graph2/build/sealed/refs) | NO |
| fake-heldout.sh:2 | held-out | C:/x/hb/graph2/build/tasks/tasks.jsonl | clean | yes |
| inspect-kge-B1.json | stage B / tuning | 4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/eval | tune_truth (eval/tune_commits.jsonl, eval/tune_tasks.jsonl, eval/git/june_namestatus.txt) | yes |
| inspect-kge-B1.json | stage B / tuning | ea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/export | clean | yes |
| inspect-kge-B1.json | stage B / tuning | aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/train | clean | yes |

Training code (train/kge.py) opens no task or truth file: yes.
Failures: 1. First: {"mount": {"source": "fake-heldout.sh:2", "host": "C:/x/hb/graph2/build/sealed/refs", "dest": "/s:ro", "container": "held-out", "cls": "heldout_truth", "files": ["C:/x/hb/graph2/build/sealed/refs"], "ok": false}}

Ruling 35 (disclosure): while building the evaluation core, one builder's look at a temp file showed the names of files in two held-out commits (dated 2026-08-03). No truth was computed or used from it; tuning truth came from git for the June commits only.
