const s=require(process.argv[2]);
const lo=+process.argv[3], hi=+process.argv[4];
const strip=t=>(t||'').replace(/cd C:\/Bilal_Migration\/User\/Downloads\/20_PROJECTS\/24_Clinic_Workshop/g,'cd ROOT').replace(/C:\/Bilal_Migration\/User\/Downloads\/20_PROJECTS\/24_Clinic_Workshop/g,'ROOT').replace(/\.claude\/worktrees\/[a-z0-9-]+/g,'WT');
for(const x of s.filter(x=>x.id>=lo&&x.id<=hi)){
 console.log(`#${x.id} [${x.kind}${x.sub?' sub':''}] ${strip(x.search)}`);
 if(x.said_before) console.log(`  SAID: ${strip(x.said_before).slice(0,220).replace(/\n/g,' ')}`);
 for(const n of x.next_calls||[]) console.log(`  NEXT: ${strip(n).slice(0,170).replace(/\n/g,' ')}`);
}
