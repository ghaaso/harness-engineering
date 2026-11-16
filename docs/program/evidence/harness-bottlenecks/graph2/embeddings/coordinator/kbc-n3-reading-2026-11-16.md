# The authors' N3 regulariser, as read on 2026-11-16

Read by the coordinating session through a web fetch on 2026-11-16 (the `main` branch as it stood that
day; no commit id was taken). It backs point 9 of section 6 of `../COORDINATOR-REPORT.md`. Nothing about
this project was sent in the requests.

## 1. The code

Source: `https://raw.githubusercontent.com/facebookresearch/kbc/main/kbc/regularizers.py`

The `forward` method of the class `N3`, as fetched:

```
    def forward(self, factors):
        norm = 0
        for f in factors:
            norm += self.weight * torch.sum(
                torch.abs(f) ** 3
            )
        return norm / factors[0].shape[0]
```

It multiplies the weight by the sum of the cubed absolute values of every factor and divides by the
size of the first dimension of the first factor (the batch size). There is no division by 3 and no
factor of one third.

## 2. The paper

Source: `https://arxiv.org/html/1806.07297v1` (Lacroix, Usunier, Obozinski, "Canonical Tensor
Decomposition for Knowledge Base Completion", ICML 2018). The formulas were read from the page's text,
where the equations render poorly; in plain notation:

- section 4.1 defines the nuclear p-norm regulariser with a factor of one third, and the objective with
  `(lambda / 3)` times the sum of the cubed norms;
- section 4.2, the weighted form, has per training triple `(lambda / 3)` times the sum of the cubed
  moduli of the three factors.

So the paper writes one third in the formula and the code does not.

## 3. The weights the authors publish

Source: `https://raw.githubusercontent.com/facebookresearch/kbc/main/README.md`

The README gives one command line (FB15K, `--regularizer N3 --reg 1e-2`) and tables of the `reg` value
per rank: for FB15K-237, `5e-4` at rank 5 and `5e-2` at ranks 25 to 2000; for WN18RR, `5e-4` at ranks 5
and 8, `5e-2` at rank 16 and `1e-1` at ranks 25 to 2000. These are values of the code's `--reg`, which
is the `weight` above.

## 4. What follows for this test

The lane's `train/kge.py` computes `w / 3` times the sum of cubed moduli, divided by the batch size,
with `w` up to 0.1. In the code's units that is at most 0.033: a third of the 0.1 published for WN18RR
and two thirds of the 0.05 published for FB15k-237. That the code's weight is not meant as the paper's
`lambda / 3` is a reading of the two sources side by side; the repository does not say so.
