const fs=require('fs');const L=process.argv[2];const want=process.argv.slice(3).map(Number);
const lines=fs.readFileSync(L,'utf8').split('\n');
want.forEach(n=>console.log(n,lines[n-1]+'\n'));
