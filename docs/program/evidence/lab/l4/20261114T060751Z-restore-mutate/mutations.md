Baseline (the paired normal run): `baseline`

| Id | Kind of check | Mutation | Target row | Wanted | Got | Baseline | Applied | Caught |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M01 | exact output against the Expected in full | 1.12's Check reads another path | `restore|1.12` | FAILED | FAILED | DONE | yes | yes |
| M02 | exit code the command prints | 4.1's config call fails | `restore|4.1` | FAILED | FAILED | DONE | yes | yes |
| M03 | count of matching listing lines | 3.1 installs the env files group-readable | `restore|3.1` | FAILED | FAILED | DONE | yes | yes |
| M04 | pattern in a command's output | compose.env says FIXFLOW_BACKUP_ENABLED=true at 4.2 | `restore|4.2` | FAILED | FAILED | DONE | yes | yes |
| M05 | checksum against the recorded value | the sum P0a recorded is not this file's | `restore-2|6.2 (B5 form, over the live database)` | FAILED | FAILED | DONE | yes | yes |
| M06 | database content against the source's facts | one row is missing after the load | `restore-1|6.8 (nightly form, empty volume)` | FAILED | FAILED | AMBIGUOUS | yes | yes |
| M07 | the app's own report and deep-health accounts | one default-PIN account is not given a PIN | `restore-1|6.13` | FAILED | FAILED | DONE | yes | yes |
| M08 | pings a cron makes, seen at the dead-man listener | cron is not running | `restore-1|7.4` | FAILED | FAILED | DONE | yes | yes |
| M09 | the dead-man listener's log | the dead-man service gets no ping | `restore-1|7.6` | FAILED | FAILED | DONE | yes | yes |
| M10 | the bucket listing after a prune | the bucket holds one old dump fewer than expected | `restore-1|9.1` | FAILED | FAILED | DONE | yes | yes |
| M11 | deep-health facts | the owner forgets to comment the ceilings out | `drain-window|8.7` | FAILED | FAILED | DONE | yes | yes |
| M12 | a SQL truth value | an event lands after the re-seed | `drain-window|8.8` | FAILED | FAILED | DONE | yes | yes |
| M13 | the shape guard (a line inserted into a typed block) | a runbook edit inserts a line into 7.8 | `restore-1|7.8` | MOVED | MOVED | DONE | yes | yes |
