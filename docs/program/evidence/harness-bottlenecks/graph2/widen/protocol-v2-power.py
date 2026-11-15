# Power and cost arithmetic for protocol-v2.md (normal approximation, no simulation).
# Run: python -I protocol-v2-power.py > protocol-v2-power.txt
# Model (lane-evaluation.md section 5): per-task mean log ratio has variance 2*sigma^2/k + tau^2;
# its mean over n tasks has SE = sqrt((2 sigma^2/k + tau^2)/n).
# sigma = ln 1.34 = 0.293 (one published 5-task study) and twice that as a sensitivity.
import math
from statistics import NormalDist
N = NormalDist()
Z = N.inv_cdf
P = N.cdf

def se(n, k, s, t):
    return math.sqrt((2 * s * s / k + t * t) / n)

def p_yes_tok(true_save, sev, z, thr=0.95):
    # YES-tokens: one-sided upper bound exp(m + z*SE) < thr; m ~ N(ln(1-save), SE)
    return P((math.log(thr) - z * sev - math.log(1 - true_save)) / sev)

def p_no_tok(true_save, sev, z, thr=0.85):
    # NO-tokens: one-sided lower bound exp(m - z*SE) > thr (a saving of 1-thr or more ruled out)
    return P((math.log(1 - true_save) - z * sev - math.log(thr)) / sev)

def mde(sev, z, thr=1.0, power=0.8):
    # smallest true saving with P(upper bound < thr) = power
    return 1 - math.exp(math.log(thr) - (z + Z(power)) * sev)

M = 5  # primary contrasts in the family (P1..P5 of protocol-v2.md)
z_first = Z(1 - 0.025 / M)   # Holm, smallest p (worst case)
z_last = Z(1 - 0.025)        # Holm, last step (best case)
z_guard = Z(0.95)
print("z first Holm step %.3f, last step %.3f, guard %.3f" % (z_first, z_last, z_guard))
sig = [0.293, 0.586]
tau = [0.15, 0.30]
print("\n== Change tasks: smallest saving detected with 80 % power (interval upper bound below 1.00 / below 0.95)")
for n in (25, 30, 40):
    for k in (2, 3):
        row = []
        for s in sig:
            for t in tau:
                v = se(n, k, s, t)
                row.append("s%.3f t%.2f SE %.3f: %4.1f%% / %4.1f%%" % (s, t, v, 100 * mde(v, z_first), 100 * mde(v, z_first, 0.95)))
        print("n=%d k=%d | " % (n, k) + " | ".join(row))
print("\n== P(YES-tokens: upper bound < 0.95), worst Holm step, n=40")
for k in (2, 3):
    for s in sig:
        for t in tau:
            v = se(40, k, s, t)
            print("k=%d s%.3f t%.2f SE %.3f: " % (k, s, t, v) + ", ".join(
                "save %d%%: %.2f" % (int(100 * x), p_yes_tok(x, v, z_first)) for x in (0.10, 0.15, 0.20, 0.25, 0.30, 0.40)))
for thr in (0.85, 0.80):
    print("\n== P(NO-tokens: lower bound > %.2f) at true saving 0, 5, 10 %% (should be high) and 25 %% (should be near 0), worst Holm step, n=40" % thr)
    for k in (2, 3):
        for s in sig:
            for t in tau:
                v = se(40, k, s, t)
                print("k=%d s%.3f t%.2f: " % (k, s, t) + ", ".join(
                    "save %d%%: %.2f" % (int(100 * x), p_no_tok(x, v, z_first, thr)) for x in (0.0, 0.05, 0.10, 0.25)))
print("\n== Correctness guard (no true difference): P(one-sided 95 % lower bound > -margin)")
for sev in (4.0, 5.0, 6.0):
    print("SE %.0f pts: " % sev + ", ".join("margin %d: %.2f" % (m, P(m / sev - z_guard)) for m in (10, 12, 15)))
print("\n== P(YES) for a good arm = P(tokens) x P(guard, margin 15, SE 5-6), n=40, k=3, sigma 0.293")
for t in tau:
    v = se(40, 3, 0.293, t)
    for x in (0.20, 0.25, 0.30):
        a = p_yes_tok(x, v, z_first)
        print("tau %.2f save %d%%: tokens %.2f, joint %.2f to %.2f" % (t, int(100 * x), a, a * P(15 / 6 - z_guard), a * P(15 / 5 - z_guard)))

