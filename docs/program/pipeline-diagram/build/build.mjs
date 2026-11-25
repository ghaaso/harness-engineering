// node build.mjs [outDir]  ->  after checking each scene:
//   <outDir>/harness-pipeline.svg and .drawio          the full diagram
//   <outDir>/memory/harness-memory.svg and .drawio     memory, with the system map and the task pipeline
//   <outDir>/memory/harness-memory-only.svg and .drawio memory, with the system map, no task pipeline
// The PNG files are made from the SVG files by shoot.sh (a headless browser screenshot).
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { toSVG, toDrawio, check } from './lib.mjs';
import { buildScene } from './scene.mjs';

const out = process.argv[2] || 'out';
const targets = [
  { kind: 'full', dir: out, name: 'harness-pipeline', page: 'Harness pipeline' },
  { kind: 'memory', dir: join(out, 'memory'), name: 'harness-memory', page: 'Memory' },
  { kind: 'memory-only', dir: join(out, 'memory'), name: 'harness-memory-only', page: 'Memory' },
];
for (const t of targets) {
  const { scene, stats, mapRegion } = buildScene(t.kind);
  mkdirSync(t.dir, { recursive: true });
  const problems = [...check(scene), ...scene.problems];
  for (const p of problems) console.log(`PROBLEM ${t.name}: ${p}`);
  writeFileSync(join(t.dir, `${t.name}.svg`), toSVG(scene));
  writeFileSync(join(t.dir, `${t.name}.drawio`), toDrawio(scene, t.page));
  writeFileSync(join(t.dir, 'map-region.txt'), mapRegion.map(Math.round).join(' '));
  console.log(`${t.name}: canvas ${scene.W} x ${scene.H}; ${stats.pipelines} pipelines, ${stats.steps} steps, ${stats.parts} parts (built ${stats.b}, designed ${stats.d}, idea ${stats.i}, tested once without gain ${stats.n}); ${scene.edges.length} arrows; problems ${problems.length}`);
}
