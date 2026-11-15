// The compile's update of 14 November 2026 with the WP12 result: the split rule, its replay, the owner's yes to one
// trial wave at 300k and the trial's set-up (docs/program/SPLIT-RULE-2026-11.md, parts 4 to 6).
// It edits data/added.json (PAR-22, TOK-44, TK-FILL, PR-HALLU, two text rules for TOK-02 and TK-SUMMARIES, the
// glossary), data/catalogue-extra.json (the reference edition's method note), data/sources.json (the new source),
// data/packages.json (WP12, the start counts) and data/short.json (the lens text both editions print).
// Every change is an exact replacement that fails loudly when its target is missing. The script expects the data as
// it stood before the update or as it stands after it, and is safe to run again on the updated data.
// Code changed with it, by hand: build/figures.cjs (the split diagram's fills and labels), build/short-lens.cjs
// (splitFigure: the replay table under the diagram), build/styles.css (table.rp, .kpref, .body.tight .kp) and
// build/lens-check.cjs (reads SPLIT-RULE-2026-11.md; checks the table).
// After it: apply.cjs, metrics-blocks.cjs, lens-check.cjs, then both builds, in the usual order.
// Usage: node wp12-2026-11-14.cjs <harness-compile dir>
'use strict';
const fs = require('fs'), path = require('path');
const HC = process.argv[2];
const D = f => path.join(HC, 'data', f);
const rj = f => JSON.parse(fs.readFileSync(D(f), 'utf8'));
const wj = (f, o) => fs.writeFileSync(D(f), JSON.stringify(o, null, 1) + '\n');
let done = 0, already = 0;
// Replace part of a string field.
const sub = (o, k, from, to, label) => {
  const cur = String(o[k]);
  if (cur.includes(to)) { already++; return; }
  if (!cur.includes(from)) throw new Error(`${label}: "${from.slice(0, 70)}" not in ${k}`);
  o[k] = cur.replace(from, to); done++;
};
// Set a whole field, after checking what it held.
const set = (o, k, was, to, label) => {
  if (JSON.stringify(o[k]) === JSON.stringify(to)) { already++; return; }
  if (was !== undefined && o[k] !== was) throw new Error(`${label}: ${k} is not what this script expects: ${JSON.stringify(o[k]).slice(0, 90)}`);
  o[k] = to; done++;
};

// ---------------------------------------------------------------- data/added.json
const A = rj('added.json');
const idea = id => { const x = A.ideas.find(i => i.id === id); if (!x) throw new Error('no idea ' + id); return x; };
const reg = id => { const x = A.register.find(i => i.id === id); if (!x) throw new Error('no register row ' + id); return x; };

// PAR-22: the rule is written and replayed, so it is designed; what the replay says on tokens; what is next.
const par = idea('PAR-22');
set(par, 'stands',
  'My proposal of 14 November, aimed first at hallucinations; not designed or tested. The 40 % line is an outside rule of thumb [S], to be set per model. Splitting by scope is our first reading; PAR-10 is its ancestor.',
  'Rule written and replayed over 97 [M] recorded session windows on 14 November; not tested live. 72, 32 and 26 [M] of them passed lines of 300k, 400k and 500k, holding 65.1, 44.6 and 36.8 % [M] of what sessions re-read. On tokens the record does not settle it against compacting earlier: 1.05–1.06 times on the middle of three sets of assumed costs with the work split evenly, 0.53–1.24 across all nine cases (each set with the work split evenly, unevenly or not at all) [E]. It writes 1.3–1.6 briefs for each summary an earlier compaction would write [E]. Hand-over quality is untested.',
  'PAR-22 stands');
set(par, 'next',
  'Write the split rule, then replay it over our recorded sessions at no token cost.',
  'I said yes to one trial wave at 300k. First D07, then a reader’s check of the latest state on our recorded summaries.',
  'PAR-22 next');
set(par, 'status', 'idea', 'designed', 'PAR-22 status');
set(par, 'maturity', 1, 2, 'PAR-22 maturity');

// TOK-44: settled inside the rule (part 1.5): a new session starts from a brief that points at the repository.
const tok = idea('TOK-44');
set(tok, 'how',
  'Today only compaction, clearing or a fresh session removes it. A split by scope (PAR-22) would leave it behind with the parent.',
  'A live window cannot give material up. Under the split rule (PAR-22) a new session starts from a one-page brief that points at the repository; finished material never enters it.',
  'TOK-44 how');
