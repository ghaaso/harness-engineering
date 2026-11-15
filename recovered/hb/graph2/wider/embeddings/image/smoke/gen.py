# Synthetic triples: 5400 entities, 36 relations, 19000 unique triples, fixed seed.
# Structure (so training has something to learn): each relation r maps head h to a tail
# near (a_r*h + b_r) mod N with small noise; heads are drawn with a power-law bias.
import random, sys
N, R, T, SEED = 5400, 36, 19000, 20261114
rnd = random.Random(SEED)
a = [rnd.choice([1, 3, 7, 11, 13, 17, 19]) for _ in range(R)]
b = [rnd.randrange(N) for _ in range(R)]
rel_w = [1.0 / (i + 1) ** 0.7 for i in range(R)]
seen = set()
while len(seen) < T:
    r = rnd.choices(range(R), weights=rel_w)[0]
    h = int(N * rnd.random() ** 1.5) % N
    t = (a[r] * h + b[r] + rnd.randint(-3, 3)) % N
    if h != t:
        seen.add((h, r, t))
rows = sorted(seen)
with open(sys.argv[1], "w") as f:
    for h, r, t in rows:
        f.write(f"e{h}\tr{r}\te{t}\n")
ents = {x for h, _, t in rows for x in (h, t)}
print(f"triples={len(rows)} entities_used={len(ents)} relations_used={len({r for _, r, _ in rows})}")
