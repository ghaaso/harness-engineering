// Can a recursive-pattern filter mix the rel and the node? And the string functions TQ needs.
const S = require('/build/arms/ladybug/store');
const P = require('/build/arms/common/paths');
const { graphFor } = require('/build/arms/common/arms');
const G = graphFor(P.FROZEN);
const st = S.open(G, P.storeFor('ladybug'), { threads: 1 });
const run = (q) => { try { return S.getAll(st.conn.querySync(q)).slice(0, 3); } catch (e) { return 'ERR ' + String(e.message).slice(0, 200); } };
console.log(st.meta.types.map((x) => x.t).join(' '));
console.log(run("MATCH (s:N)-[p:f_calls|f_calls_url* SHORTEST 1..12 (r, n | WHERE n.is_test = 0 AND (r.kid = 3 OR coalesce(n.runtime, '') <> 'backend'))]->(v:N) WHERE s.id = 100 RETURN count(*) AS c"));
console.log(run("MATCH (s:N)-[p:f_calls|f_calls_url* SHORTEST 1..12 (r, n | WHERE n.is_test = 0 AND coalesce(n.runtime, '') <> 'backend')]->(v:N) WHERE s.id = 100 RETURN count(*) AS c"));
console.log(run("MATCH (n:N) WHERE regexp_matches(n.sid, '^(sym|const):[^#]*#') RETURN n.sid AS s, regexp_extract(n.sid, '^[^#]*#(.*)$', 1) AS x, n.path + '::' + regexp_extract(n.sid, '^[^#]*#(.*)$', 1) AS l LIMIT 3"));
console.log(run("MATCH (n:N) RETURN label(n) AS l LIMIT 1"));
console.log(run("MATCH ()-[e:f_calls]->() RETURN label(e) AS l LIMIT 1"));
st.conn.closeSync(); st.db.closeSync();
