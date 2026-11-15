const fs=require('fs'),path=require('path');
const B=process.argv[2], T=process.argv[3];
const css=fs.readFileSync(path.join(B,'styles.css'),'utf8'), js=fs.readFileSync(path.join(B,'paginate.js'),'utf8');
let rows=''; for(let i=1;i<=60;i++) rows+=`<tr><td class="iid">A-${String(i).padStart(2,'0')}</td><td><span class="nm">Idea number ${i}</span><span class="sub">How it works, in a few words that wrap onto a second line here.</span></td><td>The problem it solves, written plainly for the reader, maybe two lines long.</td><td><span class="stage"><span class="mt">${'<i class="on"></i>'.repeat(i%6+1)}${'<i></i>'.repeat(5-i%6)}</span><span class="mtl">Built</span></span>Result 24<span class="tg">M</span></td></tr>`;
let gl=''; for(let i=0;i<120;i++) gl+=(i%15===0?`<h4>${String.fromCharCode(65+i/15)}</h4>`:'')+`<div class="gt"><b>Term ${i}</b> — a plain definition that runs a line or two long so we can see wrapping.<span class="go">Origin: coined by us in HARNESS-V2 (2026-11-11)</span></div>`;
const html=`<!doctype html><html><head><meta charset="utf-8"><title>test</title><style>${css}</style></head><body data-short="Our AI build harness" data-foot="Compiled 13 Nov 2026"><div id="pages"></div><div id="flow">
<div class="cover"><div class="band"></div><div class="kicker">Test</div><h1>Cover title that is long</h1><div class="sub">Subtitle</div></div>
<div class="newpage" data-part="Contents"></div><h1 id="c">Contents</h1><table class="toc"><tr><td>Part 1</td><td class="pg" data-toc="p1"></td></tr><tr><td>Glossary</td><td class="pg" data-toc="gl"></td></tr></table>
<h1 class="sec-start" id="p1" data-part="Part 1 · Test">Part one</h1><p class="lead">Lead para.</p>${'<p>Body paragraph text that goes on for a while to fill some lines on the page and test wrapping behaviour in the paginator.</p>'.repeat(12)}
<h2>Table</h2><table class="split"><thead><tr><th style="width:12mm">ID</th><th style="width:52mm">Idea</th><th>Problem</th><th style="width:42mm">Where it stands</th></tr></thead><tbody>${rows}</tbody></table>
<h1 class="sec-start" id="gl" data-part="Glossary">Glossary</h1><div class="colflow" data-cls="gl">${gl}</div>
</div><script>${js}</script></body></html>`;
fs.writeFileSync(path.join(T,'test.html'),html);
