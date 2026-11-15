// Lists the DLL names a Windows binary imports (reads the PE import table).
const fs=require('fs'); const b=fs.readFileSync(process.argv[2]);
const pe=b.readUInt32LE(0x3c); const nsec=b.readUInt16LE(pe+6); const optSize=b.readUInt16LE(pe+20); const opt=pe+24;
const pe32plus=b.readUInt16LE(opt)===0x20b; const dd=opt+(pe32plus?112:96); const impRva=b.readUInt32LE(dd+8);
const secs=[]; let p=opt+optSize; for(let i=0;i<nsec;i++,p+=40)secs.push({va:b.readUInt32LE(p+12),vs:b.readUInt32LE(p+8),raw:b.readUInt32LE(p+20),rs:b.readUInt32LE(p+16)});
const off=rva=>{ for(const s of secs) if(rva>=s.va&&rva<s.va+Math.max(s.vs,s.rs))return rva-s.va+s.raw; return -1; };
const names=[]; let o=off(impRva); while(o>0){ const nameRva=b.readUInt32LE(o+12); if(!nameRva)break; let n=off(nameRva),e=n; while(b[e])e++; names.push(b.toString('ascii',n,e)); o+=20; }
console.log(names.join(' | '));
