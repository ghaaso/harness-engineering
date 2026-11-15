# Coordinator ruling 100, on the cap of the re-run check

Ruled by the coordinator on 2026-11-15 at about 07:25Z (file hash and exact time are in `progress.jsonl`,
line `rulings_100`), while stage B was training and before any stage-B or held-out score had been read.
Raised by the lane. It goes to the end of section M word for word.

100. The container of the re-run check (END-ORDER step 2c, `kge-R1`) runs under a 4 GB cap and starts
     under ruling 79's rule (three samples, 6 GB free, commit under 38 GB). Reason: ruling 98. The last
     stage-B units of E4 c13 and every unit of c16 were made under 4 GB, and no c16 unit has ever run
     under 2560m, so a kill there would stop the check for a reason that has nothing to do with what it
     tests. Each picked unit still trains in a fresh process, E4 deterministic, and the check compares
     bytes, which a memory cap cannot change. The card window has no other training container beside it.
