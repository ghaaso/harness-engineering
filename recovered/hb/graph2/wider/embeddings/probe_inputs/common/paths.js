'use strict';
// Fixed locations shared by every arm. The same code runs on the Windows host (development only) and
// inside the Linux image graphtest:1 (every reported run). Environment overrides:
//   GT_BUILD        the build folder                 (container: /build)
//   GT_REPO         the read-only repository         (container: /repo)
//   GT_FACTS_CACHE  the facts cache folder           (default <build>/facts/cache)
//   GT_STORE        where arms keep database/store files (<GT_STORE>/<arm>); in the container this
//                   must be on the container filesystem or a named volume, never the /build bind
//                   mount (default <build>/arms/<arm>/db, for host development only)
//   GT_SRCSTORE     the shared source-text store (default <build>/arms/common/srcstore; set it to a
//                   volume path inside the container)
//   GT_TMP          scratch exports                  (default <build>/tmp)
//   GT_RESULTS      results root                     (default <build>/results)
const path = require('path');
const env = (k) => (process.env[k] && process.env[k].trim()) || null;

const BUILD = env('GT_BUILD') || path.resolve(__dirname, '..', '..');
const STORE = env('GT_STORE');
module.exports = {
  BUILD,
  REPO: env('GT_REPO') || 'C:/Users/User/Documents/projects/EMS_workshop1',
  FROZEN: 'a31924a3818f4ac94b695906d107c72c912792b2',
  SPLIT_DATE: '2026-07-01',
  // the only facts location: every commit, the frozen commit included, is in facts/cache/<sha>/ (the
  // old arms/common/frozen-facts folder was deleted and is never looked at)
  FACTS_CACHE: env('GT_FACTS_CACHE') || path.join(BUILD, 'facts', 'cache'),
  TASKS: path.join(BUILD, 'tasks'),
  TMP: env('GT_TMP') || path.join(BUILD, 'tmp'),
  SRCSTORE: env('GT_SRCSTORE') || path.join(BUILD, 'arms', 'common', 'srcstore'),
  RESULTS: env('GT_RESULTS') || path.join(BUILD, 'results'),
  ARMS: path.join(BUILD, 'arms'),
  // per-arm store folder: <GT_STORE>/<arm> when GT_STORE is set
  storeFor: (arm) => (STORE ? path.join(STORE, arm) : path.join(BUILD, 'arms', arm, 'db')),
  RELDB: STORE ? path.join(STORE, 'relational') : path.join(BUILD, 'arms', 'relational', 'db'),
};
