// Paginator: moves the blocks of #flow into fixed A4 page boxes, so the screen layout
// is exactly the printed layout and every page can be checked as a picture.
// Block rules (classes on direct children of #flow):
//   .newpage           start a new page here (an empty marker element)
//   .sec-start         this block starts on a fresh page
//   .kwn / h1 h2 h3    keep with next: never left last on a page
//   table.split        may be split between rows; the header row repeats
//   anything else      atomic: moves whole to the next page if it does not fit
// data-part="..."     sets the running header from this block on
// [data-toc="id"]     gets the page number of element #id
(function () {
  function makePage(pagesEl, n) {
    var p = document.createElement('section');
    p.className = 'page';
    p.innerHTML = '<div class="head"><span class="hl"></span><span class="hr"></span></div><div class="body"></div><div class="foot"><span class="fl"></span><span class="fr"></span></div>';
    p.dataset.n = String(n);
    pagesEl.appendChild(p);
    return p;
  }
  function fits(body) { return body.scrollHeight <= body.clientHeight + 0.5; }
  function isKwn(el) { return el && (el.classList.contains('kwn') || /^H[1-4]$/.test(el.tagName)); }

  function run() {
    var flow = document.getElementById('flow');
    var pagesEl = document.getElementById('pages');
    var blocks = Array.prototype.slice.call(flow.children);
    var overflow = [];
    var n = 1;
    var page = makePage(pagesEl, n);
    var body = page.querySelector('.body');
    var part = '';
    page.dataset.part = part;

    function newPage() {
      n += 1;
      page = makePage(pagesEl, n);
      body = page.querySelector('.body');
      page.dataset.part = part;
    }
    // When a block moves to a new page, bring the headings that introduce it along.
    function carryKwn(prevBody) {
      var carried = [];
      while (prevBody.lastElementChild && isKwn(prevBody.lastElementChild) && prevBody.children.length > 1) {
        carried.unshift(prevBody.lastElementChild);
        prevBody.removeChild(prevBody.lastElementChild);
      }
      carried.forEach(function (c) { body.appendChild(c); });
    }
    function label(el) { return (el.id ? '#' + el.id + ' ' : '') + (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70); }

    function placeTable(tbl) {
      var thead = tbl.querySelector('thead');
      var rows = Array.prototype.slice.call(tbl.querySelectorAll(':scope > tbody > tr'));
      var cap = tbl.querySelector('caption');
      function shell() {
        var t = tbl.cloneNode(false);
        if (cap && !shell.used) { t.appendChild(cap.cloneNode(true)); shell.used = true; }
        if (thead) t.appendChild(thead.cloneNode(true));
        var tb = document.createElement('tbody');
        t.appendChild(tb);
        return t;
      }
      var cur = shell();
      body.appendChild(cur);
      var tb = cur.querySelector('tbody');
      if (!fits(body)) {               // not even the header fits here
        body.removeChild(cur);
        var prev = body;
        newPage(); carryKwn(prev);
        body.appendChild(cur);
      }
      for (var i = 0; i < rows.length; i++) {
        tb.appendChild(rows[i]);
        if (fits(body)) continue;
        tb.removeChild(rows[i]);
        if (tb.children.length === 0) {  // header alone on this page: move the whole shell
          body.removeChild(cur);
          var prevB = body;
          newPage(); carryKwn(prevB);
          body.appendChild(cur);
          tb.appendChild(rows[i]);
          if (!fits(body)) overflow.push({ page: n, what: 'table row too tall: ' + label(rows[i]) });
          continue;
        }
        newPage();
        var t2 = tbl.cloneNode(false);
        if (thead) t2.appendChild(thead.cloneNode(true));
        var tb2 = document.createElement('tbody');
        t2.appendChild(tb2);
        t2.classList.add('cont');
        body.appendChild(t2);
        cur = t2; tb = tb2;
        tb.appendChild(rows[i]);
        if (!fits(body)) overflow.push({ page: n, what: 'table row too tall: ' + label(rows[i]) });
      }
    }

    // Two-column flow (glossary): fill the left column, then the right, then a new page.
    function placeColflow(el) {
      var items = Array.prototype.slice.call(el.children);
      function container() {
        var c = document.createElement('div');
        c.className = 'cols2 ' + (el.dataset.cls || '');
        c.innerHTML = '<div class="c"></div><div class="c"></div>';
        body.appendChild(c);
        return c;
      }
      var box = container();
      var col = 0;
      var cur = box.children[0];
      var first = true;
      items.forEach(function (it) {
        cur.appendChild(it);
        if (fits(body)) { first = false; return; }
        cur.removeChild(it);
        if (first) {                      // nothing of the flow fits here: start it on a new page, with its heading
          first = false;
          body.removeChild(box);
          var prevF = body;
          newPage(); carryKwn(prevF);
          box = container(); col = 0; cur = box.children[0];
          cur.appendChild(it);
          if (!fits(body)) overflow.push({ page: n, what: 'column item too tall: ' + label(it) });
          return;
        }
        var carry = [];
        while (cur.lastElementChild && isKwn(cur.lastElementChild) && cur.children.length > 1) { carry.unshift(cur.lastElementChild); cur.removeChild(cur.lastElementChild); }
        if (col === 0) { col = 1; cur = box.children[1]; }
        else { newPage(); box = container(); col = 0; cur = box.children[0]; }
        carry.forEach(function (c) { cur.appendChild(c); });
        cur.appendChild(it);
        if (!fits(body)) overflow.push({ page: n, what: 'column item too tall: ' + label(it) });
      });
      if (el.dataset.balance) balance(box);
    }
    // Last box of a flow: share its items between the two columns so the box is as short as it can be,
    // and what follows the flow can use the space below it. Opt-in (data-balance) so other layouts stay put.
    function balance(box) {
      var L = box.children[0], R = box.children[1];
      var all = Array.prototype.slice.call(L.children).concat(Array.prototype.slice.call(R.children));
      if (all.length < 2) return;
      function split(k) {
        all.forEach(function (it, i) { (i < k ? L : R).appendChild(it); });
        return box.getBoundingClientRect().height;
      }
      var best = all.length, bestH = split(all.length);
      for (var k = 1; k < all.length; k++) {
        if (isKwn(all[k - 1])) continue;              // never end the left column on a heading
        var h = split(k);
        if (h < bestH - 0.5) { bestH = h; best = k; }
      }
      split(best);
    }

    // Floats (.float): a figure that does not fit waits and opens the next page, while the blocks after it
    // keep filling this one. Floats keep their own order and never cross a part boundary.
    var deferred = [];
    function placeFloatsNow() {
      var d = deferred; deferred = [];
      d.forEach(function (f) { placeBlock(f, true); });
    }
    // Short edition: a block that misses by a little may close up the spacing on its page (class "tight").
    var SQUEEZE = document.body.dataset.ed === 'short';
    function fitsSqueezed() {
      if (fits(body)) return true;
      if (!SQUEEZE || body.classList.contains('tight')) return false;
      body.classList.add('tight');
      if (fits(body)) return true;
      body.classList.remove('tight');
      return false;
    }
    function placeBlock(el, noDefer) {
      var isFloat = !noDefer && el.classList.contains('float');
      if (isFloat && deferred.length) { deferred.push(el); return; }
      body.appendChild(el);
      if (fitsSqueezed()) return;
      body.removeChild(el);
      if (!body.children.length) { body.appendChild(el); overflow.push({ page: n, what: 'block taller than a page: ' + label(el) }); return; }
      if (isFloat) { deferred.push(el); return; }
      var prev = body;
      newPage();
      if (deferred.length) placeFloatsNow();
      carryKwn(prev);
      body.appendChild(el);
      if (fits(body)) return;
      body.removeChild(el);
      var prev2 = body;
      newPage(); carryKwn(prev2);
      body.appendChild(el);
      if (!fits(body)) overflow.push({ page: n, what: 'block taller than a page: ' + label(el) });
    }

    blocks.forEach(function (el) {
      if (el.dataset && el.dataset.part != null) { if (deferred.length) placeFloatsNow(); part = el.dataset.part; }
      if (el.classList.contains('colflow')) {
        if (deferred.length) placeFloatsNow();
        if (el.classList.contains('sec-start') && body.children.length) newPage();
        placeColflow(el); return;
      }
      if (el.classList.contains('newpage')) {
        if (deferred.length) placeFloatsNow();
        if (body.children.length) newPage();
        page.dataset.part = part;
        return;
      }
      if ((el.classList.contains('sec-start') || el.classList.contains('cover')) && body.children.length) { if (deferred.length) placeFloatsNow(); newPage(); }
      if (el.classList.contains('cover')) page.classList.add('is-cover');
      if (!body.children.length) page.dataset.part = part;
      if (el.tagName === 'TABLE' && el.classList.contains('split')) { if (deferred.length) placeFloatsNow(); placeTable(el); return; }
      placeBlock(el);
    });
    if (deferred.length) placeFloatsNow();

    // Running heads, page numbers, table of contents.
    var pages = pagesEl.querySelectorAll('.page');
    var total = pages.length;
    var title = document.body.dataset.short || '';
    Array.prototype.forEach.call(pages, function (p, i) {
      var cover = p.querySelector('.cover');
      if (cover) { p.classList.add('is-cover'); return; }
      p.querySelector('.hl').textContent = title;
      p.querySelector('.hr').textContent = p.dataset.part || '';
      p.querySelector('.fl').textContent = document.body.dataset.foot || '';
      p.querySelector('.fr').textContent = 'Page ' + (i + 1) + ' of ' + total;
    });
    var tocMissing = [];
    Array.prototype.forEach.call(document.querySelectorAll('[data-toc]'), function (t) {
      var target = document.getElementById(t.dataset.toc);
      if (!target) { tocMissing.push(t.dataset.toc); return; }
      var pg = target.closest('.page');
      t.textContent = pg ? pg.dataset.n : '?';
    });
    // Empty-ish pages are worth a look.
    var sparse = [];
    Array.prototype.forEach.call(pages, function (p) {
      var b = p.querySelector('.body');
      if (!p.classList.contains('is-cover') && b && b.scrollHeight < b.clientHeight * 0.35) sparse.push(Number(p.dataset.n));
    });
    // How full each page body is, in per cent: where the white space sits.
    var fill = [];
    Array.prototype.forEach.call(pages, function (p) {
      var b = p.querySelector('.body');
      if (!b || !b.lastElementChild || p.classList.contains('is-cover')) { fill.push(100); return; }
      fill.push(Math.round(100 * (b.lastElementChild.getBoundingClientRect().bottom - b.getBoundingClientRect().top) / b.clientHeight));
    });
    // What sits on each page and how tall it is (mm), to see where the space goes.
    var pxmm = 96 / 25.4;
    var map = [];
    Array.prototype.forEach.call(pages, function (p) {
      var b = p.querySelector('.body');
      map.push(b ? Array.prototype.map.call(b.children, function (c) {
        return Math.round(c.getBoundingClientRect().height / pxmm) + 'mm ' + c.tagName.toLowerCase() + (c.className ? '.' + String(c.className).split(' ')[0] : '') + ' ' + label(c).slice(0, 48);
      }) : []);
    });
    flow.parentNode.removeChild(flow);
    window.__paged = { pages: total, overflow: overflow, tocMissing: tocMissing, sparse: sparse, fill: fill, map: map };
  }
  function start() {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(run, 50); });
    else setTimeout(run, 50);
  }
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();
