# Memory pipeline: benchmarks

## Pass conditions

All must hold, whatever the savings.

- **Quality:** tests passed and review send-backs are no worse than on the same tasks without memory
  (cheaper model first, then Opus, then Fable).
- **No wrong entries used:** in at least 40 trick queries (60 planned) where no stored entry applies, no
  wrong entry is acted on.
- **No invented answers:** when nothing relevant is stored, the lookup returns "not recorded".
- **No stale entries:** an entry is not used after the code under it has changed until its check has run
  again.

## Targets

| Measure | Target |
|---|---|
| Lookup recall | At least 60 % of real problems, described as they first appeared, find the right stored entry, and more than a plain text search of the notes and commit history finds |
| Tokens per hard problem (one that needed a stronger model, two or more failed attempts, or a failed build) | Tokens saved by hits are more than the tokens spent on lookups, writing entries and building the store |
| Token cost | Fewer price-weighted tokens per task than without memory, at the same quality |
| Reasoning cache | Lower token cost and fewer wrong answers than without memory |
| Time | No longer per task than without memory |
| Throughput | More tasks finished per weekly token allowance |
| Store size | The saving still holds after about 1,000 entries |
| Second project | The saving holds on a project of a different size |

## Benchmark: Sonnet with memory against Opus

- Use complex problems Opus solved before, kept out of the store, each with tests that decide pass or
  fail.
- Run four setups on the same problems: Sonnet alone, Sonnet with memory, Opus alone, and Sonnet building
  with Opus reviewing.
- **Pass:** Sonnet with memory gets the same test results and review verdicts as Opus, uses fewer
  price-weighted tokens, and clearly beats Sonnet alone. It must also beat Sonnet building with Opus
  reviewing, which works today without memory.
- "Same output" means the same test result and review verdict, not the same text. Score against the
  tests, not against Opus's answers: a reviewer found serious defects in 9 of 14 pieces Opus built in an
  earlier project.
- Report complex problems separately. On average problems the measured gap between Sonnet and Opus is
  only 2–8 points.
- Problems needed per setup (95 % confidence):

  | To show | Problems |
  |---|---|
  | Memory lifts Sonnet on problems it usually fails alone | a few dozen |
  | Sonnet with memory is within 10 points of Opus (pass rates near 80 %) | about 120 |
  | Within 5 points (pass rates 50–70 %) | about 650–770 |
  | Within 2 points (pass rates 50–70 %) | about 4,000–4,800 |

- Repeat one level up: Opus with memory against Fable.
