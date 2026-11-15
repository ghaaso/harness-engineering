const g=require('../data/glossary.json').terms;
const want=process.argv.slice(2);
want.forEach(n=>{const t=g.find(x=>x.key===n||x.key.split('-')[1]===n&&x.key.startsWith('g'));if(t)console.log(t.key,'|',t.term,'|',t.definition,'|',t.origin,'|',t.category);else console.log('none',n)});
