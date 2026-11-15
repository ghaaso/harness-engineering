# Reader protocol (one chunk, records only)

You read **one chunk** of one markdown file and record what its text **states**, as JSON lines. You do not summarise, interpret beyond the words, resolve references, or judge whether the plan is right. Records from many readers are combined later through spans and identity rules, never by merging prose.

## Your input

- Get your view with: `PY -I -B TOOLS/cmap.py chunk-show --store STORE CHUNK_ID` (the command is given in your task).
- **Your range:** the numbered lines under "Your range". Record only from these lines.
- **Context lines:** shown above your range (the heading path and, for a split table, its header). Never record from them, except table `header` decisions (below).
- Already recorded automatically, so do not record them:
  - headings;
  - every line inside a mermaid diagram (node declarations and arrows);
  - row keys of tables whose first header names an ID;
  - bare links that have no relation word.
- You do record relations whose words surround a link, for example "See [operations](operations-and-costs.md)".

## Output

Write one JSON object per line to the output file named in your task. Then check it with:

`PY -I -B TOOLS/cmap.py validate --store STORE --chunk CHUNK_ID --file OUTFILE`

Fix every REJECT and validate again, up to 3 times. Records still rejected after that are dropped, and that is recorded.

Every record has these fields:

- `"type"`;
- `"lines"`: `"N"` or `"N-M"`, inside your range;
- `"quote"`: the exact text from those lines. Copy characters exactly, including `**`, backticks, dashes and `$`. Keep quotes short, but long enough to be meaningful.

Optional on every record:

- `"borderline": true` when you are unsure;
- `"note"`: one short sentence.

## Record types

### 1. `edge`: a relation cue and its two arguments

A cue is a word or phrase that states a relation between two things or propositions. Examples, which are not a closed list:

- connectives: because, since, so, therefore, hence, given, unless, if;
- relation phrases: depends on, requires, uses, derives from, replaces, supersedes, refers to, is defined in, fits, favors, gates, blocks, prevents, owns, links, follows, before, after;
- reference phrases: see, as in, per, according to;
- lead-in labels that govern what follows: `**Prerequisites:**`, `Based on:`, `Inputs:`;
- table column headers that name a relation (see `header`).

```json
{"type":"edge","lines":"12","quote":"The oven schedule depends on the flour order","label":"depends on","cue_class":"relation-phrase",
 "arg1":[{"quote":"The oven schedule","lines":"12","type":"name"}],
 "arg2":[{"quote":"the flour order","lines":"12","type":"name"}]}
```

- **`label`:** the cue's relation words exactly as written, including negation, modality and hedges ("may depend on", "does not require" and "should precede" are each their own label). Never substitute a more general word. A colon-ended lead-in keeps its text, for example `"**Prerequisites:**"`.
- **`cue_class`:** one of `connective`, `relation-phrase`, `reference`, `lead-in`, `table-header`, `link-phrase`, `other`.
- **`arg2`:** what the cue governs: the object of the verb or preposition, the clause the connective introduces, or the items a lead-in or header governs.
- **`arg1`:** the other argument, and only if the text itself places it in the relation, for example the subject in the same sentence, or a subject written in the lead-in line itself. Never fill `arg1` from an enclosing heading or by position. If the text places nothing, use `"arg1":[]`.
- **Expression fields:** `quote` (verbatim), `lines`, and `type`.
  - `type` is `"clause"` if the expression has its own verb predicate (finite, imperative, or non-finite with its own subject). Otherwise it is `"name"`.
  - Pronouns and phrases like "the above" are recorded verbatim. Do not replace them with what they refer to.
- **Coordinated items** ("depends on A, B and C"): put the items as separate `arg2` expressions and add `"split": true`. The tool then makes one edge per item, all sharing the cue.
- **Joint items:** if the text says the items act together ("together", "jointly", "both are needed", "all … must", "only in combination"), add `"joint": true` instead of `split`.
- **Alternatives:** if the items are alternatives ("A or B", "either"), add `"coord":"or"`.
- **ID lists and ranges** written with slashes or dashes ("R05–R08", "K-02/03", "K-02/K-03", "B1/B2"): keep each as **one** expression, exactly as written. Do not split or expand it. Identity is decided later.
- **One edge per cue.** If two cues relate the same things, record two edges. If there is no cue, record no edge: never record a relation you infer from meaning, position, shared words or shared numbers.

### 2. `header`: a table column decision

For each column of a table whose header line is in your range, or in your context lines for a split table, decide whether that header names a relation between the row's key cell (the first column) and the column's cells:

