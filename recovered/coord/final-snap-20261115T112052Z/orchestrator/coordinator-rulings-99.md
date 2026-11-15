# Coordinator ruling 99, correcting a count in rulings 96 and 97

Ruled by the coordinator on 2026-11-15 at about 06:20Z (file hash and exact time are in `progress.jsonl`,
line `rulings_99`), while stage B was training and before any stage-B or held-out score had been read.
The lane's agent A found the discrepancy. It goes to the end of section M word for word.

99. Correction. Rulings 96 and 97 give the relation types as "37 against 36". The right figures are 36
    against 35, the changed-together relation included in both: the tuning checkpoints hold 35 relation
    types between them, the held-out parents 36 (69 graphs hold 36 and one holds 35), and the largest
    held-out graph holds 36, as its size file says. The coordinator's count read the header line of the
    triples files as one more relation name. The coordinator's note to the lane that the size file
    leaves the changed-together relation out was also wrong; it counts it. Nothing else in rulings 96
    and 97 changes: one relation type and two node kinds exist only in held-out graphs, in 69 of the 70
    parents; the counts of that relation's triples and of the kinds at their ends were taken per line
    and are not affected. Where ruling 96 says the probe's synthetic graph carries 37 relation types,
    read 36.
