'use strict';
// WSHORTEST on a toy graph with and without a projected graph present (crash isolation).
const lbug = require('@ladybugdb/core');
const db = new lbug.Database(':memory:'); const c = new lbug.Connection(db);
const all = (q) => { const r = c.querySync(q); const rows = r.getAllSync(); r.close(); return rows; };
all('CREATE NODE TABLE N(id INT64, PRIMARY KEY(id))'); all('CREATE REL TABLE E(FROM N TO N, w DOUBLE)');
all('UNWIND [1,2,3,4,5] AS i CREATE (:N {id: i})');
for (const [a, b, w] of [[1, 2, 1], [2, 3, 2], [3, 1, 1], [3, 4, 0.5], [4, 5, 1]]) all(`MATCH (a:N {id:${a}}), (b:N {id:${b}}) CREATE (a)-[:E {w: ${w}}]->(b)`);
const mode = process.argv[2];
if (mode === 'proj') { all('LOAD EXTENSION algo'); all("CALL PROJECT_GRAPH('g', ['N'], ['E'])"); }
if (mode === 'algo') all('LOAD EXTENSION algo');
console.log(mode, JSON.stringify(all('MATCH p = (a:N)-[e:E* WSHORTEST(w)]->(b:N) WHERE a.id = 1 RETURN b.id AS b, cost(p) AS c ORDER BY b')));
