// prints the record's chosen block and each arm's (config, w, mean), plus the stage-B epochs of the chosen setting; tuning figures only
const fs = require("fs");
const r = JSON.parse(fs.readFileSync("train/heldout/item27.json", "utf8"));
console.log("record keys:", Object.keys(r).join(","));
console.log("chosen:", JSON.stringify(r.chosen).slice(0, 600));
for (const a of Object.keys(r.arms || {})) console.log("arm", a, JSON.stringify(r.arms[a]).slice(0, 300));
console.log("written:", r.written || r.t || r.time, "| test:", r.test, "| s:", r.s, "| seeds:", JSON.stringify(r.seeds), "| device:", r.device, "| det:", JSON.stringify(r.det));
const plan = JSON.parse(fs.readFileSync("train/stageB/plan.json", "utf8"));
console.log("plan keys:", Object.keys(plan).join(","), "| heldout keys:", Object.keys(plan.heldout || {}).join(","));
const ho = plan.heldout || {};
console.log("held-out parents:", Object.keys(ho.assignment || {}).length, "| held-out checkpoints:", Array.isArray(ho.checkpoints) ? ho.checkpoints.length : JSON.stringify(ho.checkpoints).slice(0, 80));
