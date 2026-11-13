<!-- Trimmed from https://github.com/unclecatvn/agent-skills @ 82ebbaed8988e9697687612575d437ca0eacec4e skills/odoo-workflow/SKILL.md and skills/odoo-workflow/references/definition-of-done.md (MIT, Copyright (c) 2026 UncleCat): kept SKILL.md lines 6 (version scope), 63-69 (version rule), 158-168 (Source-cell rules), 186-192 (xmlids); definition-of-done.md lines 8-9 (verification note). Text unchanged. Everything about writing Odoo modules, odoo-bin (including definition-of-done.md §1, lines 11-37: demo data and -i/-u on named databases), conf files and commit hygiene was left out (see UPSTREAM.md "Rejected"). FixFlow targets Odoo Online, which has no local odoo-bin runtime; any act on an Odoo database is [owner]. -->

# odoo-workflow — the parts that apply to an API/import integration

## Version scope (SKILL.md:6, from the description)

> ... Odoo 16-19. ...

## Upstream verification note (definition-of-done.md:8-9, kept verbatim)

> The commands below were run on 18 and 19; 16/17 forms are unverified unless the pack
> says otherwise.

## Version rule (SKILL.md:63-69)

- An explicit statement from the user or the project `CLAUDE.md` / `AGENTS.md` outranks the
  helper. If they disagree, stop and ask. Do not silently assume a version.
- Load the Odoo reference pack for that major: `odoo-<major>` with the skills CLI,
  `<plugin>:odoo-<major>-0` in the Claude Code plugin (for example `agent-skills:odoo-18-0`).
  Read its `references/api-highlights.md` (APIs removed or renamed in this version) and only the
  guide section the task needs (`grep -n '^## ' <guide>`, then a range). Pack missing: say so and
  continue - the real source is the authority, never memory.

## Source-cell rules (SKILL.md:158-168)

The **Source** cell holds exactly one of:

- `file:line` - the cited line itself shows the claim (definition, record, anchor node).
- `NOT FOUND` - the helper exited 1, or a clean grep over all ROOTS matched nothing on MODEL.
  Name the closest real symbol when one exists.
- `UNCERTAIN: <what is missing>` - name the file not read, the runtime-built domain, or the
  other module's view that provides the anchor. Never for a question a command above answers.
- `AMBIGUOUS: <modules>` - overrides in modules that do not depend on each other.

Any cell other than `file:line` means no code for that row: drop it, add the missing `depends`,
or ask. More than 15 rows means the task should be split; never drop a row to fit.

## Xmlids (SKILL.md:186-192)

- **Xmlids.** `odoo_trace xmlid` decides: a record in an XML or CSV file the manifest loads, or
  GENERATED at install (`model_*`, `field_*__*`, `selection__*`, `base.module_*`,
  `account.<company id>_<name>` from a chart template), each tied to the module the helper
  names. A record only in a file the manifest never loads is NOT FOUND (UNKNOWN when an init
  hook may load it). Never invent an xmlid and never report a generated one as missing. A
  missing group in a view's `groups=` does not stop the install: Odoo only logs a WARNING, and
  the node is hidden because no user belongs to a group that does not exist.
