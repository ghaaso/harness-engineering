const fs=require('fs');const D=process.env.LOCALAPPDATA+'/Claude/logs/';
for(const f of ['main3.log','main2.log','main1.log','main.log']){let t;try{t=fs.readFileSync(D+f,'latin1')}catch{continue}
for(const l of t.split(/\r?\n/)){const m=/^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d) .*event-loop-stall\] main process blocked for (\d+)ms(.*)$/.exec(l);if(m&&+m[2]>=60000)console.log(m[1],Math.round(m[2]/60000)+' min',m[3].replace(/[A-Z]:\[^ \]]*/g,'<path>').slice(0,120))}}
let txt=fs.readFileSync('C:/Users/User/Documents/projects/harness-engineering/docs/program/evidence/pc-freezes-2026-11-17/history-raw-System.json','utf8');if(txt.charCodeAt(0)===0xfeff)txt=txt.slice(1);
const ev=JSON.parse(txt);console.log('--- SCM 7031/7034 for 360');
for(const e of ev.filter(e=>(e.id===7034||e.id===7031)&&/360|QHActive|ZhuDong/i.test(e.message||'')).sort((a,b)=>a.time<b.time?-1:1))console.log(e.time.slice(0,19),e.id,(e.message||'').slice(0,70));
