# The attack on the research tree's risk list (2026-11-16)

Amendment 2 of `docs/program/RESEARCH-TREE-PROTOCOL-2026-11-16.md` listed 14 risks of the session tree
and asked, in its part D, for a refuter and a check against published work before the tree is trusted.
This folder is the record of that check. What it changed is amendment 3 of the same file.

## What ran

One workflow of ten agents, started from the coordinator's session:

| Agents | Model | Job | Saw the protocol | Used the web |
|---|---|---|---|---|
| `read-L1`, `read-L2`, `read-L3` | Sonnet | Published evidence on multi-agent failure, cost, ensembles and reviewers | no | yes |
| `recheck-L1`, `recheck-L2`, `recheck-L3` | Opus | Opened every source of one reader again | no | yes |
| `attack-R1`, `attack-R2`, `attack-R3` | Opus | Refuters: a walk-through; cost and dynamics; knowledge and judgment | yes | no |
| `map` | Opus | Set confirmed evidence and refuter findings against the 14 rows | yes | no |

1,183,768 subagent tokens, 17 minutes, 242 tool calls.

## What came back

- 45 literature findings: 31 confirmed as written, 14 confirmed with a correction, none dropped.
- 36 refuter findings: 17 high, 19 medium. The mapper rejected 10 findings or fixes.
- The 14 rows: 10 hold with a change, 4 do not hold (rows 7, 9, 12, 13). Six risks the list did not
  name; the coordinator added a seventh that the check itself showed.

## Limits

1. The agents reached sources through a fetch tool that returns a short summary of a page written by a
   small model. Nobody read a paper end to end. "Confirmed" means two agents asking separately got the
   same numbers through that tool.
2. Several sources are recent single preprints, and several are vendors' reports about their own
   systems. `read-L1.json` lists its own doubts about dates and versions in its `notes`.
3. No source measured a tree of this shape.
4. Two re-check notes (L3-07, L3-15) say the fetch tool reported text aimed at the reader at the end
   of a page. No agent acted on it, and the summaries the agents received show no such text.

## Files

- `result.json`: the workflow's combined result (sources, attack titles, the map).
- `agents/*.json`: each agent's full return.
- `workflow-script.js.txt`: the script, with every brief as it was sent.
- `MANIFEST.sha256`: hashes of the files above.
