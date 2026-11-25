// Builds round8/research.html from the four researchers' pictures. Run: node build-research-page.mjs
import fs from 'node:fs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const pic = (id, n) => {
  const dir = path.join(here, 'research', id);
  const f = fs.readdirSync(dir).find((x) => x.startsWith(String(n).padStart(2, '0') + '-') && x.endsWith('.png'));
  return f ? `research/${id}/${f}` : null;
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const take = [
  ['Now', 'A fixed board of the real parts: every hook, script, skill, command and helper kind by name, in fixed places, all grey. A session shows up on the part it is touching. Trouble is the only colour, and its mark stays until you have seen it.', 'rail track diagram, control-room screens'],
  ['History', 'The week as seven day-strips that are never cut: white where nothing ran, a rising edge where work started, red where something broke. A window onto session lanes with their helpers packed underneath. One thin row per hook on the same time axis.', 'Nx, Chrome DevTools, Grafana, Sentry'],
  ['Needs you', 'One loud mark on the session that is waiting for you, with the answer buttons on it. Sessions in a side rail ordered by need, the waiting ones pushed out of line.', 'Buildkite, cmux, flight strips'],
  ['Operate', 'One prompt box in a fixed place that talks to whatever is selected: nothing selected starts a session, a session selected gets the message. Stop beside Send.', 'Vibe Kanban, Conductor, Warp'],
  ['Smooth', 'Each thing is kept and moved, never redrawn. A part pulses once when it fires, then fades. Only position and transparency animate. Round 7 redrew the whole panel on each read, which is the likely cause of its lag.', 'D3 object constancy, web.dev, Heer and Robertson 2007'],
];

const sections = [
  { id: 'd1', title: 'Now: what is running, on which part, what broke', cards: [
    [13, 'Rail live track diagram', 'The real track drawn once. Each train\'s id sits inside the section it occupies; signals are red or green dots; unknown is a hollow dot.', 'The board of real parts, with sessions on them. No lines between movers and parts, so no mesh.', 'screen seen, help page read'],
    [8, 'Control-room screen, high-performance style', 'Everything grey. Colour appears only for a problem, as a small shape with a priority number on the equipment itself.', 'Trouble is the only colour, placed on the part. A separate dark grey for "scheduled".', 'screen seen, page read'],
    [7, 'The same screen before', 'Colour everywhere, so nothing stands out.', 'What not to do; close to round 7\'s grey cards with red words.', 'screen seen'],
    [3, 'Node-RED node status', 'A dot or ring in five colours under each node.', 'Shape and colour give our four results: let through, refused, failed, not switched on. Keep the mark, drop the words.', 'screen seen, page read'],
    [15, 'Cluster view by containment', 'Boxes inside boxes: machine, then each job as a small square; border colour is status; new and ended jobs animate.', 'Sessions as boxes holding their helpers as squares. Made for a wall screen.', 'screen seen, README read'],
    [10, 'Ableton track status', 'A small pie under a track shows a loop going round and how many times.', 'Work going round in loops, shown with a count.', 'screen seen, manual read'],
    [1, 'Datadog service map', 'Border red or yellow by health; traffic animates only on the service under the pointer.', 'Warning: at 116 services the labels collide and the lines are a mesh, in their own picture.', 'screen seen, page read'],
    [4, 'Datadog host map', 'One small cell per machine, grouped in named areas, no lines, the whole screen used.', 'Fills the screen with balance; but colour everywhere is not calm, and cells have no names.', 'screen seen, page read'],
  ]},
  { id: 'd2', title: 'History: unbroken time, gaps and starts plain at once', cards: [
    [1, 'Nx Cloud timeline', 'A strip of "how many were running" over packed lanes. A block of work, an empty middle, a second block.', 'Its author: "You don\'t need to read a single task name to see the problem." Gaps and starts read from the shape.', 'screen seen, page read'],
    [2, 'Chrome DevTools overview strip', 'The whole recording as a strip with two handles; the big view shows the window you drag.', 'A week strip above, the chosen stretch below; zoom from a week to minutes with one drag.', 'screen seen'],
    [8, 'Grafana state timeline', 'One row per named thing; nothing is drawn where nothing happened.', 'A thin row per hook: let through, refused, failed, or silent, on the same clock as the sessions.', 'screen seen, page read'],
    [12, 'Firefox Profiler tracks', 'Activity per track, with a strip of marks above it; red where the program stopped answering.', 'Only the red reads without hovering: one colour for trouble, the rest pale.', 'screen seen, page read'],
    [4, 'Sentry: quiet time folded, with its length', 'Empty stretches are cut out and drawn as a hatched band with the removed time on it.', 'In the zoomed view, a quiet 45 minutes becomes a band that says "45 min".', 'screen seen, pages read'],
    [15, 'Quiet time cut with no mark', 'Nights removed from the axis with nothing drawn; a two-day gap looks like no gap.', 'What not to do.', 'screen seen, live example run'],
    [6, 'Honeycomb trace summary', 'The whole tree as rows of depth; children under the parent with no lines; the failed one stays red.', 'Helpers under their session without a mesh of lines.', 'screen seen'],
    [14, 'Temporal: a parent with 1,000 children', 'Every child is a row: a list to scroll, with no summary.', 'Our scale problem on a real screen: 800 helpers a week cannot be rows.', 'screen seen, page read'],
  ]},
  { id: 'd3', title: 'Operate: who needs you, answer, prompt, jump', cards: [
    [1, 'Buildkite: the step that waits for you', 'Finished steps are thin outlines; the waiting step has a strong outline, a pause mark and the button on it.', 'One loud mark where the session stands, answered in place.', 'screen seen'],
    [2, 'cmux: what the agent asks, on its tab', 'Each agent\'s latest notice in its own words, with a count badge when it needs you.', 'You learn what is asked without opening the chat. Claude Code\'s Notification hook can supply the line.', 'screen seen'],
    [9, 'Flight progress strips', 'One strip per flight; the position in the rack is the state; a strip pushed out of line means "look here".', 'A rail of sessions ordered by need; the waiting ones offset.', 'page read'],
    [7, 'Warp: blocked on you, apart from failed', 'Blocked (yellow) and failed (red) are different marks; children are small pills on their parent.', 'Helpers as pills on their session; the session carries its helpers\' worst state.', 'screen seen, page read'],
    [5, 'Vibe Kanban: one prompt box, Queue and Stop', 'The box sits in the same corner; a message can wait while the agent works; Stop is one click.', 'One prompt box in a fixed place. Its columns by state are the empty grey you rejected.', 'screen seen'],
    [3, 'Conductor workspaces', 'A list, one chat, touched files as chips with +/- counts.', 'Jumping and prompting work; but no time, no who-started-whom and no hooks by name. None of the tools seen shows the real parts.', 'screen seen'],
  ]},
];

