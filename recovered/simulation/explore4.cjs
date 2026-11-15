const fs=require('fs'),path=require('path');
const lib='C:/Users/User/Documents/projects/EMS_workshop1/docs/program/library-pathways';
const E=require(path.join(lib,'engine.js'));
const map=JSON.parse(fs.readFileSync(path.join(lib,'map.json'),'utf8'));
const table=JSON.parse(fs.readFileSync(path.join(lib,'params.json'),'utf8'));
const lims=JSON.parse(fs.readFileSync(path.join(lib,'limitations.json'),'utf8'));
const rows=E.tableRows(table);
const best=E.paramsFromTable(table,'best');
const G={
 recur:['u_exact','u_similar','u_composite','latent_coverage_factor','ok_coverage_factor'],
 reach:['k_fill','t_visible','t_latent','r_exact','r_similar','r_comp_full','r_comp_part','d_deliver','w_write'],
 quality:['v_max','k_distract','f_false','c_check_share','a_right','a_wrong','q_exact','q_similar','q_comp','q_part','h_harm','e_right','fix_on_found','delta_stale','retire_bad','s_exact','s_similar','s_comp','s_part'],
 overhead:['c_lookup','c_screen','c_carry','c_write']
};
const libIds=Object.keys(rows).filter(id=>rows[id].side==='library');
const all=[].concat(G.recur,G.reach,G.quality,G.overhead);
console.log('library ids',libIds.length,'grouped',all.length,'missing',libIds.filter(i=>!all.includes(i)),'extra',all.filter(i=>!libIds.includes(i)));
const good=id=>rows[id].good_end==='high'?rows[id].high:rows[id].low;
const bad=id=>rows[id].good_end==='high'?rows[id].low:rows[id].high;
function at(p){const tp=E.timePath(map,p);const last=tp.periods[tp.periods.length-1];const fe=last.library.measures?last.library.measures.fw_right:null;return {cl:last.ratios.cost_vs_ladder,wl:last.ratios.wrong_vs_ladder,ct:last.ratios.cost_vs_top,wt:last.ratios.wrong_vs_top,lc:last.library.cost,lw:last.library.wrong,dc:tp.cheap_ladder.cost,dw:tp.cheap_ladder.wrong,tc:tp.top_first.cost,tw:tp.top_first.wrong,fe:fe,keys:Object.keys(last.ratios)};}
const f=(v,d=3)=>v==null?'-':Number(v).toFixed(d);
const b0=at(best);console.log('ratio keys',b0.keys);
console.log('best',f(b0.cl),f(b0.wl),f(b0.ct),f(b0.wt),'fe',f(b0.fe,2),'| lib',f(b0.lc,2),f(b0.lw*100,1),'ladder',f(b0.dc,2),f(b0.dw*100,1),'strong',f(b0.tc,2),f(b0.tw*100,1));
function setting(levels){const p=Object.assign({},best);for(const g of Object.keys(levels)){const lv=levels[g];if(lv==null)continue;G[g].forEach(id=>{p[id]=lv===1?good(id):lv===0?bad(id):p[id];});}return p;}
console.log('\n8 corners (recur,reach,quality) overhead at best: cost/ladder wrong/ladder cost/strong wrong/strong funnel');
for(const r of[0,1])for(const c of[0,1])for(const q of[0,1]){const x=at(setting({recur:r,reach:c,quality:q}));console.log(['recur',r,'reach',c,'qual',q].join(' '),'|',f(x.cl),f(x.wl),f(x.ct),f(x.wt),'fe',f(x.fe,2),'lib cost',f(x.lc,2),'wrong',f(x.lw*100,1));}
console.log('\nrecurrence at BEST, reach x quality:');
for(const c of[0,1])for(const q of[0,1]){const x=at(setting({reach:c,quality:q}));console.log(['reach',c,'qual',q].join(' '),'|',f(x.cl),f(x.wl),f(x.ct),f(x.wt),'fe',f(x.fe,2));}
console.log('\noverhead effect at all-good and all-bad:');
for(const o of[0,1]){let x=at(setting({recur:1,reach:1,quality:1,overhead:o}));console.log('all good, overhead',o,'|',f(x.cl),f(x.wl),f(x.ct),f(x.wt),'fe',f(x.fe,2));x=at(setting({recur:1,reach:1,quality:0,overhead:o}));console.log('much use poor quality, overhead',o,'|',f(x.cl),f(x.wl),f(x.ct),f(x.wt));}
// last-in weights
const fav=setting({recur:1,reach:1,quality:1,overhead:1});const F=at(fav);
console.log('\nfavourable',f(F.cl),f(F.wl),f(F.ct),f(F.wt),'fe',f(F.fe,2));
function lastOf(ids){const p=Object.assign({},fav);ids.filter(id=>rows[id]&&rows[id].side==='library').forEach(id=>p[id]=best[id]);const x=at(p);return {x,score:((x.cl-F.cl)/F.cl+(x.wl-F.wl)/F.wl+(x.ct-F.ct)/F.ct+(x.wt-F.wt)/F.wt)/4,gainLost:(x.cl-F.cl)/(b0.cl-F.cl),wrongLost:(x.wl-F.wl)/(b0.wl-F.wl),fe:x.fe};}
function aloneOf(ids){const p=Object.assign({},best);ids.filter(id=>rows[id]&&rows[id].side==='library').forEach(id=>p[id]=good(id));const x=at(p);return {x,gain:(b0.cl-x.cl)/(b0.cl-F.cl),wgain:(b0.wl-x.wl)/(b0.wl-F.wl)};}
const steps={};lims.items.forEach(l=>{const s=l.main_step;(steps[s]=steps[s]||new Set());(l.params||[]).forEach(id=>steps[s].add(id));});
console.log('\nSTEP: alone share of the full cost gain / wrong gain ; last = share of the gain lost if only this step stays at best (cost, wrong) ; funnel if only this stays');
Object.keys(steps).sort((a,b)=>a-b).forEach(s=>{const ids=[...steps[s]];const a=aloneOf(ids),l=lastOf(ids);console.log('step',s,'| alone',f(a.gain*100,1)+'%',f(a.wgain*100,1)+'%','| last',f(l.gainLost*100,1)+'%',f(l.wrongLost*100,1)+'%','fe',f(l.fe,1),'| lib unknowns',ids.filter(id=>rows[id]&&rows[id].side==='library').length);});
console.log('\nGROUPS alone / last:');
Object.keys(G).forEach(g=>{const a=aloneOf(G[g]),l=lastOf(G[g]);console.log(g.padEnd(9),'| alone',f(a.gain*100,1)+'%',f(a.wgain*100,1)+'%','| last',f(l.gainLost*100,1)+'%',f(l.wrongLost*100,1)+'%','fe',f(l.fe,1));});
console.log('\nLIMITATIONS by last (cost gain lost):');
const lr=lims.items.map(l=>{const ids=(l.params||[]);const a=aloneOf(ids),la=lastOf(ids);return {id:l.id,t:l.title,s:l.main_step,cases:(l.real&&l.real.cases)||0,a:a.gain,aw:a.wgain,l:la.gainLost,lw:la.wrongLost,n:ids.filter(id=>rows[id]&&rows[id].side==='library').length};}).filter(r=>r.n>0).sort((x,y)=>y.l-x.l);
lr.slice(0,25).forEach(r=>console.log(r.id,'s'+r.s,'| last',f(r.l*100,1)+'%',f(r.lw*100,1)+'%','| alone',f(r.a*100,1)+'%',f(r.aw*100,1)+'%','|',r.t.slice(0,60)));
console.log('...');lr.slice(-8).forEach(r=>console.log(r.id,'s'+r.s,'| last',f(r.l*100,1)+'%',f(r.lw*100,1)+'%','| alone',f(r.a*100,1)+'%',f(r.aw*100,1)+'%','|',r.t.slice(0,60)));
