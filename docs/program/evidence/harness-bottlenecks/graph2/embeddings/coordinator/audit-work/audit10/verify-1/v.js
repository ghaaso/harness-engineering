const fs=require('fs');const t=JSON.parse(fs.readFileSync(process.argv[2]));
const v=t.verdicts&&t.verdicts.late50;console.log(JSON.stringify(v&&{E5:v.E5,PLACEBO:v.PLACEBO},null,0).slice(0,1500));
