# Coordinator ruling 108, on the memory cap of the held-out launcher's containers

Ruled by the coordinator on 2026-11-15 at about 12:53Z (file hash and exact time are in `progress.jsonl`,
line `rulings_108`), after step 1 of the accepted end order (END-ORDER 1c849061) and the first probe of
step 2a, and before the rehearsal, the code freeze, any selection, any report and any held-out score.
Source: `train/probe/probe.json` of the first probe (sha256 0c59c50a...c616; container `kge-H1P`,
12:46Z to 12:50Z under a 4 GB cap, exit 3), read by the coordinator. It goes to the end of section M word
for word, before the code freeze.

108. The cap of the held-out launcher's containers is 6 GB.
     (a) What the probe showed. One E4 unit on a graph of the size of the largest held-out graph needs
     3,509 MB in its own process (c13; c16 needs 3,382 MB; every other setting stays under 2.3 GB), and
     the process still holds 2,092 MB after the unit. The second unit in the same process was killed at
     the 4 GB cap. The card is not the limit: at most 2,638 MB of its 12,199 MB were reserved. Under
     4 GB a held-out run of E4, which trains 210 units in one process, would be killed at every second
     unit.
     (b) The decision. The three containers the held-out launcher starts (the probe, the rehearsal and
     the held-out run) run under a 6 GB cap, for every arm. This amends item 2's maximum and ruling
     79's cap for these three containers only. The re-run check keeps the 4 GB of ruling 100, and every
     other step keeps its own cap. Reason: a memory cap cannot change a result. Every unit is seeded,
     E4 runs deterministically, and the re-run check compares a unit trained in a fresh process with
     its part made in a long one. The cap is there to protect the host, which had 11.6 GB free and
     34.2 GB committed when this was ruled.
     (c) The host. Before each launch under this cap the lane takes one memory sample and starts only
     with at least 10 GB free. The launcher's own start rule and stop rule stay as they are. Below
     10 GB free the lane waits, and reports after ten minutes.
     (d) The probe is repeated under the new cap. The first probe's folder is kept, moved aside under a
     name that says what it is, and its two container records stay where the launcher keeps them. If
     the three units in a row finish, the rehearsal may start once the coordinator has seen the rows;
     if a unit is killed again, the coordinator rules again.
     (e) Where the cap is stated. The start lines of the launch logs and the saved container records
     show it, the coordinator checks it at step 8 (ruling 106(e)), and the coordinator's report states
     it. RESULT.md's limits do not name it: the result writer reads no text for it, and no listed file
     changes for this ruling.
