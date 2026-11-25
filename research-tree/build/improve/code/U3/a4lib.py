"""A4 pieces that need no card: the authors' listwise prompt (SweRank, rank_listwise_os_llm.py, code reranking, GitHub-issue
prompt, numeric identifiers, no logits mode, greedy), the sliding window schedule (rankllm.sliding_windows), the response
parser (rankllm._clean_response, _remove_duplicate, receive_permutation) and the score columns."""
import re
import numpy as np

PREFIX = ('I will provide you with {num} code functions, each indicated by a numerical identifier []. Rank the code functions '
          'based on their relevance to contain the faults causing the GitHub issue: {query}.\n')
POST = ('GitHub Issue: {query}. \nRank the {num} code functions above based on their relevance to contain the faults causing '
        'the GitHub issue. All the code functions should be included and listed using identifiers, in descending order of '
        'relevance. The output format should be [] > [], e.g., [4] > [2]. Only respond with the ranking results, do not say '
        'any word or explain.')


def replace_number(s):
    """rankllm._replace_number: '[3]' inside a document becomes '(3)' so it cannot be read as an identifier."""
    return re.sub(r'\[(\d+)\]', r'(\1)', s)


def user_message(query, docs):
    """query: text (already cut); docs: list of strings (already cut to the token budget)."""
    n = len(docs)
    s = PREFIX.format(num=n, query=query) + '\n'
    for i, d in enumerate(docs, 1):
        s += f'[{i}] {replace_number(d)}\n'
    s += POST.format(num=n, query=query)
    return s


def windows(k, window, step, start=0):
    """rankllm.sliding_windows: windows over positions [start, k), from the bottom up."""
    out = []
    end, beg = k, k - window
    while end > start and beg + step != start:
        beg = max(beg, start)
        out.append((beg, end))
        end -= step
        beg -= step
    return out


def parse(response, n):
    """rankllm._clean_response (numeric) + _remove_duplicate + receive_permutation: 0-based order of the window's n items;
    items the model did not name keep their order after the named ones."""
    s = ''.join(c if c.isdigit() else ' ' for c in response).strip()
    got = []
    for x in s.split():
        v = int(x) - 1
        if 0 <= v < n and v not in got:
            got.append(v)
    return got + [i for i in range(n) if i not in got]


def apply(order, beg, end, perm):
    """order: list of item ids (best first); permute positions [beg, end) by perm (0-based within the window)."""
    cut = order[beg:end]
    order[beg:end] = [cut[j] for j in perm]
    return order


def rank_scores(order, k, rest):
    """Rank-based scores: the reranked top-k get (k - pos) / k in (0, 1]; every file after them (U1's frozen arm's own
    order) gets a negative score, so the list stays a full ranking. returns {path: score}."""
    out = {}
    for pos, p in enumerate(order[:k]):
        out[p] = (k - pos) / k
    for r, p in enumerate(rest):
        out[p] = -(r + 1) / (len(rest) + 1)
    return out
