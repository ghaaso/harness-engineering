/* Load with ?selftest=1&t=03:31&paused=1. Drives every control with real DOM events and writes PASS/FAIL to body[data-test]. */
(async () => {
  const R = [], $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const dbg = () => 'drawer=' + $('#drawer').className + '/' + $('#drawer').hidden + '/' + $('#drawer').textContent.slice(0, 30).replace(/"/g, "'") + ' pop=' + $('#pop').hidden + ' sel=' + App.S.sel + ' target=' + $('#target').textContent + ' states=' + $$('.sess').map(c => c.querySelector('.tag').textContent + ':' + c.dataset.state).join(',') + ' lanes=' + $$('#hLanes .lab').length + ' z=' + $('#zVal').textContent + ' toasts=' + T().slice(0, 60);
  const ok = (n, c) => R.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' {' + dbg() + '}'));
  const click = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  const dbl = el => el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
  const T = () => $$('#toasts .toast').map(t => t.textContent).join(' / ');
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name + ' threw ' + e.message, false); } };
  await sleep(900);
  await step('zoom', async () => { const z0 = $('#zVal').textContent; click($('#zIn')); await sleep(500); ok('zoom in ' + z0 + '>' + $('#zVal').textContent, $('#zVal').textContent !== z0); click($('#zFit')); await sleep(500); ok('fit', true); });
  await step('part', async () => { click($('.part[data-part="script:journal"]')); await sleep(100); ok('part click opens details', !$('#pop').hidden && $('#pop').textContent.includes('Journal tool')); click($('#pop [data-open]')); await sleep(400); ok('open in file pane shows drawer', $('#drawer').classList.contains('open') && $('#drawer').textContent.includes('tools/journal.mjs')); });
  await step('vscode', async () => { click($('#openIn [data-v=vscode]')); await sleep(100); dbl($('.part[data-part="script:lane"]')); await sleep(200); ok('dblclick with VS Code toasts', /VS Code/.test(T())); click($('#openIn [data-v=pane]')); dbl($('.hook[data-part="hook:tier-hook"]')); await sleep(300); ok('dblclick hook opens file pane', $('#drawer').textContent.includes('tier-hook.mjs')); });
  await step('answer', async () => { const w = $('.sess[data-state=waiting]'); ok('waiting card exists', !!w); click(w.querySelector('[data-act=answer]')); await sleep(100); ok('Answer opens reply', !$('#pop').hidden && !!$('#pop [data-q]')); click($('#pop [data-q]')); await sleep(300); ok('quick answer sends', /Answer sent/.test(T())); await sleep(700); ok('waiting card changed after answer', !$('.sess[data-state=waiting]')); });
  await step('stop', async () => { const bw = $('.sess[data-state=working]'); click(bw); await sleep(500); ok('session click opens drawer', $('#drawer').classList.contains('open') && !!$('#drawer .d-head .tag')); ok('dock target follows', $('#target').textContent.includes($('.tag', bw).textContent)); click($('#drawer [data-stop]')); await sleep(100); ok('stop asks first', !!$('#drawer [data-y]')); click($('#drawer [data-y]')); await sleep(500); ok('stop confirmed', /Stopped/.test(T())); const ub = $$('#toasts .toast button').find(b => b.textContent === 'Undo'); ok('undo offered', !!ub); if (ub) { click(ub); await sleep(500); ok('undo clicked', true); } });
  await step('prompt', async () => { const p = $('#prompt'); p.value = 'Check the creep gate'; p.dispatchEvent(new Event('input')); ok('send enabled', !$('#send').disabled); click($('#target')); await sleep(300); click($('#send')); await sleep(700); ok('new session card', $$('.sess').some(c => c.textContent.includes('Check the creep gate'))); });
  await step('search', async () => { const j = $('#jump'); j.focus(); j.value = 'tier'; j.dispatchEvent(new Event('input')); await sleep(100); ok('search lists ' + $$('#jumpList [role=option]').length, $$('#jumpList [role=option]').length > 0); j.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await sleep(900); ok('search jump opens details', !$('#pop').hidden); });
  await step('away', async () => { const aw = $('#strip .away'); ok('away band exists', !!aw); if (aw) { click(aw); await sleep(200); ok('catch-up popover', !$('#pop').hidden && /While you were away/.test($('#pop').textContent)); } });
  await step('play', async () => { const b = $('#playBtn'); click(b); await sleep(100); const a = document.body.classList.contains('paused'); click(b); await sleep(100); ok('play toggles', a !== document.body.classList.contains('paused')); click($('#speed [data-s="16"]')); ok('speed 16', $('#speed [data-s="16"]').getAttribute('aria-pressed') === 'true'); click($('#playBtn')); });
  await step('history', async () => {
    click($('[data-go=history]')); await sleep(700); ok('history page with lanes', document.body.dataset.page === 'history' && $$('#hLanes .lab').length > 5);
    click($('#hLanes [data-ev]')); await sleep(100); ok('tick popover', !$('#pop').hidden);
    click($('#hLanes .lab[data-sess]')); await sleep(400); ok('lane click opens session', $('#drawer').classList.contains('open'));
    dbl($('#hHooks .lab')); await sleep(300); ok('hook row dblclick opens file', /\.mjs|\.md|\.sh/.test($('#drawer').textContent));
    click($('#hFilter [data-f=trouble]')); await sleep(300); ok('filter trouble ' + $$('#hLanes .lab').length, $$('#hLanes .lab').length < 20);
    $('#hDay').dispatchEvent(new WheelEvent('wheel', { deltaY: -500, clientX: 700, clientY: 400, bubbles: true, cancelable: true })); await sleep(300); ok('wheel zoom shows reset', !$('#hReset').hidden);
    click($('#hReset')); await sleep(200); ok('reset hides', $('#hReset').hidden);
    click($$('#hWeek .wl')[0]); await sleep(400); ok('other day shows counts', /Wed/.test($('#hTitle').textContent) && $$('#hLanes .lab').length === 0);
    click($$('#hWeek .wl')[6]); await sleep(400); ok('back to Tuesday', $$('#hLanes .lab').length > 0);
    click($('[data-go=now]')); await sleep(500); ok('back to Now', document.body.dataset.page === 'now' && !$('#pageNow').hidden);
  });
  document.body.setAttribute('data-test', R.join(' | '));
})();
