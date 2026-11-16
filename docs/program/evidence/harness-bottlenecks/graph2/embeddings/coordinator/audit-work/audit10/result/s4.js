const {D,j}=require('./p.js');const r=j(D+'/result.json');console.log(Object.keys(r.verdicts.E2));console.log(JSON.stringify(r.tune_full.vs_RRF).slice(0,300));
const s=JSON.stringify(r); console.log('alone_unrestricted' , s.includes('alone_unrestricted'), (s.match(/cannot tell \(lower\)/g)||[]).length);