# Stale bound on set K: exact one-sided 95 % Clopper-Pearson upper bound
def cp_upper(x, n, a=0.05):
    lo, hi = 0.0, 1.0
    for _ in range(80):
        mid = (lo + hi) / 2
        # P(X <= x | p=mid)
        c = sum(math.comb(n, i) * mid ** i * (1 - mid) ** (n - i) for i in range(x + 1))
        if c > a:
            lo = mid
        else:
            hi = mid
    return hi

def max_stale_allowed(n, bound=0.02):
    x = -1
    while cp_upper(x + 1, n) < bound:
        x += 1
    return x

print("\n== Stale bound on set K: upper 95 % bound below 2 %")
for n in (150, 200, 300, 400):
    c = max_stale_allowed(n)
    row = []
    for p in (0.0, 0.0025, 0.005, 0.01):
        prob = sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(c + 1)) if c >= 0 else 0.0
        row.append("true %.2f%%: %.2f" % (100 * p, prob))
    print("serves %d: passes with at most %d stale; " % (n, c) + ", ".join(row))

print("\n== Question sets, smallest saving detected with 80 % power (bound below 1.00 / 0.95), worst Holm step, k=2")
for name, n in (("Q product held-out", 70), ("D documents held-out", 40)):
    for sg in sig:
        for t in tau:
            v = se(n, 2, sg, t)
            print("%s n=%d s%.3f t%.2f SE %.3f: %4.1f%% / %4.1f%%" % (name, n, sg, t, v, 100 * mde(v, z_first), 100 * mde(v, z_first, 0.95)))

# Cost in this harness (estimates, as deployed): agent call about 113-123k tokens of context, about 60k fixed prefix
chg = (3.5e6, 10e6)    # change run: 30-80 calls
qrun = (0.6e6, 1.2e6)  # question run: 5-10 calls
serve = (0.25e6, 0.4e6)  # cached conclusion served: 2-3 calls
reader = (0.3e6, 0.6e6)  # reference reader, stripped prefix (not a subject)
judge = (0.02e6, 0.04e6)  # one judge pass
def mul(r, c):
    return (r * c[0], r * c[1])
def add(*xs):
    return (sum(x[0] for x in xs), sum(x[1] for x in xs))
def b(x):
    return "%.2f to %.2f B" % (x[0] / 1e9, x[1] / 1e9)
rows = {}
rows["pilot: cost probe 4x1x3 change"] = mul(12, chg)
rows["pilot: C 12 tasks x 4 arms x 3"] = mul(144, chg)
rows["pilot: Q 30 x 6 arms x 2"] = mul(360, qrun)
rows["pilot: K1 8 claims x 5 steps, A3t+A3c"] = add(mul(40, qrun), mul(28, serve), mul(12, qrun))
rows["main: C core 40 x 3 arms x 3 + A0p 20 x 3"] = mul(420, chg)
rows["main: Q product 70 x 7 arms x 2 + steering 30 x 2 x 2"] = mul(1100, qrun)
rows["main: D documents 40 x 4 arms x 2"] = mul(320, qrun)
rows["main: K1 40 x 10, A3t all, A3c 280 serves + 120 re-derive"] = add(mul(400, qrun), mul(280, serve), mul(120, qrun))
rows["main: B with agent 30 x 3 arms x 1"] = mul(90, qrun)
rows["refs: readers (K 480, questions 320)"] = mul(800, reader)
rows["refs: judge 670 rubric answers x 5"] = mul(3350, judge)
rows["refs: sufficiency check 52 change-sized"] = mul(52, chg)
rows["option: C extended 20 x 4 arms x 2"] = mul(160, chg)
for k, v in rows.items():
    print("%-62s %s" % (k, b(v)))
pilot = add(*[v for k, v in rows.items() if k.startswith("pilot")])
main = add(*[v for k, v in rows.items() if k.startswith("main") or k.startswith("refs")])
print("pilot total %s; main total %s; main + 10 %% reruns %s; option extended %s" % (b(pilot), b(main), b(mul(1.1, main)), b(rows["option: C extended 20 x 4 arms x 2"])))