set(tok, 'stands',
  'Asked for once, on 26 October; nothing was built. The files were set aside, but what had been read stayed in the window.',
  'Settled inside the split rule on 14 November: finished material is whatever a new session’s brief does not name. No mechanism of its own; untested. A new session’s first call reads a median 79k [M].',
  'TOK-44 stands');
set(tok, 'next',
  'Settle it inside the split rule: what a child session does not inherit.',
  'In the trial, count what a new session re-reads and what it guesses.',
  'TOK-44 next');
set(tok, 'status', 'idea', 'designed', 'TOK-44 status');
set(tok, 'maturity', 1, 2, 'TOK-44 maturity');

// TK-FILL: where our windows compact is now counted; the link from fill to errors is still not.
const fill = reg('TK-FILL');
set(fill, 'what',
  'We do not know at what fill a session’s judgement starts to fall, for any model. The advice to stay under about 40 % [S] of the window is an outside rule of thumb.',
  'We do not know at what fill a session’s judgement starts to fall, for any model. The advice to stay under about 40 % [S] of the window is an outside rule of thumb; on our 1,000,000-token windows [E] it is 400k, above where 130 of 159 [M] recorded compactions already happen.',
  'TK-FILL what');
set(fill, 'evidence',
  'The root compacted at 574k, 974k, 967k and 970k tokens [M], and 2 of 2 compaction summaries were wrong on the latest state [M]. No record links an error to how full the window was.',
  'The root compacted at 574k, 974k, 967k and 970k tokens [M], and 2 of 2 compaction summaries were wrong on the latest state [M]. By 14 November the record holds 159 [M] compactions: Opus 126 at a median 368k, Fable 5.2 16 at a median 967k, Fable 5.1 11 at a median 690k, Sonnet 6 at a median 804k [M]. 42.6, 22.9 and 17.2 % [M] of session calls ran in a window above 300k, 400k and 500k. No record links an error to how full the window was.',
  'TK-FILL evidence');
set(fill, 'first_step',
  'Log context use at each phase close (TOK-34) and record peak context where a session reversed itself (MSR-43).',
  'Log context use at each phase close (TOK-34) and record peak context where a session reversed itself (MSR-43); WP12’s trial logs the fill at every correction.',
  'TK-FILL first_step');
set(fill, 'state_note',
  'named on 14 November; no instrument yet',
  'named on 14 November; where windows compact is counted, the link to errors is not',
  'TK-FILL state_note');

// PR-HALLU: its first step is done for compaction summaries (part 6.3 of the record): a script's recheck of pointers.
const hallu = reg('PR-HALLU');
set(hallu, 'evidence',
  'What we have are catches: 20-plus recorded overstatements, with no denominator [M], and 2 of 2 compaction summaries wrong on the latest state [M].',
  'What we have are catches: 20-plus recorded overstatements, with no denominator [M], and 2 of 2 compaction summaries wrong on the latest state [M]. On 14 November a script rechecked 1,265 [M] pointers (paths, commits, pull requests) in the 61 [M] FixFlow compaction summaries on record: 16 were not borne out, 1.3 % [M], against 2 of 55 and 2 of 112 [M] in two maintained documents.',
  'PR-HALLU evidence');
set(hallu, 'first_step',
  'Count the claims a script could recheck in recorded reports, and how many fail (WP8, with WP3’s verdict script).',
  'Count the claims a script could recheck in recorded reports, and how many fail (WP8, with WP3’s verdict script). Done for compaction summaries (WP12); the latest state needs a reader’s check.',
  'PR-HALLU first_step');
set(hallu, 'state_note', 'named on 14 November', 'named on 14 November; first scripted count the same day, for compaction summaries', 'PR-HALLU state_note');

// Glossary: the split entry says what the rule now says; one term the new text uses.
const term = k => A.terms.find(t => t.key === k);
set(term('ad-2'), 'definition',
  'In my B+ tree proposal (PAR-22), sessions are nodes of a distributed system: one whose window passes the split line divides its work by scope into two sessions, and two small siblings join into one. The line is a share of the window, set per model; about 40 % [S] is the outside rule of thumb.',
  'In my B+ tree proposal (PAR-22), sessions are nodes of a distributed system: leaves do the work, inner ones route and gate. One whose window passes the split line hands its work, by scope, to two fresh sessions (a hand-over), and two small siblings join into one. The line is a share of the window, set per model; about 40 % [S] is the outside rule of thumb, 400k [E] on our windows.',
  'ad-2 definition');
