'use strict';
// Floor DIR as an arm of its own (protocol addendum 2, B.8): an empty head, so the answer is exactly
// what the shared padding tail `pad = DIR` gives (arms/common/padding.js: the seed's directory, then
// the same-named capability folder in every runtime, then outward by parent directory).
// It refuses any other pad, so a floor result can never be something else under the floor's name.
// Lookups: the empty head reports 0; the harness adds the padding tail's lookups the same way for every
// arm (arms/common/harness.js PAD_LOOKUPS: DIR = 1, a directory listing), so the record shows 1.
const PAD = 'DIR';

function open() {
  return {
    rank(seedIds, cfg) {
      if (cfg.pad !== PAD) throw new Error('INVALID CONFIG: floor-dir runs only with pad ' + PAD + ' (got ' + cfg.pad + ')');
      if (cfg.traversal || cfg.rank || cfg.search) throw new Error('INVALID CONFIG: a floor takes only granularity, form and pad');
      return { ranked: [], engine_ms: 0, lookups: 0 };
    },
    close() {},
  };
}

module.exports = { open, PAD };
