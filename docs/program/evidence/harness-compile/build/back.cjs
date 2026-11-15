// Back matter: glossary (two-column flow, grouped by where the term comes from) and sources.
'use strict';
const { P, H, md, esc, table } = require('./lib.cjs');

const CAT_TITLES = {
  'our-harness': 'Our own terms',
  'claude-code': 'Claude Code and Anthropic',
  'models': 'Models',
  'outside-source': 'Outside people, tools and ideas',
  'general-cs': 'General software terms',
  'statistics': 'Measurement and statistics',
  'system-dynamics': 'System dynamics',
  'fixflow': 'FixFlow',
  'machine': 'The machine',
};
const CAT_ORDER = ['our-harness', 'claude-code', 'models', 'outside-source', 'general-cs', 'machine', 'statistics', 'system-dynamics', 'fixflow'];

function glossary(ctx) {
  let h = `<div class="sec-start" data-part="Glossary"><div class="partlabel">Glossary</div><h1 id="gloss">Every term, and where it comes from</h1><div class="rule"></div>
  ${P(`${ctx.gloss.length} terms, grouped by where they come from and sorted A to Z inside each group. “Coined by us” means the term was made up in one of our own documents, named after it.`, 'lead')}</div>`;
  let items = '';
  CAT_ORDER.forEach(c => {
    const terms = ctx.gloss.filter(t => t.category === c).sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
    if (!terms.length) return;
    items += `<h4>${esc(CAT_TITLES[c])}</h4>`;
    terms.forEach(t => { items += `<div class="gt"><b>${esc(t.term)}</b> ${md(t.definition)}<span class="go">${md(t.origin)}</span></div>`; });
  });
  h += `<div class="colflow" data-cls="gl">${items}</div>`;
  return h;
}

function sources(ctx) {
  let h = `<div class="sec-start" data-part="Sources"><div class="partlabel">Sources</div><h1 id="sources">Where everything comes from</h1><div class="rule"></div>
  ${P('Paths are relative to the FixFlow repository unless marked. Branch-only documents live on the pull request named beside them.', 'lead')}</div>`;
  h += table([{ t: 'Document', w: '62mm' }, { t: 'Date', w: '20mm' }, { t: 'What it is' }], ctx.sources.map(s => [`<span class="nm">${esc(s[0])}</span><span class="org" style="margin-top:0.2mm">${esc(s[1])}</span>`, esc(s[2]), md(s[3])]), { cls: 'src' });
  h += `<div class="note"><p>${md(ctx.sourcesNote)}</p></div>`;
  // The method note sits here rather than in "How to read this", where it filled a page of its own.
  // "How to read this" already says who "I" and "we" are, so that sentence is not repeated.
  const made = String(ctx.howMade || '').replace(/^\*\*How this was compiled\.\*\*\s*/, '').replace(/\s*Throughout, “I” is me and “we” is the team\.\s*$/, '');
  if (made) h += H(2, 'How this compile was made', 'howmade') + P(made);
  return h;
}

module.exports = { glossary, sources, CAT_TITLES, CAT_ORDER };