const addTerm = t => { if (term(t.key)) { if (JSON.stringify(term(t.key)) === JSON.stringify(t)) already++; else { Object.assign(term(t.key), t); done++; } } else { A.terms.push(t); done++; } };
addTerm({ key: 'ad-7', term: 'Key table', category: 'our-harness',
  definition: 'In the split rule, a repository file with one row per piece of work: owner, state and where its result is. A fresh inner session can take over from it.',
  origin: 'The split rule (WP12).' });
addTerm({ key: 'ad-8', term: 'Reader’s check', category: 'our-harness',
  definition: 'An agent on a fixed prompt reads a brief or a compaction summary twice and marks each statement of the latest state right or wrong, and each open loop carried or dropped.',
  origin: 'The split rule (WP12), part 6.4.' });

// Two older records now have a count over a larger set (97 session windows to 14 November): an update, not a correction.
const rule = (from, to) => { if (A.fixRe.some(r => r[0] === from)) { already++; return; } A.fixRe.push([from, to]); done++; };
rule('38 of 48 \\[M\\] compactions came at 366-387k, all on Opus\\.',
  '38 of 48 [M] compactions came at 366-387k, all on Opus; by 14 November 84 of the 117 [M] in session windows were Opus, 81 [M] of them at 366-385k.');
rule('Main sessions compacted 48 \\[M\\] times in the clinic and 9 \\[M\\] in FixFlow\\.',
  'Main sessions compacted 48 [M] times in the clinic and 9 [M] in FixFlow up to 12 November; by 14 November the record holds 117 [M] compactions in session windows and 42 [M] in agent windows.');
wj('added.json', A);

// ---------------------------------------------------------------- data/catalogue-extra.json (the reference edition's method note)
const CX = rj('catalogue-extra.json');
sub(CX, 'howMade', 'Idea records otherwise describe where things stood on 13 November.',
  'Idea records otherwise describe where things stood on 13 November, except those of the split idea (PAR-22, TOK-44, TOK-02, TK-FILL, TK-SUMMARIES, PR-HALLU and package WP12), which carry what WP12 finished on 14 November: the rule, its replay and the set-up of the trial I approved.',
  'reference howMade');
wj('catalogue-extra.json', CX);

// ---------------------------------------------------------------- data/sources.json
const SRC = rj('sources.json');
if (SRC.sources.some(x => x[0] === 'Split rule and replay')) already++;
else {
  const at = SRC.sources.findIndex(x => x[0] === 'Repository ground truth');
  if (at < 0) throw new Error('sources: no anchor row');
  SRC.sources.splice(at, 0, ['Split rule and replay', 'docs/program/SPLIT-RULE-2026-11.md, evidence/split-replay/ and docs/program/split-replay/', '14 Nov 2026',
    'The split-and-merge rule for sessions, its replay over 97 [M] recorded session windows with no model calls, and what is fixed before the live trial I approved at 300k.']);
  done++;
}
sub(SRC, 'note', 'token report, library and graph-test documents hold', 'token report, library, graph-test and split-rule documents hold', 'sources note');
wj('sources.json', SRC);

// ---------------------------------------------------------------- data/packages.json
const PK = rj('packages.json');
const wp = PK.packages.find(p => p.id === 'WP12');
set(wp, 'first',
  'The split rule written down (what a key is, what moves to which child, what the parent keeps), and a replay over our recorded sessions at no token cost: where splits would fall at 30, 40 and 50 % [S] of each model’s window, and how many re-read tokens they would remove.',
  'Done on 14 November: the split rule and a replay over 97 [M] recorded session windows at no token cost, both checked twice (`docs/program/SPLIT-RULE-2026-11.md`); then a fill gauge, a trial measure and a scripted hand-over check. That script found 16 of 1,265 [M] paths, commits and pull requests in the 61 [M] FixFlow summaries on record not borne out, 1.3 % [M], no more than in two maintained documents, so the trial is scored by a reader’s check of the latest state. Next: that check on a sample of those summaries, the baseline.',
  'WP12 first');
set(wp, 'firstShort', 'Split rule and a zero-token replay',
  'Done: rule, replay and trial instruments. Next: reader’s check on recorded summaries', 'WP12 firstShort');
