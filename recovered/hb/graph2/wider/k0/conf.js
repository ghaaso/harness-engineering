'use strict';
// Fixed locations for the K0 cache replay. The build tree of the finished test is only read.
const path = require('path');
const K0 = __dirname;
const BUILD = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
module.exports = {
  K0,
  BUILD,
  REPO: 'C:/Users/User/Documents/projects/EMS_workshop1',
  FACTS: path.join(BUILD, 'facts', 'cache'),
  TASKS: path.join(BUILD, 'tasks'),
  BUILD_RESULTS: path.join(BUILD, 'results'),
  FROZEN: 'a31924a3818f4ac94b695906d107c72c912792b2',
  DATA: path.join(K0, 'data'),
  OUT: path.join(K0, 'out'),
  NOTES_DIR: 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/widen/k0',
  SEED: 20261113,
};
