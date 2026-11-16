import sys
from pypdf import PdfReader
r = PdfReader(sys.argv[1])
out = []
for i, p in enumerate(r.pages):
    try:
        out.append("\n=== PAGE %d ===\n" % (i + 1) + (p.extract_text() or ""))
    except Exception as e:
        out.append("\n=== PAGE %d ERR %s ===\n" % (i + 1, e))
open(sys.argv[2], "w", encoding="utf-8").write("".join(out))
print(len(r.pages), "pages")
