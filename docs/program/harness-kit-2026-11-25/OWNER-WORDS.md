# The owner's words (2026-11-25, his third message of that day), in full

These outrank every brief and file written from them.

> all the parallization work + experiments + final result full system with maxmimum speedup ready for use it should be easier to find on my branch or the main branch for my teammate to use and have a readme of how to use it properly along with orchestration.doc so she doesnt end up exhausting tokens or having models overthink etc

His later messages of the same day on the kit, in full:

> o yea and btw she has macos and she doesnt need the fixflow skills, but shell fix it to have it work on her mac hopefully

> Where's the parallelization stuff? I recall we did a lot of work on the parallelization maximization, on maximizing speed up as well. We even worked out how to do multiple writers on the same file, while beforehand we were doing only a single writer, while we had multiple readers. So we did a lot of work. We even pulled out research papers and used their algorithms to maximize our workflow, all the database engineering, we did so much work, but I'm not seeing like a shred of that here. It's very confusing and weird for me.

> not just copy it into the Git. All that work has to be enforced in the sense that she only sets up the Git from the README, and all her work follows, and she achieves the speedups that are mentioned in the document and the research. And if there are things that we haven't, that are on trial, she can just see them for themselves if they work or not. That won't be that difficult for her. But you're not supposed to leave things out like you did. And make sure you're not missing anything after this. Like,

(The last message ends there.)

A later message of the same day, relayed at about 17:45 UTC by the session that started the kit job (the owner
typed it there; it reached the kit's coordinator as a message from that session), in full:

> Also, do tell it to like make the hooks in Rust instead of JavaScript. We're already aiming to migrate the JavaScript stuff to Rust. So if it's possible to like do the coding and stuff in Rust, okay. We do have Rust skills downloaded somewhere on this repo, so like you can load those up as

(That message ends there too.)

His answer at about 17:50 UTC to the coordinator's cap: question for the Rust hooks (it had said that the
JavaScript hooks would stay as the fallback for a machine without Rust), in full:

> yes 95m also no fallbacks needed we willl fix errors if they occue

What the coordinator takes from it: the cap is 95 M tokens; the kit wires the Rust hooks only, with no JavaScript
hook behind them on a machine without Rust; a fault found later is fixed then.

What the top session understood at the third message, and he corrected it with the ones above: one folder at the root, `harness-kit/`, that a second person
can find and use: a setup that works on her machine, a README of how to use it properly, an orchestration guide her
sessions follow so that helpers do not burn tokens or run on a model or effort larger than the job needs, and the
experiments with their measured results. On his line `bilal/build`, and added to the open pull request to `main`.
Nothing is claimed that no record measures.
