// R7 second reader's labels for the 50 fix commits on main, made from r7-fix-bodies.txt
// before opening the first reader's per-commit script (the first reader's prose, which names
// about 20 examples, had been read). b = borderline toward W.
// G sub-tags: self = error names the cause; ver = bound to an old version; tool = vendor tool flags it;
// cur = current and portable; known = current but widely documented.
const mine = {
'24184b2':'P b','da988e2':'P','1c546a3':'P b','2fe77f5':'W','013a86b':'P b','370e83a':'P','4a40423':'P',
'82611de':'P','12c16f1':'W','79a8dd4':'G self','3ce6881':'P','2455eb0':'P','c74b8c2':'P','0a3b38e':'W',
'a57387d':'P','109da03':'P','789d522':'W','8ff3179':'P b','7b395a5':'P','e5f9347':'P','02c2afb':'G self',
'981ae08':'G self','c3754dd':'G self','f29f62f':'W','2f09cec':'W','c3a0f8f':'G self','75b51f9':'G self',
'6e8427d':'P','ce1f9c9':'P','a60a0a6':'P b','76061e0':'P b','5609001':'W','6928828':'G ver+tool+cur',
'9c561b0':'G cur','ff81f70':'W','4a171b4':'W','5930377':'P','83b3ef8':'P','89d41d6':'P','cd94d38':'P',
'67218b1':'W','3e07280':'P','d440855':'G ver','169ca41':'P','dbb3661':'G ver','0b8ad39':'G self',
'c2a345e':'G cur','ca362c0':'W','7a8baa0':'G known','b7a5b98':'G ver+tool'};
const d4 = {'24184b2':'P','da988e2':'P','1c546a3':'P','2fe77f5':'W','013a86b':'P','370e83a':'P','4a40423':'P',
'82611de':'P','12c16f1':'W','79a8dd4':'G','3ce6881':'P','2455eb0':'P','c74b8c2':'P','0a3b38e':'W','a57387d':'P',
'109da03':'P','789d522':'W','8ff3179':'P','7b395a5':'P','e5f9347':'P','02c2afb':'G','981ae08':'G','c3754dd':'G',
'f29f62f':'W','2f09cec':'W','c3a0f8f':'G','75b51f9':'G','6e8427d':'P','ce1f9c9':'P','a60a0a6':'P','76061e0':'P',
'5609001':'W','6928828':'G','9c561b0':'G','ff81f70':'W','4a171b4':'W','5930377':'P','83b3ef8':'P','89d41d6':'P',
'cd94d38':'P','67218b1':'P','3e07280':'P','d440855':'G','169ca41':'P','dbb3661':'G','0b8ad39':'G','c2a345e':'G',
'ca362c0':'P','7a8baa0':'G','b7a5b98':'G'};
const ks=Object.keys(mine); const cls=s=>s[0];
let agree=0; const dis=[]; const cm={},cd={};
for(const k of ks){const a=cls(mine[k]),b=d4[k]; cm[a]=(cm[a]||0)+1; cd[b]=(cd[b]||0)+1; if(a===b)agree++; else dis.push(`${k} mine=${a} d4=${b}`);}
const n=ks.length, po=agree/n; let pe=0; for(const c of ['P','W','G']) pe+=(cm[c]||0)*(cd[c]||0)/n/n;
console.log('n',n,'agree',agree,'po',po.toFixed(3),'kappa',((po-pe)/(1-pe)).toFixed(3));
console.log('mine',cm,'d4',cd); console.log('disagreements',dis);
const loose={P:0,W:0,G:0}; for(const k of ks){let c=cls(mine[k]); if(mine[k].includes(' b')) c='W'; loose[c]++;}
console.log('mine, borderline counted as W',loose);
const G=ks.filter(k=>cls(mine[k])==='G'); const t=x=>G.filter(k=>mine[k].includes(x));
console.log('G',G.length,'self',t('self').length,'ver',t('ver').map(k=>k),'cur',t('cur').map(k=>k),'known',t('known'));
