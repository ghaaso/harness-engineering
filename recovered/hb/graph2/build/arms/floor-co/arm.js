'use strict';
// Floor CO as an arm of its own (protocol addendum 2, B.8): an empty head, so the answer is exactly
// what the shared padding tail `pad = CO` gives (arms/common/padding.js: files changed together with
// the seed file in the counted commits of the facts' commits.jsonl, by count, then recency, then
// path; then the DIR order).
// It refuses any other pad, so a floor result can never be something else under the floor's name.
// Lookups: the empty head reports 0; the harness adds the padding tail's lookups the same way for every
// arm (arms/common/harness.js PAD_LOOKUPS: CO = 2, a `git log` for the co-changed files and a directory
// listing for the DIR rest), so the record shows 2.
const PAD = 'CO';

function open() {
  return {
    rank(seedIds, cfg) {
      if (cfg.pad !== PAD) throw new Error('INVALID CONFIG: floor-co runs only with pad ' + PAD + ' (got ' + cfg.pad + ')');
      if (cfg.traversal || cfg.rank || cfg.search) throw new Error('INVALID CONFIG: a floor takes only granularity, form and pad');
      return { ranked: [], engine_ms: 0, lookups: 0 };
    },
    close() {},
  };
}

module.exports = { open, PAD };
