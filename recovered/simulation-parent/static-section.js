  // ------------------------------------------------------------ static text
  function renderStatic() {
    // Above the map: a title, two sentences and the tags on one line. Nothing else.
    $('#hero').innerHTML = '<h1>' + esc(TX.title) + '</h1><p class="lede">' + TX.hero.map(rich).join(' ') + '</p>' +
      '<p class="taglegend">' + ['M', 'S', 'G'].map(function (t) { return '<span>' + tagEl(t) + ' ' + esc(TX.tags[t]) + '</span>'; }).join('') + '</p>';
    var S = TX.sections;
    $('#mapTitle').textContent = S.map.title; $('#mapLede').innerHTML = rich(S.map.lede);
    $('#funnelTitle').textContent = S.funnel.title; $('#funnelLede').innerHTML = rich(S.funnel.lede) + ' ' + esc(S.funnel.marks);
    $('#casesTitle').textContent = S.cases.title; $('#casesLede').innerHTML = rich(S.cases.lede); $('#casesWarn').innerHTML = rich(S.cases.warning);
    $('#limsTitle').textContent = S.lims.title; $('#limsLede').innerHTML = rich(S.lims.lede); $('#weightDef').innerHTML = esc(S.lims.weight_def) + ' ' + tagEl('G');
    $('#worksTitle').textContent = S.lims.works_title; $('#worksLede').innerHTML = rich(S.lims.works_lede);
    $('#runTitle').textContent = S.run.title; $('#runLede').innerHTML = rich(S.run.lede);
    $('#manyTitle').textContent = S.many.title; $('#manyLede').innerHTML = rich(S.many.lede);
    $('#leavesTitle').textContent = S.leaves.title; $('#leavesLede').innerHTML = rich(S.leaves.lede);
    $('#leavesList').innerHTML = TX.leaves_out.map(function (l) { return '<details class="leftout"><summary>' + esc(l.t) + '</summary><span>' + rich(l.x) + '</span></details>'; }).join('');
    $('#wordsList').innerHTML = '<dl>' + TX.words.map(function (w) { return '<div><dt>' + esc(w[0]) + '</dt><dd>' + esc(w[1]) + '</dd></div>'; }).join('') + '</dl>';
    $('#foot').innerHTML = '<p data-label="1">Built ' + esc(D.build.date) + ' from <span class="mono">docs/program/library-pathways/</span> (map version ' + esc(MAP.version) + ') by <span class="mono">build-page.js.txt</span>. Record: <span class="mono">docs/program/LIBRARY-PATHWAYS-2026-11.md</span>.</p>';
  }

  // ------------------------------------------------------------ start
  renderStatic();
  renderGraphLegend();
  renderFunnelControls();
  renderFunnelLegend();
  renderCellLegend();
  renderGrid();
  renderCase();
  renderRanks();
  renderLims();
  renderRefs();
  renderSliders();
  renderLoops();
  renderEnsControls();
  renderEnsemble();
  recompute();
  window.__lp = { E: E, C: C, best: BEST, cur: function () { return cur; }, path: function () { return PATH; }, funnel: function () { return FV; }, weights: W8, refs: REFS, counts: FCOUNT };
})();
