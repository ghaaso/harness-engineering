// node build.mjs [outDir]  ->  harness-pipeline.svg and harness-pipeline.drawio, after checking the scene.
// The PNG files are made from the SVG by shoot.sh (a headless browser screenshot).
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { toSVG, toDrawio, check } from './lib.mjs';
import { scene, stats, mapRegion } from './scene.mjs';

const out = process.argv[2] || 'out';
mkdirSync(out, { recursive: true });
const problems = [...check(scene), ...scene.problems];
for (const p of problems) console.log('PROBLEM ' + p);
writeFileSync(join(out, 'harness-pipeline.svg'), toSVG(scene));
writeFileSync(join(out, 'harness-pipeline.drawio'), toDrawio(scene));
writeFileSync(join(out, 'map-region.txt'), mapRegion.map(Math.round).join(' '));
console.log(`canvas ${scene.W} x ${scene.H}; left column ends ${stats.left}, right ${stats.right}`);
console.log(`${stats.pipelines} pipelines, ${stats.steps} steps, ${stats.parts} parts (built ${stats.b}, designed ${stats.d}, idea ${stats.i}, tested once without gain ${stats.n}); ${scene.edges.length} arrows; problems ${problems.length}`);
