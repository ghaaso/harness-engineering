# The research run: what you type and set

**Paste the go of section 1 into a new Code session opened in `C:/research-runs/2026-11-harness-leads`, on Fable,
effort high, with Auto mode on.** Best at the weekly reset, Monday 23 November 17:00 your time (form 1), or before it
in one sitting (form 2). After that the run needs nothing from you unless it stops. It takes about 5 to 8.5 hours of
machine time and about 955 M tokens (800 M to 1,206 M), under your cap of 1.2 B.

## 1. The go (paste as it is)
> I approve the research run in this folder: read and follow
> C:/research-runs/2026-11-harness-leads/briefs/COORDINATOR.md. I approve the downloads that DOWNLOADS.md in this
> folder names (public papers from open copies, at most 40 MB each, about 420 MB in all, and public raw text pages of
> code and benchmark results, at most 2 MB each, about 70 MB in all), and the one exception to my rule 3 it describes:
> the review comparison runs in this app with the network on, not in a container. The cap is 1.2 B tokens for the run,
> the preparation included.

## 2. Where, and your settings
- The Claude desktop app, Code, a new session, folder `C:/research-runs/2026-11-harness-leads` (not the harness
  repository). Model **Fable**, effort **high**.
- **Auto mode**, in the session's mode picker (there is no separate settings switch). It lets routine steps go on
  without you; what no mode approves still asks.
- **Optional: allow rules for the run's own commands.** In Auto mode a checker judges each command a helper runs that
  is not a plain read; 3 blocks in a row or 20 in all send the session back to asking you (not configurable). How
  often it would block these commands in a run of this size is not measured. A rule under `permissions.allow` in this
  folder's `.claude/settings.json` lets a matching command skip the checker. None is written for you; each rule and
  what it gives up:
  - `Bash(curl -s -L --ssl-revoke-best-effort *)`: the readers' downloads, and any other such curl to any site with anything
    sent along: an allowed curl is no longer checked for what it sends (your rule 4: nothing of ours goes out). The
    checker blocks flags that turn off a safety check, like `--insecure`. The run uses `--ssl-revoke-best-effort` (revocation
    is checked where its list can be reached; plain curl fails that check on this PC, both flags pass: tested 2026-11-20); whether the checker counts it is not
    measured.
  - `Bash(pdftotext -layout *)`: papers turned into text; it could also write over any file unchecked.
  - `Bash(node C:/research-runs/2026-11-harness-leads/tools/<name>.mjs *)` for each script in `tools/` (and the
    `node tools/<name>.mjs` form the coordinator uses), the same for `briefs/field/self.mjs`: the run's scripts with
    any words; edits in this folder are not checked, so an edited script would run unchecked. Auto mode sets aside
    rules that can run any code (such as `Bash(python *)`); whether it keeps these is not stated.
  - `Bash(bash C:/Users/User/Documents/projects/harness-engineering/library/lookup.sh *)`: the library lookup, which
    only reads; the same doubt as the scripts.
  - None for git (it runs inside `tools/commit.mjs`) or `rm`: the briefs delete only files they made, and no allow
    rule approves removing a protected folder.
- **Remote Control**, only if you want to answer from your phone: this session's own Remote Control switch, this
  session alone. Its cost: while it is connected, the session's transcript (your messages, the replies, the tool
  activity) is kept on the provider's servers. Without it, any stop waits for you at the desk. Push to the phone is
  not shown for this app: you look.
- **Keep computer awake** is on already; it holds while helpers work, not while a session only waits.
- For form 2 only: **Windows set not to sleep on mains power** until the run ends (Windows Settings, System, Power),
  and set back afterwards. The app cannot set it.
- The top session writes the preparation's tokens into `run/config.json` before you paste the go; if it has not, the
  coordinator says so and starts nothing.

## 3. When
- **Form 1**: paste the go at or after the reset, Monday 23 November 17:00 your time (12:00 UTC), at the desk. No
  tokens added.
