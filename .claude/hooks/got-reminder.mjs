// Graph-of-thoughts reminder (2026-11-26; owner ruling r58-0027; brief research-tree/build/briefs/GOT-GATE.md).
// UserPromptSubmit. When the owner's message names the method (graph of thoughts, graph thinking, tree of thoughts,
// forest of thoughts; any case, hyphens or spaces) it adds the rule's six points as context. Otherwise it prints nothing.
// A reminder: it refuses nothing. Cannot see: a request for the method in other words, or work done without his asking.
import { readFileSync } from 'node:fs';

export const RULE = 'docs/program/RESEARCH-METHOD-RULES-2026-11-25.md';
export const METHOD_RE = /\b(?:graph|tree|forest)[\s_-]+of[\s_-]+thoughts?\b|\bgraph[\s_-]+thinking\b/i;
export const NOTE = [
  `The owner named the graph-of-thoughts method (r58-0027). Rule: ${RULE}, last section. Run the method, in the open:`,
  '1. Say first which parts of the method will be run and which cannot, and why; never a weaker form silently.',
  '2. GRAPH-PLAN.md in the search folder before the first thought: parts and dependencies, thoughts per part and by which',
  '   separate runs, the criteria sheet, how many kept, the combinations and by whom, the improvement loop and stop rule, the token budget.',
  '3. Every thought, score, selection and the final result is a line of thoughts.jsonl in that folder.',
  '4. The minimums are checked by script: node tools/check-got.mjs <folder> (two parts, three generated per part, scored before',
  '   use, more than one kept or why, three scored aggregates, a scored refine of an aggregate, a final aggregate or refine).',
  '5. The account comes from the records: node tools/check-got.mjs <folder> --ledger, word for word under "What was actually done";',
  '   a round is a pass with new thoughts generated and scored, a re-reading is called a re-reading.',
  '6. A shortfall is said, not hidden: the ledger lists unmet minimums first. A hypothesis carries "Search: <folder>" or',
  '   "Not reached by a graph of thoughts: <what was done instead>".',
].join('\n');

export function reminderFor(prompt) { return METHOD_RE.test(String(prompt || '')) ? NOTE : null; }

if (!globalThis.GOT_REMINDER_IMPORT) {
  let note = null;
  try {
    const j = JSON.parse(readFileSync(0, 'utf8'));
    note = reminderFor(j && j.prompt);
  } catch { process.exit(0); }
  if (note) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: note } }) + '\n');
  process.exit(0);
}