```json
{"type":"header","lines":"5","quote":"Needs","column":2,"cue":true}
{"type":"header","lines":"5","quote":"Colour","column":3,"cue":false,"reason":"names an attribute, not a relation"}
```

`column` is 0-based. For each row in your range and each column with `"cue":true`, record one `edge`:

```json
{"type":"edge","lines":"9","quote":"K-02/K-03; trained staff","label":"Needs","cue_class":"table-header",
 "table":{"header_line":5,"column":2,"row_key":"B7"},
 "arg1":[{"quote":"B7","lines":"9","type":"name"}],
 "arg2":[{"quote":"K-02/K-03","lines":"9","type":"name"},{"quote":"trained staff","lines":"9","type":"name"}],"split":true}
```

- `label` is the header text exactly.
- `quote` is the cell text.
- `arg1` is the row's first-column key cell.
- `arg2` holds the cell's items. Split coordinated items as above, but never split an ID list or range.
- An empty cell gives no edge.

### 3. `intro`: an explicit definition or naming statement in prose or in a glossary-style table

```json
{"type":"intro","lines":"40","quote":"A batch here means one oven load","intro_kind":"definition","name":"batch"}
```

`intro_kind` is `definition` ("X is", "X means", "X refers to", a term/definition table row) or `naming` ("hereafter X", "also called X").

### 4. `identity`: an explicit statement that two expressions denote the same thing

```json
{"type":"identity","lines":"3","quote":"the night shift, hereafter Shift N","cue":"hereafter",
 "a":{"quote":"the night shift","lines":"3","type":"name"},"b":{"quote":"Shift N","lines":"3","type":"name"}}
```

### 5. `idscheme`: a statement of where a family of IDs is defined

```json
{"type":"idscheme","lines":"7","quote":"Recipe IDs R01–R30 are in [recipes](recipes.md)",
 "ids":"R01–R30","prefix":"R","from":1,"to":30,"target":{"quote":"[recipes](recipes.md)","link_target":"recipes.md"},"scope":"file"}
```

- Record one per ID family.
- `prefix` is the exact characters before the number: `"R"`, `"K-"`, `"STEP-"`.
- `scope` is `"file"` unless the sentence itself states a wider scope. In that case, quote that part in `note`.

### 6. `reldef`: text that defines what a relation word or arrow means

```json
{"type":"reldef","lines":"30","quote":"In this table, an arrow means the left step must finish first","labels":["-->"],"fixes":{"direction":"toward_arg1","consequence":null,"walkable":null},"scope":"stated"}
```

- Set only the properties the text fixes:
  - direction: `toward_arg1`, `toward_arg2` or `none`;
  - consequence: `fails_to_build`, `fails_to_follow`, `fails_to_resolve` or `none`;
  - walkable: `yes` or `no`.
- Leave every other property `null`.

### 7. `claim`: a statement the text presents as a decision, recommendation, conclusion or binding requirement

```json
{"type":"claim","lines":"7","quote":"Use **two ovens** for the first year","claim_kind":"decision"}
```

- `claim_kind` is `decision`, `recommendation`, `conclusion` or `status` (an explicit statement of what has or has not been done, tested or verified).
- Only record what the text presents explicitly in that role: imperative choices, "X is the backup option", "therefore …", "No … has been measured".
- Do **not** record ordinary requirements, constraints, rules or table cells as claims. Most plan sentences are requirements; record them as edges only where a cue states a relation. Expect a few claims per chunk, not one per line.

### 9. Source citations

A parenthetical or inline citation of a source with no relation word, such as "(manual p.12)" or "(survey S-03)", is a reference cue. Record an `edge` with:

- `"label":"(citation)"` and `"cue_class":"reference"`;
- `arg2`: the citation text;
- `arg1`: the clause or statement it is attached to in the same sentence (verbatim), or `[]` if none.

### 8. `untyped`: a possible relation you cannot record as an edge

```json
{"type":"untyped","lines":"21","quote":"alongside","reason":"cannot decide whether this states a relation"}
```

The reason is either that the slots cannot be filled from the text, or that you cannot decide whether the phrase states a relation.

## Rules that are easy to break

- Record from your range only. Copy quotes exactly. Use line numbers from the view.
- Equal strings, similar names and shared amounts are never relations or identity. Record only what a cue states.
- Proposals, unknowns and negations stay as written. "is not", "remains UNKNOWN" and "PROPOSED" belong in the label or the quote.
- Do not read other files or other chunks. Do not use the web. Your task ends when the output file validates.