const app = [
  ['Open a session in the app', 'yes, by its id (a documented command)'],
  ['Start a new session with your prompt filled in', 'yes (a documented link)'],
  ['Message, answer or stop a session started in the app', 'nothing documented; only sessions the tool starts itself, which do not appear in the app\'s sidebar'],
  ['Open a hook or file in VS Code', 'VS Code is not installed on this PC; the tool can show the file itself'],
  ['Live data', 'session records are written about every 150 ms: smooth updating is possible'],
];

const card = (id, [n, name, what, us, known]) => {
  const src = pic(id, n);
  return `<figure class="card">${src ? `<a href="${src}"><img src="${src}" alt=""></a>` : '<div class="nopic">no picture</div>'}
<figcaption><b>${esc(name)}</b><p>${esc(what)}</p><p class="us">${esc(us)}</p><p class="known">${esc(known)}</p></figcaption></figure>`;
};

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Session tool: research, round 8</title>
<style>
:root{--ink:#1d232b;--soft:#5b6570;--line:#e3e6ea;--bg:#f6f7f8;--accent:#1f5fbf}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 "Segoe UI",system-ui,sans-serif}
header{padding:28px 40px 8px}h1{font-size:26px;margin:0 0 4px}header p{margin:0;color:var(--soft)}
.take{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;padding:18px 40px 8px}
.take div{background:#fff;border:1px solid var(--line);border-top:4px solid var(--accent);border-radius:8px;padding:14px 16px}
.take b{display:block;font-size:17px;margin-bottom:6px}.take p{margin:0}.take small{display:block;color:var(--soft);margin-top:8px}
section{padding:18px 40px 6px}h2{font-size:20px;margin:10px 0 12px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.card{margin:0;background:#fff;border:1px solid var(--line);border-radius:8px;overflow:hidden;display:flex;flex-direction:column}
.card img{display:block;width:100%;height:230px;object-fit:contain;background:#eceef1}
.nopic{height:230px;display:grid;place-items:center;color:var(--soft);background:#eceef1}
figcaption{padding:10px 14px 12px}figcaption b{font-size:15px}figcaption p{margin:5px 0 0}
.us{color:var(--accent)}.known{color:var(--soft);font-size:13px}
table{border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:8px;width:100%}
td{padding:9px 14px;border-top:1px solid var(--line)}td:first-child{font-weight:600;width:38%}
footer{padding:16px 40px 30px;color:var(--soft);font-size:13px}
</style></head><body>
<header><h1>Session tool: what real screens do, and what we take from them</h1>
<p>Four researchers, 24 November. Pictures from the products' own pages. Blue line under each = what it means for your tool.</p></header>
<div class="take">${take.map(([h, t, s]) => `<div><b>${h}</b><p>${esc(t)}</p><small>${esc(s)}</small></div>`).join('')}</div>
${sections.map((s) => `<section><h2>${esc(s.title)}</h2><div class="grid">${s.cards.map((c) => card(s.id, c)).join('')}</div></section>`).join('')}
<section><h2>What the Claude Code app lets the tool do</h2><table>${app.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table></section>
<footer>Not seen: flight radar and Unreal Blueprint pages (bot checks, not bypassed), Perfetto's live viewer, n8n and ComfyUI execution views, several agent tools (Cursor, Codex, Devin, Jules). The studies were read as abstracts only. Full findings: research/d1 to d3 and c4.</footer>
</body></html>`;
fs.writeFileSync(path.join(here, 'research.html'), html);
console.log('research.html written');
