// Scans the printed text fields for wording that breaks the owner's voice or the house rules.
// Usage: node scan.cjs
'use strict';
const fs = require('fs'), path = require('path');
const DATA = path.resolve(__dirname, '..', 'data');
const cat = JSON.parse(fs.readFileSync(path.join(DATA, 'catalogue.json'), 'utf8'));
const reg = JSON.parse(fs.readFileSync(path.join(DATA, 'register.json'), 'utf8'));
const gl = JSON.parse(fs.readFileSync(path.join(DATA, 'glossary.json'), 'utf8'));
const RULES = [
  ['owner', /\b(the owner|owner['’]s|an owner|owner decides|owner rul|owner said|owner asked|owner chose|owner critique|owner view|owner page)\b/i],
  ['pronoun', /\b(he|him|his|himself|she|her|hers|herself)\b/],
  ['money', /\$|\bdollars?\b|\bUSD\b|\bcents?\b/i],
  ['rawid', /\b(G[1-5]-F\d+|A\d-\d+|horthy[AB]-\d+|ksA-\d+|ksB-\d+|clinic[A-Z]-\d+|[a-z]+#\d+)\b/],
];
const hits = [];
const look = (where, field, s) => RULES.forEach(([n, re]) => { const m = String(s || '').match(re); if (m) hits.push(`${n}\t${where}\t${field}\t…${String(s).slice(Math.max(0, m.index - 40), m.index + 50)}…`); });
cat.themes.forEach(t => { (t.intro || []).forEach((p, i) => look(t.code, 'intro' + i, p)); t.ideas.forEach(i => ['name', 'how', 'problem', 'stands', 'next', 'origin'].forEach(f => look(`${i.k} ${i.id}`, f, i[f]))); });
reg.bottlenecks.forEach(b => ['name', 'what', 'evidence', 'potential', 'first_step', 'state'].forEach(f => look(b.id, f, b[f])));
gl.terms.forEach(t => ['term', 'definition', 'origin'].forEach(f => look(t.key + ' ' + t.term, f, t[f])));
console.log(hits.join('\n'));
console.log('hits', hits.length);
