# After-compaction count: scoring addendum 1.11 as first saved

Saved at 2026-11-14T10:52:09.965Z (UTC), after the hand read of 1.7 was finished and its verdicts were saved in audit.json, and
before any signal had been counted before or after anything.

sha256 of the text below this line: d2501f4f5b15dde4b15afb4fdcbecb556910fc0e93cb16ef8f59aeb7c8919ff7

The same text, byte for byte, is section 1.11 of docs/program/AFTER-COMPACTION-2026-11.md.

---

### 1.11 Added after the hand read, and fixed before any count: the same lines read again

Written after the hand read of 1.7 was finished and its verdicts were saved, and before any signal had
been counted before or after anything. A copy as first saved is in
`docs/program/evidence/after-compaction/scoring-addendum-first-saved.md`.

**Why it was added.** The hand read of A3 found all 15 sampled events to be second reads of the same
file, so by 1.7 the kind stands. But 9 of the 15 read another part of the file, 4 read it after the
session itself had changed it, and only 2 read the same content again. As fixed, A3 counts going back to
a file. It does not count learning a file again, and that is the cost the split replay had to guess.

**What is added: A3s, the same lines read again.** A read in the window that names the same path as a
read in the reference calls (A3's reference calls), whose lines overlap that read's lines, with no write
to the file between the two that the calls show.

- **Lines.** The Read tool's offset and limit, or the whole file without them. `sed -n` with line
  numbers: those lines. `head`: line 1 to its count, 10 by default. `tail`: the end of the file, which
  overlaps only a whole-file read or another `tail`. cat, nl, less, more, bat, type, Get-Content and gc:
  the whole file. A read whose lines the script cannot tell overlaps nothing.
- **A write between the two.** An Edit or Write call on the path; a shell call that names the file and
  edits in place, redirects into it, copies or moves over it, formats it or restores it with git; or a
  result in which the harness notes that the command modified the file. The later read's own call is
  checked too, for a command that edits and then prints.
- A3s is a cost, like A3, and is never in M. It gets its own hand read of 15 by the rule of 1.7, judged
  on whether the event reads the same lines of the same file again with nothing changed between.

**A3's verdict codes, as used in the read.** Y the same content again. S another part of the same file.
W the file was changed between the two reads. All three are a second read of the same file.