set(wp, 'done',
  'One trial lane wave runs under the rule with no compaction, and its hallucination catches, rework and tokens per result are set beside a wave that compacts.',
  'One trial lane wave runs under the rule with no compaction, and its hallucination catches (wrong hand-over claims first), rework and tokens per result are set beside a matched wave that compacts earlier at the same token count.',
  'WP12 done');
set(wp, 'size', 'A day or two [G] for the rule and the replay; the trial is sized after it.',
  'The rule and the replay took a day. The trial needs ten or more hand-overs per arm [G]; the baseline says whether that is enough.', 'WP12 size');
set(wp, 'sizeShort', '1–2 days [G], then a trial', 'two trial waves [G]', 'WP12 sizeShort');
set(wp, 'startNote', undefined, 'first done; next after D07', 'WP12 startNote');
set(wp, 'depText',
  'Needs nothing to start: the replay reads transcripts we already have. It acts on the same tokens as lever 1 in WP5, and the trial wave books its agents under D07.',
  'The baseline and the trial start agents, so both wait on D07; the trial acts on the same tokens as lever 1 in WP5.',
  'WP12 depText');
set(wp, 'mine',
  'My yes on the split rule before a live trial, and D07 for the trial’s agent runs. The split line per model comes from the replay and the fill log (TOK-34), not from the borrowed 40 % [S].',
  'I said yes on 14 November to one trial wave at 300k, the only one of the three lines replayed that comes before our Opus compactions. Still mine: D07 before any agent run; which lane wave is which arm; the Opus compaction setting of 400,000 [S] raised to 433k [E] or above if an Opus session holds a node under the rule; and opening each new root.',
  'WP12 mine');
sub(PK, 'lead', 'Seven can start today, six start the day I give my word, and three follow another package.',
  'Six can start today, one has begun (WP12), six start the day I give my word, and three follow another package.', 'packages lead');
sub(PK, 'mapShows', 'for its first deliverable, so it can start today. The middle column waits on a word from me, and the right column on a deliverable of another package.',
  'for its first deliverable, though any later step that launches agents waits on D07; WP12’s first deliverable is already done. The middle column waits on a word from me, and the right column on a deliverable of another package.', 'packages mapShows');
wj('packages.json', PK);

// ---------------------------------------------------------------- data/short.json
const S = rj('short.json');

// Page 3, point 1: the rule is written and replayed; what that showed in one line each.
sub(S.short.points[0], 't',
  'a session splits when it passes about 40 % [S] of its window (the line depends on the model) and small ones merge. Aimed first at hallucinations, it may mean we never have to compact (WP12).',
  'a session past about 40 % [S] of its window (set per model) splits, small ones merge, and we may never have to compact. WP12 wrote the rule and replayed it on our record: tokens are not settled against compacting earlier, and its first aim, fewer hallucinations, needs a live trial. I said yes to one trial wave at 300k, ahead of most of our compactions.',
  'point 1');

// Page 3, point 2: the first scripted count exists (part 6.3 of the record), and what it cannot see.
sub(S.short.points[1], 't',
  'WP8, with WP3’s verdict script, gives hallucinations their first count.',
  'A script rechecked 1,265 [M] paths, commits and pull requests in FixFlow’s summaries: 16 [M] were not borne out, no more than in maintained documents; the latest state needs a reader. WP8 counts reports next.',
  'point 2');

// Scoreboard, hallucinations: the first scripted count, and what still has no rate.
const hm7 = S.metrics.find(m => m.key === 'hallucination');
sub(hm7, 'stand',
  'No rate yet. What we have are catches: 20-plus recorded overstatements, with no denominator [M], and 2 of 2 [M] compaction summaries wrong on the latest state.',
  'No rate yet for the latest state, where 2 of 2 [M] summaries we read were wrong. A script found 16 of 1,265 [M] paths, commits and PRs in FixFlow’s summaries not borne out, as few as in maintained documents. Reports: 20-plus overstatements, no denominator [M].',
  'hallucination stand');
sub(hm7, 'gap', 'A rate per session, per model and per window fill.',
  'A rate for statements of the latest state, by a reader’s check (WP12); then rates per session, model and window fill.', 'hallucination gap');

