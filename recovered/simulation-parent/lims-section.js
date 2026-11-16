  // ------------------------------------------------------------ section 4: limitations, by step
  // Weights come from PathwayEngine.weights() once at load (W8). data-w holds the exact score.
  var BRANCH_LABEL = function (bid) { return BR[bid].label + ' (' + STEP[STATE[BR[bid].from].step].label + ')'; };
  function pchip(id) {
    var row = ROWS[id], m = PMETA[id], sd = row.side === 'library' ? 'Library unknown; good end ' + row.good_end + '.' : 'Not a library unknown; stays at best in the weight.';
    return '<span class="pchip' + (row.side === 'library' ? ' lib' : '') + '" data-tip="' + esc('<b>' + esc(pname(id)) + '</b><br>' + esc(m.meaning) + '<br>Range ' + num(row.low, row.tag) + ' to ' + num(row.high, row.tag) + '<br>' + esc(sd) + '<br><span class="muted">Name in the files: ' + id + '</span>') + '">' + esc(pname(id)) + tagEl(row.tag) + '</span>';
  }
  function famNames(list) { return list.map(function (cn) { return LIM_FAM_NAME[cn.family] || cn.family_name; }).join(', '); }
  function limBranches(it) {
    var set = {}, tip = {};
    (it.params || []).forEach(function (p) { REACH[p].branches.forEach(function (b) { set[b] = 1; (tip[b] = tip[b] || []).push(pname(p)); }); });
    return { list: Object.keys(set), tip: tip };
  }
  function wbar(score) {
    var w = (50 * Math.abs(score) / WMAX).toFixed(1);
    return '<span class="wb" aria-hidden="true"><i class="' + (score < 0 ? 'neg p-hatch' : 'pos p-solid') + '" style="width:' + w + '%"></i></span>';
  }
  function wcell(score, attrs) {
    return '<span class="wv" data-tagged="G"' + (attrs || '') + ' data-w="' + score + '">' + wbar(score) + '<b>' + esc(fmt(score, 'weight')) + '</b></span>';
  }
  function renderRanks() {
    var S = TX.sections.lims;
    var top = W8.ranking.slice(0, 5).map(function (r) { return '<button type="button" class="rkrow" data-golim="' + r.id + '"><span class="rt">' + esc(LIM[r.id].title) + '</span>' + wcell(r.score) + '</button>'; }).join('');
    var steps = W8.stepRanking.slice(0, 5).map(function (r) { return '<button type="button" class="rkrow" data-gostep="' + r.step + '"><span class="rt"><span data-label="1">Step ' + r.step + '</span> · ' + esc(LIMS.steps[r.step].split(':')[0]) + '</span>' + wcell(r.score, ' data-wstep="' + r.step + '"') + '</button>'; }).join('');
    var seq = '<details class="inline"><summary>' + esc(S.sequence_title) + '</summary><p class="small muted">' + esc(S.sequence_note) + '</p><div class="seq" data-tagged="G">' + W8.sequence.map(function (q, i) {
      return '<span data-label="1">' + (i + 1) + '. step ' + q.step + '</span><span>' + esc(fmt(q.cumulative.score, 'weight')) + '</span>';
    }).join('') + '</div></details>';
    $('#limRanks').innerHTML = '<div class="rkbox"><h3>' + esc(S.rank_single) + ' ' + tagEl('G') + '</h3>' + top + '</div><div class="rkbox"><h3>' + esc(S.rank_steps) + ' ' + tagEl('G') + '</h3>' + steps + seq + '</div>';
  }
  function limDetail(it) {
    var w = WLIM[it.id], br = limBranches(it), S = TX.sections.lims;
    var h = '<div class="more"><p>' + esc(it.what) + '</p>' + (it.note ? '<p class="muted">' + esc(it.note) + '</p>' : '');
    if (it.real.examples && it.real.examples.length) h += '<div><b>Examples</b><ul class="ex">' + it.real.examples.map(function (x) { var k2 = C.caseId(x.case); return '<li data-tagged="M"><button type="button" class="linkbtn" data-gocase="' + k2 + '" data-label="1">' + esc(CASE[k2] ? CASE[k2].title : k2) + '</button>: <span class="mono">' + esc(x.evidence) + '</span></li>'; }).join('') + '</ul></div>';
    if (it.contradicted.length) h += '<div><b>Where real cases went the other way</b><ul class="ex">' + it.contradicted.map(function (cn) { return '<li data-tagged="M">' + esc(LIM_FAM_NAME[cn.family] || cn.family_name) + ': ' + esc(cn.reason) + '</li>'; }).join('') + '</ul></div>';
    if (it.shown && it.shown !== 'yes') h += '<p><b>' + esc(it.shown === 'no' ? S.shown_no : S.shown_partly) + '</b> ' + esc(it.not_shown || '') + '</p>';
    h += '<p><b>Unknowns:</b> ' + (it.params.length ? it.params.map(pchip).join(' ') : 'none in the model.') + '</p>';
    if (it.params.length) {
      if (!w.moved.length) h += '<p class="small">' + esc(S.zero) + '</p>';
      else h += '<table class="ptable wtab" data-tagged="G"><tr><th>When its library unknowns move ' + tagEl('G') + '</th><th>before</th><th>after</th></tr>' +
        [['cost_vs_ladder', 'Cost against the ladder'], ['wrong_vs_ladder', 'Wrong rate against the ladder'], ['cost_vs_top', 'Cost against the strong model'], ['wrong_vs_top', 'Wrong rate against the strong model']].map(function (r) {
          return '<tr><td>' + esc(r[1]) + '</td><td>' + esc(fmt(W8.base.ratios[r[0]], 'ratio')) + '</td><td>' + esc(fmt(w.values.ratios[r[0]], 'ratio')) + '</td></tr>';
        }).join('') + '<tr><td>Funnel’s last number, of a hundred</td><td>' + esc(fmt(W8.base.funnel_end, 'funnel')) + '</td><td>' + esc(fmt(w.values.funnel_end, 'funnel')) + '</td></tr></table>';
    }
    h += '<p class="small"><b>Steps it touches:</b> <span data-label="1">' + it.steps.join(', ') + '</span>. <b>On the map:</b> ' + (br.list.length ? '<span data-label="1">' + br.list.length + '</span> branches use its unknowns.' : 'no branch uses its unknowns.') + classNote(it) + '</p>';
    if (it.real.case_ids.length) h += '<p class="small"><b>Real cases:</b> ' + it.real.case_ids.map(function (cid) { var k2 = C.caseId(cid); return '<button type="button" class="linkbtn" data-gocase="' + k2 + '" data-label="1">' + k2 + '</button>'; }).join(', ') + '</p>';
    if (ST.lim === it.id && br.list.length) h += '<div class="graph mini chart-scroll" id="mini-' + it.id + '"></div><p class="small muted">' + esc(S.map_note) + '</p>';
    return h + '<p class="small muted">Name in the files: <span class="mono">' + it.id + '</span></p></div>';
  }
  function renderLims() {
    var groups = {};
    LIMS.items.forEach(function (it) { (groups[it.main_step] = groups[it.main_step] || []).push(it); });
    var h = '<div class="lhead" aria-hidden="true"><span>Limitation</span><span>cases ' + tagEl('M') + '</span><span>families ' + tagEl('M') + '</span><span>other way ' + tagEl('M') + '</span><span>weight ' + tagEl('G') + '</span></div>';
    Object.keys(LIMS.steps).forEach(function (k) {
      var list = groups[k] || [], ws = WSTEP[+k];
      var allOpen = list.length && list.every(function (it) { return ST.limOpen[it.id]; });
      h += '<div class="stepgrp" id="lstep-' + k + '"><button type="button" class="sghead" data-openstep="' + k + '" aria-expanded="' + allOpen + '"><span><span data-label="1">Step ' + k + '</span> · ' + esc(LIMS.steps[k].split(':')[0]) + ' <small class="muted" data-tagged="M">(' + list.length + ')</small></span>' + (ws ? wcell(ws.holds.score, ' data-wstep="' + k + '"') : '') + '</button>';
      list.forEach(function (it) {
        var open = !!ST.limOpen[it.id], w = WLIM[it.id];
        h += '<div class="lim' + (open ? ' open' : '') + '" data-lim="' + it.id + '"><button type="button" class="lrow" aria-expanded="' + open + '">' +
          '<span class="lt">' + esc(it.title) + (it.real.cases ? '' : ' <small class="muted">thought experiment</small>') + '</span>' +
          '<span class="lc" data-tagged="M">' + (it.real.cases || '') + '</span><span class="lc" data-tagged="M">' + (it.real.families || '') + '</span><span class="lc" data-tagged="M">' + (it.contradicted.length || '') + '</span>' +
          wcell(w.holds.score) + '</button>' + (open ? limDetail(it) : '') + '</div>';
      });
      h += '</div>';
    });
    $('#limlist').innerHTML = h;
    if (ST.lim && ST.limOpen[ST.lim]) paintMini(LIM[ST.lim]);
    $('#workslist').innerHTML = LIMS.works.map(function (w, i) {
      var k = C.caseId(w.case), c = CASE[k], open = !!ST.limOpen['work' + i];
      return '<div class="work' + (open ? ' open' : '') + '" data-tagged="' + w.tag + '"><button type="button" class="lrow wrow" data-work="' + i + '" aria-expanded="' + open + '"><span class="lt">' + esc(c.title) + '</span><span class="small">' + (w.basis === 'seen' ? 'seen' : 'estimate') + tagEl(w.tag) + (w.channel ? ' · ' + esc(TX.sections.lims.channel) : '') + '</span></button>' +
        (open ? '<div class="more"><span>' + esc(w.text) + ' ' + tagEl(w.tag) + '</span>' + (w.channel ? '<span class="wch">Carried by ' + esc(w.channel) + ', a channel that exists today.</span>' : '') + (w.caveat ? '<span class="wcav">' + esc(w.caveat) + '</span>' : '') +
          '<span class="small muted">' + esc(FAM[c.family].name) + ' · <button type="button" class="linkbtn" data-gocase="' + k + '" data-label="1">' + k + '</button></span></div>' : '') + '</div>';
    }).join('');
  }
  function classNote(it) {
    var cls = (it.params || []).filter(function (p) { return REACH[p].classes; }).map(pname);
    var stk = (it.params || []).filter(function (p) { return REACH[p].stocks && !REACH[p].branches.length; }).map(pname);
    var s = '';
    if (cls.length) s += ' ' + esc(cls.join(', ')) + ' also ' + (cls.length === 1 ? 'shapes' : 'shape') + ' which work arrives and what the library holds.';
    if (stk.length) s += ' ' + esc(stk.join(', ')) + ' ' + (stk.length === 1 ? 'acts' : 'act') + ' on the stock of entries over time.';
    return s;
  }
  function paintMini(it) {
    var el = document.getElementById('mini-' + it.id); if (!el) return;
    var bands = {};
    it.steps.forEach(function (k) { (TX.design_steps[k] || []).forEach(function (st) { bands[st] = Math.max(bands[st] || 0, 1); }); });
    (TX.design_steps[it.main_step] || []).forEach(function (st) { bands[st] = 2; });
    var br = limBranches(it), on = new Set(br.list), onS = new Set();
    br.list.forEach(function (b) { onS.add(BR[b].from); onS.add(BR[b].to); });
    drawGraph(el, { mini: true, on: on, onStates: onS, bands: bands, limTip: br.tip });
  }
  function selectLim(id, scroll) {
    if (scroll) { ST.limOpen[id] = true; ST.lim = id; }
    else { ST.limOpen[id] = !ST.limOpen[id]; ST.lim = ST.limOpen[id] ? id : null; }
    renderLims();
    if (scroll) { var el = document.querySelector('[data-lim="' + id + '"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }
  function toggleStep(k, scroll) {
    var list = LIMS.items.filter(function (it) { return String(it.main_step) === String(k); });
    var allOpen = list.every(function (it) { return ST.limOpen[it.id]; });
    list.forEach(function (it) { ST.limOpen[it.id] = scroll ? true : !allOpen; });
    ST.lim = null;
    renderLims();
    if (scroll) { var el = document.getElementById('lstep-' + k); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  $('#limlist').addEventListener('click', function (e) {
    if (e.target.closest('.linkbtn,.pchip,.more')) return;
    var s = e.target.closest('[data-openstep]'); if (s) { toggleStep(s.dataset.openstep); return; }
    var r = e.target.closest('[data-lim]'); if (r) selectLim(r.dataset.lim);
  });
  $('#workslist').addEventListener('click', function (e) {
    if (e.target.closest('.linkbtn')) return;
    var r = e.target.closest('[data-work]'); if (!r) return;
    ST.limOpen['work' + r.dataset.work] = !ST.limOpen['work' + r.dataset.work]; renderLims();
  });
  $('#limRanks').addEventListener('click', function (e) {
    var s = e.target.closest('[data-gostep]'); if (s) toggleStep(s.dataset.gostep, true);
  });

