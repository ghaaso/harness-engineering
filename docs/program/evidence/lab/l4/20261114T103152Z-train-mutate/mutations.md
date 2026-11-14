Baseline (the paired normal run): `20261114T100259Z-train`

| Id | Kind of check | Mutation | Target row | Wanted | Got | Baseline | Applied | Caught |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T01 | a ref on the (stand-in) remote | the re-cut tag never reached origin | `release-drain|11.13` | FAILED | FAILED | DONE | yes | yes |
| T02 | an API item of a train row's check | the 'closed job' handed to P7a's check is open | `train|P7a` | FAIL | FAIL | PASS | yes | yes |
| T03 | the applied head against CLAUDE.md | the database is one migration behind CLAUDE.md | `train|12.4` | FAILED | FAILED | DONE | yes | yes |
| T04 | the image tag a build must leave | the build left no fixflow/backend:<TARGET> tag | `train|R5.5` | FAILED | FAILED | DONE | yes | yes |
| T05 | the shape guard (a line inserted into a typed block) | a runbook edit inserts a line into 11.14 | `train|11.14` | MOVED | MOVED | DONE | yes | yes |