// Block 9 (measurement): the same count where the missing rate is discussed.
const msr = S.blocks.find(b => b.key === 'measurement');
sub(msr, 'measured', '2 of 2 compaction summaries wrong on the latest state [M].',
  '2 of 2 compaction summaries wrong on the latest state [M]. A script rechecked 1,265 [M] paths, commits and pull requests in FixFlow’s 61 [M] recorded summaries: 16 were not borne out, 1.3 % [M], no more than in two maintained documents.', 'block 9 measured');

// Scoreboard, token count: the exposure is measured now; the live effect is not.
const tc = S.metrics.find(m => m.key === 'token_count');
sub(tc, 'gap', 'What splitting at a set line would have saved on our recorded sessions (WP12).',
  'What a split or an earlier compaction saves per accepted slice, live; the replay measured exposure only (WP12).', 'token count gap');

// Block 1.
const ctx = S.blocks.find(b => b.key === 'context');
sub(ctx, 'unmeasured', 'At what window fill a session’s judgement starts to fall, for any model.',
  'At what window fill a session’s judgement starts to fall, for any model, and whether a brief written at a split is right more often than a compaction summary.', 'block 1 unmeasured');
const bi = id => ctx.ideas.find(i => i.id === id);
set(bi('PAR-22'), 'result',
  'Proposed: my idea of 14 November, aimed first at hallucinations; not yet designed or tested. Its 40 % [S] line will differ by model. WP12 replays it first.',
  'Designed: my idea of 14 November, aimed first at hallucinations. Rule written and replayed on our record (below), not tested live. I said yes to a 300k trial; old summaries are read first.',
  'block 1 PAR-22');
set(bi('TOK-44'), 'result',
  'Proposed: asked for on 26 October, nothing built yet. A split by scope would leave it behind in the old window; what a child does not inherit is for the split rule to settle.',
  'Designed: asked for on 26 October, now settled inside the split rule. A new session starts from a brief that points at the repository, so finished material never enters it. Untested.',
  'block 1 TOK-44');
set(bi('TOK-02'), 'result',
  'In use: for Opus, 38 of 48 [M] compactions came at 366–387k. Sonnet ran to 963k [M] and is not set yet.',
  'In use for Opus: 84 of the 117 [M] compactions in session windows are Opus, 81 [M] of them at 366–385k. Sonnet ran to 963k [M] and is not set yet.',
  'block 1 TOK-02');

// Page 7, under the split figure: the rule as written, the replay's table, its reading, the source line.
set(S.p2, 'splitShows',
  'As proposed, inner sessions hold only keys, so the root stays small however much work passes under it, and no window grows past the line, so nothing has to be compacted. If it holds, the wrong summaries and the re-reading of long windows both go. WP12 writes the split rule, including what a child starts with and does not inherit (TOK-44), and replays it over our recorded sessions before any live trial.',
  '**The rule is written (WP12).** A session past the line hands its work to two fresh sessions (one, if it cannot be cut), each started from a one-page brief that points at the repository: finished material never enters it (TOK-44), and compaction is only a backstop. An inner session’s window still grows, so it too is replaced at the line, from its key table, and I open each new root.',
  'splitShows');
set(S.p2, 'replay', undefined, {
  title: 'The rule replayed over our 97 [M] recorded session windows, with no model calls',
  cols: ['Split line, as a share of a 1,000,000-token window [E]', '300k (30 %)', '400k (40 %)', '500k (50 %)'],
  rows: [
    ['Session windows that passed the line [M]', '72', '32', '26'],
    ['Share of what sessions re-read that sat past the line [M]', '65.1 %', '44.6 %', '36.8 %'],
    ['Session-window compactions the line comes before, of 117 [M]', '113', '28', '26'],
    ['Tokens removed, as a multiple of compacting earlier (middle costs, even split) [E]', '1.06', '1.05', '1.06'],
    ['Briefs written for each summary compacting earlier would write [E]', '1.3', '1.4', '1.6'],
  ],
}, 'replay table');
set(S.p2, 'replayShows', undefined,
  '**What the replay shows.** Tokens are not settled: on the middle of three sets of assumed costs the rule removes about as much as compacting earlier, and across those sets and three ways of splitting the work, 0.53 to 1.24 times [E]. Whether a brief is right more often than a summary takes a live trial: I said yes to one wave at 300k, scored by a reader first, and on tokens too.',
  'replayShows');
