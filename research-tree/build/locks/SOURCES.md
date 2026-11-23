# Sources of the locks check (downloaded 2026-11-20)

The owner approved the eight downloads in the locks session on 2026-11-20 (an `approve:` question naming each file, its
source and size; his answer "Yes, download all 8"). Each file is in its own folder under `papers/` with its text beside
it (`paper.txt`: `pdftotext -layout`, version 4.06, for a PDF; tags stripped for a page). The files are not committed
(as round 3's papers); the size and the first 16 hex digits of the sha256 identify each copy.

| Folder | Source | Bytes | sha256 (first 16) |
|---|---|---|---|
| cmu-notes-09 | https://15445.courses.cs.cmu.edu/fall2023/notes/09-indexconcurrency.pdf | 278374 | e05addfae0a840cc |
| cmu-notes-16 | https://15445.courses.cs.cmu.edu/fall2023/notes/16-twophaselocking.pdf | 327575 | ef099f5d7117578e |
| cmu-slides-09 | https://15445.courses.cs.cmu.edu/fall2023/slides/09-indexconcurrency.pdf | 3001125 | ece824ee50e00bd5 |
| cmu-slides-16 | https://15445.courses.cs.cmu.edu/fall2023/slides/16-twophaselocking.pdf | 3177938 | ecb014a171e2de24 |
| crotty2022 | https://db.cs.cmu.edu/papers/2022/cidr2022-p13-crotty.pdf | 742351 | 5987a4221959b031 |
| burrows2006 | https://static.googleusercontent.com/media/research.google.com/en//archive/chubby-osdi06.pdf | 117687 | 0747c84a49d32744 |
| sqlite-lockingv3 | https://www.sqlite.org/lockingv3.html | 29892 | fa67031159fc0658 |
| sqlite-howtocorrupt | https://www.sqlite.org/howtocorrupt.html | 46737 | e00709e3f37e9533 |

On disk already: Graefe 2010, under `docs/program/evidence/round3-2026-11-18/papers/`. Not found as an open copy:
Gray and Cheriton 1989 (leases), four places tried.
