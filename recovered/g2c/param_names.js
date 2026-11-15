const path=require("path"),fs=require("fs");
const ts=require("C:/Users/User/Documents/projects/EMS_workshop1/technician-app/node_modules/typescript");
const mode=process.argv[2]; const ROOT=path.resolve(process.argv[3]);
let options,files=[];
const walk=(d,re)=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.isDirectory()){if(e.name!=="node_modules")walk(path.join(d,e.name),re);}else if(re.test(e.name)&&!/\.d\.ts$/.test(e.name))files.push(path.join(d,e.name).split(path.sep).join("/"));}};
if(mode==="mobile"){const dir=path.join(ROOT,"technician-app");const cfg=ts.readConfigFile(path.join(dir,"tsconfig.json"),f=>fs.readFileSync(f,"utf8")).config||{};
options=ts.convertCompilerOptionsFromJson(Object.assign({allowJs:true,esModuleInterop:true,jsx:"react-native",lib:["DOM","ESNext"],moduleResolution:"node",resolveJsonModule:true,target:"ESNext"},cfg.compilerOptions||{}),dir).options;walk(path.join(dir,"src"),/\.(ts|tsx)$/);}
else{options=ts.convertCompilerOptionsFromJson({allowJs:true,checkJs:false,jsx:"react-jsx",module:"ESNext",moduleResolution:"Bundler",target:"ESNext",baseUrl:".",paths:{"@app/*":["src/app/*"],"@shared/*":["src/shared/*"],"@features/*":["src/features/*"],"@ops/*":["src/ops/*"]}},ROOT).options;walk(path.join(ROOT,"src"),/\.(js|jsx|mjs)$/);}
options.types=[];options.noEmit=true;options.skipLibCheck=true;
const prog=ts.createProgram(files,options),ch=prog.getTypeChecker();
const inRepo=f=>{const r=path.relative(ROOT,f);return !r.startsWith("..")&&!/node_modules|lib\./.test(r);};
const isTest=f=>/(\.test\.|__tests__|jest\.setup|vitest\.setup)/.test(f);
const cnt={};let tot=0,setter=0,handler=0,useStateSetter=0;
for(const sf of prog.getSourceFiles()){if(!inRepo(sf.fileName)||sf.isDeclarationFile||isTest(sf.fileName))continue;
(function v(n){if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)){let s=null;try{s=ch.getSymbolAtLocation(n.expression)}catch(e){}
const d=s&&s.declarations&&s.declarations[0];if(d&&inRepo(d.getSourceFile().fileName)&&(ts.isParameter(d)||ts.isBindingElement(d))){tot++;const nm=n.expression.text;cnt[nm]=(cnt[nm]||0)+1;
if(/^set[A-Z]/.test(nm))setter++;else if(/^on[A-Z]/.test(nm))handler++;
// binding element from array destructuring of a call (useState-like)
if(ts.isBindingElement(d)&&ts.isArrayBindingPattern(d.parent)&&d.parent.parent&&ts.isVariableDeclaration(d.parent.parent)&&d.parent.parent.initializer&&ts.isCallExpression(d.parent.parent.initializer)&&/use[A-Z]/.test(d.parent.parent.initializer.expression.getText()))useStateSetter++;}}
ts.forEachChild(n,v);})(sf);}
console.log(JSON.stringify({mode,paramCalls:tot,set_prefix:setter,on_prefix:handler,fromHookArrayDestructure:useStateSetter,top:Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,10)}));
