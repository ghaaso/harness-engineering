import { load } from './rec.mjs';
const r = load();
const qh = r.filter(x => x.top).map(x => [x.t, (x.top.find(([n]) => n === 'QHActiveDefense') || [0, null])[1]]);
const at = t => { const row = qh.find(([tt]) => tt >= t); return row; };
for (const [a, b] of [['04:01:14','04:25:00'],['04:25:00','05:00:00'],['04:35:00','04:40:00'],['05:00:00','05:04:19'],['04:01:14','05:04:19']]) {
  const A = at(a), B = at(b);
  const mins = (toS(B[0]) - toS(A[0])) / 60;
  console.log(a, b, A, B, ((B[1] - A[1]) / mins).toFixed(1), 'MB/min');
}
function toS(t){const [h,m,s]=t.split(':').map(Number);return h*3600+m*60+s;}
// gaps in the old-format recorder
let maxgap=0,gapAt='';for(let i=1;i<r.length;i++){const g=toS(r[i].t)-toS(r[i-1].t);if(g>maxgap&&g<3600){maxgap=g;gapAt=r[i-1].t+'->'+r[i].t;}}
console.log('lines',r.length,'max gap s',maxgap,gapAt);
// periods where service >1000 MB
const big=qh.filter(([t,v])=>v>1000);console.log('>1GB first',big[0],'last',big[big.length-1],'n',big.length);
