// R6 refuter: split the KS seed rows (lanes R-01a, R-01b) into
//  R = a conclusion a capable model could re-derive from this repository's code plus the symptom
//      (depreciates as readers get stronger: needed less for accuracy, cheaper to re-derive)
//  F = a fact no reasoning over the repository yields (vendor, device, OS, operator, environment
//      behaviour, found by running or by vendor docs) -> does not depreciate on the model clock
//  P = a test procedure / named verification (neither)
// Hand classification by the refuter, from the row text (seed-solved-traps.txt and the R-01b "other" rows).
// Numbering follows the two dumps made in this folder. Duplicates across sources are dropped.
const solvedTrap = { // #n from seed-solved-traps.txt
  F: [1,2,3,4,15,16,17,18,22,23,24,25,38,40], // 14 (dups 14=4, 36=17 dropped)
  R: [5,6,7,8,9,10,11,12,13,26,27,28,29,30,33,34,35, 19,20,21,37,39,41], // 17 solved + 6 traps (dups 31=10, 32=13 dropped)
};
const negatives = { // #n from the R-01b cls=other listing (60 rows)
  F: [1,2,3,8,9,10,11,14,15,26,32,35,36,37,39,41,44,46,48,51],
  P: [16,20,40,59,60],
  R: [4,5,6,7,13,17,18,19,21,22,23,24,25,27,28,29,30,31,33,34,38,42,43,45,47,49,50,52,53,54,55,56,57,58],
  dup: [12],
};
const all = new Set([...negatives.F,...negatives.P,...negatives.R,...negatives.dup]);
if (all.size !== 60) console.log("WARNING negatives coverage", all.size);
const st = solvedTrap.F.length + solvedTrap.R.length;
const ng = negatives.F.length + negatives.P.length + negatives.R.length;
const F = solvedTrap.F.length + negatives.F.length, R = solvedTrap.R.length + negatives.R.length, P = negatives.P.length;
const T = F + R + P;
console.log(`solved+trap unique rows: ${st} (F ${solvedTrap.F.length}, R ${solvedTrap.R.length})`);
console.log(`negative rows unique: ${ng} (F ${negatives.F.length}, R ${negatives.R.length}, P ${negatives.P.length})`);
console.log(`ALL unique entry rows: ${T}; facts F ${F} (${(100*F/T).toFixed(0)} %), re-derivable R ${R} (${(100*R/T).toFixed(0)} %), procedures P ${P} (${(100*P/T).toFixed(0)} %)`);
console.log(`plus 25 invariants (owner decisions/rules; stay as rule sentences in CLAUDE.md)`);
// Worked examples ex1..ex8 (R-02), by where the value sits
const ex = {ex1:"R (stdlib behaviour + diagnosis from a TypeError traceback)", ex2:"F (operator: rollback after a migration boundary) + R", ex3:"R (open defect; design reasoning)", ex4:"R (repo design hazard)", ex5:"R (repo invariant)", ex6:"decision (do-not-apply)", ex7:"F (EAS rejects an empty env value)", ex8:"F (Sentry Expo plugin breaks Gradle)"};
console.log("worked examples:", JSON.stringify(ex));
