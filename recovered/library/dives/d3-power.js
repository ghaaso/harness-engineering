// Arithmetic only. How many tasks would a trial need to tell a 2-8 point
// difference in success rate between "Sonnet + library" and "Opus"?
const za2 = 1.96, za1 = 1.645, zb = 0.8416; // alpha .05 two-sided / one-sided, power .80
const p = 0.5; // worst-case variance; benchmark scores sit near 0.45-0.70
const gaps = [0.023, 0.042, 0.05, 0.084];
console.log('Unpaired two-proportion test, n per arm:');
for (const d of gaps) console.log(`  gap ${(d * 100).toFixed(1)} pts: ${Math.ceil(((za2 + zb) ** 2 * 2 * p * (1 - p)) / d ** 2)}`);
console.log('Non-inferiority (true diff 0), one-sided, n per arm:');
for (const m of [0.02, 0.03, 0.05]) console.log(`  margin ${(m * 100).toFixed(0)} pts: ${Math.ceil(((za1 + zb) ** 2 * 2 * p * (1 - p)) / m ** 2)}`);
console.log('Paired (McNemar, same tasks both arms), discordant share psi:');
for (const psi of [0.2, 0.3]) for (const d of [0.05, 0.084]) {
  const n = (za2 * Math.sqrt(psi) + zb * Math.sqrt(psi - d * d)) ** 2 / d ** 2;
  console.log(`  psi ${psi}, gap ${(d * 100).toFixed(1)} pts: ${Math.ceil(n)} tasks`);
}
// Detectable gap with the repo's own task supply
for (const n of [75, 140]) {
  const unpaired = (za2 + zb) * Math.sqrt((2 * p * (1 - p)) / n);
  console.log(`n=${n} per arm unpaired: smallest detectable gap ~${(unpaired * 100).toFixed(1)} pts`);
}
// AgentBrew Terminal-Bench 2.0: 64 tasks; single-run standard error
const se = Math.sqrt(0.5 * 0.5 / 64);
console.log(`AgentBrew 64 tasks: SE of one score ~${(se * 100).toFixed(1)} pts; 45.3%=${(0.453 * 64).toFixed(1)} tasks, 50.0%=${(0.5 * 64).toFixed(1)}, 51.6%=${(0.516 * 64).toFixed(1)}`);
// AgentBrew build cost relative to per-task cost (price ratios only)
const build = 116, student = 0.04, teacher = 0.06;
console.log(`AgentBrew build = ${(build / student).toFixed(0)} student tasks; break-even vs teacher at ${(build / (teacher - student)).toFixed(0)} tasks`);
// Harness record: per-call context by model, slice calls Nov (F3 s.3)
console.log(`Sonnet slice per call ${(1452e6 / 3297 / 1e3).toFixed(0)}k; Opus ${(1306e6 / 5879 / 1e3).toFixed(0)}k`);
// Price-weighted context spend if all Opus context moved to Sonnet at equal tokens.
// Cache-read price per token (relative): Fable 8*0.025=0.2, Opus 4*0.05=0.2, Sonnet 2*0.05=0.1
const share = { opus: 0.515, sonnet: 0.322, fable: 0.163 };
const cr = { opus: 0.2, sonnet: 0.1, fable: 0.2 };
const tot = share.opus * cr.opus + share.sonnet * cr.sonnet + share.fable * cr.fable;
console.log(`Moving all Opus context to Sonnet cuts price-weighted context spend by ${((share.opus * (cr.opus - cr.sonnet)) / tot * 100).toFixed(1)} % (tokens unchanged)`);
// Trial token cost at two task sizes (F3: FixFlow agent window ~12 calls x 113-156k; Clinic slice session 519 calls x 306k)
const agentWin = [12 * 113e3, 12 * 156e3], slice = 519 * 306e3;
for (const n of [365, 940]) console.log(`paired trial ${n} tasks x2 arms: ${(n * 2 * agentWin[0] / 1e9).toFixed(1)}-${(n * 2 * agentWin[1] / 1e9).toFixed(1)} B tokens at agent-window size; ${(n * 2 * slice / 1e9).toFixed(0)} B at slice-session size (recorded total both repos 7.35 B)`);
