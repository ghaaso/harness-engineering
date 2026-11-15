'use strict';
// Pre-flight fix round 1: why does LadybugDB answer probe 904 (setting_readers, env only) differently?
// Inside graphtest:1 (frozen graph, probe question only):  node tmp/lock/preflight1/lb904.js
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..', '..');
const P = require(path.join(B, 'arms/common/paths'));
const { graphFor } = require(path.join(B, 'arms/common/arms'));
const T = require(path.join(B, 'arms/ladybug/tq'));
(async () => {
  const G = graphFor(P.FROZEN);
  const arm = require(path.join(B, 'arms/ladybug/arm')).openInProc(G, { store: P.storeFor('ladybug') });
  const g = arm.lb;
  const show = (label, f) => { try { console.log(label, JSON.stringify(f())); } catch (e) { console.log(label, 'ERR', String(e.message).slice(0, 300)); } };
  show('answer env', () => T.Q.setting_readers(g, { env: 'EXPO_PUBLIC_API_URL' }));
  show('answer name+env', () => T.Q.setting_readers(g, { name: 'zz_none', env: 'EXPO_PUBLIC_API_URL' }));
  const L = g.types.filter((x) => x.kind === 'reads_setting').map((x) => 'f_' + x.t).join('|');
  show('rows', () => g.q(`MATCH (s:N)-[e:${L}]->(st:N) WHERE st.sid = 'setting:env/' + $env MATCH (s)-[ev:EV]->(st) WHERE ev.kid = e.kid RETURN s.kind AS sk, s.path AS sp, st.name AS sn, ev.path AS ep, ev.line AS el`, { env: 'EXPO_PUBLIC_API_URL' }));
  show('concat', () => g.q(`MATCH (st:N) WHERE st.sid = 'setting:env/' + $env RETURN st.name AS sn, 'x' + '::' + st.name AS c, coalesce(NULL, 'x' + '::' + st.name) AS c2`, { env: 'EXPO_PUBLIC_API_URL' }));
  show('param name used', () => g.q('MATCH (st:N) WHERE st.sid = \'setting:env/\' + $env RETURN count(*) AS c', { env: 'EXPO_PUBLIC_API_URL' }));
  await arm.close();
})().catch((e) => { console.error(e); process.exit(1); });
