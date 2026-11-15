const fs=require('fs'); const repo='C:/Users/User/Documents/projects/EMS_workshop1';
const g=JSON.parse(fs.readFileSync('../../graph.json','utf8')); const F=g.files;
const C=g.edges.map((e,i)=>[i,...e]).filter(e=>e[3]==='cites'); console.log('cites',C.length);
const step=Math.floor(C.length/30); const pick=[]; for(let k=0;k<30;k++)pick.push(C[k*step+Math.floor(step/2)]);
const re=/[A-Za-z0-9_.@\-\/]+\.(?:py|tsx|ts|jsx|js|mjs|json|md|yml|toml|sh)\b/g;
for(const [i,s,d,k,x] of pick){ const ln=+x.split('|')[0]; const line=fs.readFileSync(repo+'/'+F[s],'utf8').split('\n')[ln-1];
  const toks=(line.match(re)||[]); console.log('#'+i,F[s]+':'+ln,'->',F[d],'| tokens:',toks.join(' '),'\n    ',line.trim().slice(0,260)); }
