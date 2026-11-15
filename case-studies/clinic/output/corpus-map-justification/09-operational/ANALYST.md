# Analyst protocol (S3 identity decisions and S2 vocabulary decisions)

Analyst decisions are **not text facts**. They are separate records:

- **S3:** decisions about the identity of things.
- **S2:** decisions about the properties of relation words.

Each records who made it, when, and the spans in view. Queries show S2 from level L2, and S3 only at level L3, where every use is labelled as an analyst hop. A decision never creates an edge and never changes a source record.

Work only from the work items you are given. Each item carries the lines it concerns. Do not read whole files or other material. If the lines in view do not settle a question, answer `cannot tell`. Never decide from string equality, similar names or shared numbers alone: those are only why an item was proposed.

## S3: identity work items

An item names one expression (its key, its file and line, the full line text) and, when available, candidate introductions with their line text. For example, a row key or a heading that begins with the same ID.

### Single expressions

Decide with the substitution test. Would replacing the expression with the candidate's name leave the statement in this line meaning the same thing, given what the line says? Use the line's own context: the ID family it belongs to, links on the line, and statements naming which document holds which IDs.

- **`same`:** the line supports that the expression denotes the candidate.
- **`different`:** the line shows another referent. Examples: a different document's ID series, a similarly named but distinct identifier, or a product name that is not a plan ID.
- **`cannot tell`:** anything else.

Group all members you decide `same` for one referent into **one** decision:

```json
{"value":"same","referent":"<intro record id>","members":["<expression key>","<expression key>"],"spans_in_view":["docs/x.md:12","docs/y.md:40"],"rationale":"<one sentence on what in the lines supports it>","prompting_candidates":["C00012"]}
{"value":"different","members":["<expression key>"],"referent":"<intro record id>","spans_in_view":["..."],"rationale":"..."}
{"value":"cannot tell","members":["<expression key>"],"spans_in_view":["..."],"rationale":"..."}
```

### Lists and ranges

These are expressions such as "K-02/K-03", "R05–R08" or "K-02/03". Decide whether the expression names separate items.

If it does, record a `split` with the items in order. Mark each item `"written": true` if its text appears in the expression, and `false` if it is implied by a range or a shared prefix.

```json
{"value":"split","expr":"<expression key>","items":[{"text":"R05","written":true},{"text":"R06","written":false},{"text":"R07","written":false},{"text":"R08","written":true}],"spans_in_view":["docs/x.md:143"],"rationale":"a range of slice IDs"}
```

Item keys are then `<expression key>/i1`, `/i2`, and so on. Decide each item's identity like a single expression, using the item key as the member.

If the expression could name one combined thing, or the line does not settle it, record `cannot tell` for the expression. Do not split it.

## S2: vocabulary work items

An item names one relation label as written, with sample attestations: the edge id, the line, and its two slot texts. Decide the label's properties **from the attestations in view**, never from what the word usually means.

- **`direction`:** which slot is the foundation (base, premise, source, prerequisite).
  - `toward_arg2`: arg2 is the foundation.
  - `toward_arg1`: arg1 is the foundation.
  - `none`: no dependent/foundation orientation.
- **`consequence`:** what the dependent loses without its foundation.
  - `fails_to_build`: it cannot be built or exist as planned.
  - `fails_to_follow`: a conclusion or decision does not follow.
  - `fails_to_resolve`: a name has no specified meaning.
  - `none`: the text gives no effect.
- **`walkable`:** `yes` if attested edges of this kind may be composed into paths (a chain of such hops reads as a chain of the same relation); `no` if they must stop after one hop.
- Leave any property `null` if the attestations disagree or do not settle it. A label used in different senses gets `null` with a rationale.

```json
{"labels":["requires"],"direction":"toward_arg2","consequence":"fails_to_build","walkable":"yes","spans_in_view":["<edge id>","<edge id>"],"rationale":"in every sampled line the arg1 item cannot be built without the arg2 item"}
```

Output one JSON object per line to the file named in your task. Record nothing else.
