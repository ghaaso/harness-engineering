/* One icon family: 24 grid, 1.75 stroke, round caps (skill: icon-style-consistent, stroke consistency, no emoji).
   Decorative icons are aria-hidden; controls that hold only an icon get an aria-label where they are made. */
(function () {
  var P = {
    logo: '<path d="M4 6h9M4 12h13M4 18h7"/><circle cx="19" cy="18" r="1.6" class="dot"/>',
    hook: '<path d="M12 3l7 3v5.5c0 4.6-3 7.7-7 9.5-4-1.8-7-4.9-7-9.5V6z"/>',
    helper: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V5M9.5 13.5h.01M14.5 13.5h.01"/>',
    command: '<path d="M5 7l5 5-5 5M13 17h6"/>',
    skill: '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M19 15v5M16.5 17.5h5"/>',
    slash: '<path d="M8 20L16 4"/>',
    script: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M10 13l-2 2 2 2M14 13l2 2-2 2"/>',
    test: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M8 15h8"/>',
    git: '<circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="8" r="2.4"/><path d="M6 8.4v7.2M18 10.4c0 4.2-5.5 3.2-11 5.8"/>',
    store: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    setting: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    play: '<path d="M7 5l12 7-12 7z"/>',
    pause: '<path d="M8.5 5v14M15.5 5v14" stroke-width="2.6"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    send: '<path d="M4 12l16-8-6 16-3-7z"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    wait: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
    work: '<path d="M5 14v-4M9.5 18V6M14.5 15V9M19 13v-2"/>',
    quiet: '<circle cx="12" cy="12" r="8"/>',
    ended: '<circle cx="12" cy="12" r="8"/><path d="M8.5 12.2l2.6 2.6 4.4-5"/>',
    stopped: '<circle cx="12" cy="12" r="8"/><path d="M9 9l6 6M15 9l-6 6"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-5 7-5s6 1 7 5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    spin: '<path d="M12 3a9 9 0 1 0 9 9"/>',
    ring: '<circle cx="12" cy="12" r="6.5"/>',
    tri: '<path d="M12 4l9 16H3z"/>',
    dia: '<path d="M12 3l8 9-8 9-8-9z"/>',
    bot: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V5M9.5 13.5h.01M14.5 13.5h.01"/>',
    helpers: '<circle cx="8" cy="9" r="2.6"/><circle cx="16.5" cy="9" r="2.6"/><path d="M3 19c.6-3 2.7-4.4 5-4.4s4.4 1.4 5 4.4M13.5 15c.8-.3 1.8-.4 3-.4 2.3 0 4 1.4 4.5 4.4"/>'
  };
  var FILL = { tri: 1, dia: 1, play: 1 };
  window.ICON = function (name, cls) {
    var p = P[name] || P.quiet;
    return '<svg class="i ' + (cls || '') + (FILL[name] && cls && cls.indexOf('fill') > -1 ? '' : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + p + '</svg>';
  };
  window.ICON_PATH = P;
})();
