// Round 8 prototype "Operate": the Now picture at a moment when a session waits for him (Tue 24 Nov 03:29),
// with the answer on the session, the rail ordered by need, and the prompt dock speaking to the selected session.
// node operate.mjs -> operate.html
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, page } from './now.mjs';
writeFileSync(join(HERE, 'operate.html'), page(new Date('2026-11-24T03:29:00').getTime(), { operate: true, title: 'Operate' }));