- **Form 2**: paste it before the reset, then leave the app and the session open with the PC awake. The coordinator
  sets one wake at 17:05 your time, waits, and starts then. About 0.2-0.3 M tokens added.
Nothing starts before the reset in either form.

## 4. What can stop it, and what you do
| What stops it | What you see | What you do |
|---|---|---|
| Auto mode goes back to asking (3 blocks in a row, or 20 in all) | a permission prompt | Answer it (from the phone if Remote Control is on); the run goes on |
| The cap | a question starting `cap:`, with the numbers | Answer with the cap you allow, for example `cap: 1.3 B`; or keep 1.2 B, and the run ends with what it has |
| A Fable credit prompt | a prompt about Fable use | Answer it |
| The app restarts | the session offline; its helpers stopped | At the PC open the session and type: `The app restarted. Go on with the run.` In form 2 before 17:05: the same, before 17:05; after 17:05: `Start the run now.` |
| The five-hour limit, if your plan has one (none was listed on 20 November) | helpers marked failed; the session waits | Without Remote Control: nothing; it goes on after the limit resets (if the PC slept more than 30 minutes past that, press Enter at the PC). With it: after the reset send `Go on.`; in form 1 the PC may sleep meanwhile |
| The coordinator's window near its hand-over point (not expected) | a question starting `approve:` | Open a successor: section 6 |
| The problem sheet or the planted copy failed twice | a plain message | Nothing can run without them; tell a top session in the harness repository |
| The wake tool is missing (form 2) | "The wake tool is missing here: paste the go again at or after 17:00." | Paste the go again at or after 17:00 your time; it runs as form 1 |
| The weekly meter has not reset at the start | "The weekly meter had not reset at <time>; ..." about an hour after the start | Nothing: it checks every 30 minutes and starts by itself. If the line asks for `Start the run now.`, type it once the usage card shows the new week |
| A start held with nothing running (the week's meter, or one model's limit) | "<unit> is held: ..." or "<units> wait: ...", about an hour after the hold began | Nothing: it checks every 30 minutes and starts when there is room. If the line ends "Type 'Go on.' later.", type `Go on.` later |

## 5. Hours and tokens
- About 5.0 to 8.4 hours of machine time, three fields at once.
- Expected about 955 M tokens (800 M to 1,206 M): about 16 points of the week's all-models meter (13 to 20) and about
  1 Fable point (0.5 to 1.9). The coordinator itself: about 6 M.
- At the end the coordinator gives the page `C:/research-runs/2026-11-harness-leads/closing/page.html`, ten lines and
  the tokens used. Then set Windows' sleep back (form 2) and turn Remote Control off.

## 6. A successor go (only if the coordinator asks with `approve:`)
In a new Code session in the same folder, on Fable, effort high, Auto mode on, paste:
> Go on with the research run in this folder as the coordinator's successor: read and follow
> C:/research-runs/2026-11-harness-leads/briefs/COORDINATOR.md; run/STATE.md says where it stands. The approvals of my
> first go and the cap of 1.2 B tokens stand.

Sources: `H:research-tree/build/NEXT-STEP.md` (hours, tokens, acts, stops), `UNATTENDED.md` v2 sections 0, 3, 5, and
`RUN:briefs/COORDINATOR.md`.

## Changes after the review (2026-11-21)
- 6: section 4 has the three stops it lacked: the wake tool missing, the meter not reset at the start, a start held
  with nothing running.
- 14: section 2 has the optional allow rules, what each lets through and gives up, and that the blocks are not
  measured (the provider's permission-modes page as copied in top session 4's scratchpad, lines 475, 563, 570,
  584-617; its settings reference, `autoMode.classifyAllShell`). No rule is written (UNATTENDED.md section 4 item 4).
- 5: the go's naming of the raw text pages stays; it agrees with the readers' `page.txt` route (at most 2 MB a page).