set(S.p2, 'splitCap',
  'My proposal of 14 November (PAR-22), not yet designed or tested. Splitting by scope, with inner sessions holding only keys, is our first reading of it; WP12’s split rule settles it. The compaction sizes and the two wrong summaries are from the register (B04, PR-SUMMARY). The fills inside the tree are illustrative [I]. The 40 % line is an outside rule of thumb [S] that we have not measured (TK-FILL).',
  'My proposal of 14 November (PAR-22). Rule, replay, their check and the trial’s set-up: `docs/program/SPLIT-RULE-2026-11.md`. Left panel: register rows B04 and PR-SUMMARY. Tree fills are illustrative [I]; the 40 % line is an outside rule of thumb [S], unmeasured (TK-FILL).',
  'splitCap');

// Page 8, under the levers: where the proposal stands after the replay.
sub(S.p2, 'leversShows',
  'My proposal is to reach lever 1 by splitting sessions at a line (PAR-22, WP12); it is not yet tested.',
  'My proposal is to reach lever 1 by splitting sessions at a line (PAR-22). WP12’s replay puts 36.8 to 65.1 % [M] of what our sessions re-read past lines of 500k to 300k; the split is not yet tested live, and I said yes to one trial wave at 300k.',
  'leversShows');

// Part 3, the token theme's line: the same count as block 1 now gives.
const tokTheme = S.themes.find(t => /38 of 48 \[M\] compactions came at 366–387k tokens/.test(t.summary || '') || /84 of the 117 \[M\] compactions in session windows/.test(t.summary || ''));
if (!tokTheme) throw new Error('token theme summary not found');
sub(tokTheme, 'summary', '38 of 48 [M] compactions came at 366–387k tokens.',
  '84 of the 117 [M] compactions in session windows are Opus, 81 [M] of them at 366–385k tokens.', 'token theme');

// Part 4, the WP12 row.
const row = S.rows.find(r => r.id === 'WP12');
set(row, 'first',
  'The split rule written down, and a replay over our recorded sessions at no token cost: where splits fall at 30, 40 and 50 % [S] of each model’s window, and what re-reading they remove.',
  'Done on 14 November: the split rule and its replay over 97 [M] recorded session windows, both checked (`SPLIT-RULE-2026-11.md`), then three instruments for the trial, tested on the record: its script found 16 of 1,265 [M] paths, commits and pull requests in FixFlow’s recorded summaries not borne out, no more than in two maintained documents. Next: a reader’s check on a sample of those summaries, the baseline.',
  'WP12 row first');
set(row, 'done',
  'One trial lane wave runs under the rule with no compaction, and its hallucination catches, rework and tokens per result are set beside a wave that compacts.',
  'One trial lane wave runs under the rule with no compaction, and its hallucination catches (wrong hand-over claims first), rework and tokens per result are set beside a matched wave that compacts earlier at the same token count.',
  'WP12 row done');
set(row, 'waits',
  'My yes on the split rule before a live trial; D07 for the trial’s agents.',
  'I said yes on 14 November to one trial wave at 300k, the only line of the three that comes before most of our compactions. Still mine: D07 before any agent run, which lane wave is which arm, the Opus compaction setting raised if an Opus session holds a node, and opening each new root.',
  'WP12 row waits');

// Part 4, the WP8 row: its count is the one over reports, now that summaries have a first scripted count.
const row8 = S.rows.find(r => r.id === 'WP8');
sub(row8, 'first', 'a first count of claims a script could recheck (PR-HALLU).',
  'a first count of the claims in reports a script could recheck (PR-HALLU).', 'WP8 row first');

// Start counts: WP12 has begun, so six packages can start today.
sub(S.short.points[6], 't', 'seven can start today, six start on my word, and three follow another package.',
  'one has begun, six can start today, six start on my word and three follow another package.', 'point 7');
sub(S.p4, 'lead', 'Seven can start today, six start the day I give my word, and three follow another package.',
  'Six can start today, one has begun (WP12), six start the day I give my word, and three follow another package.', 'p4 lead');

// Sources note of the short edition (same sentence as data/sources.json).
sub(S, 'sourcesNote', 'token report, library and graph-test documents hold', 'token report, library, graph-test and split-rule documents hold', 'short sources note');

// How this compile was made.
const hm = S.howMade.length - 1;
sub(S.howMade, hm, 'all corrected here.',
  'all corrected here. The same day WP12 wrote the split rule and replayed it over our record, with two rounds of independent checking, and this edition carries the result.',
  'howMade');

wj('short.json', S);
console.log(`changed ${done}, already in place ${already}`);
