import sys
from pypdf import PdfReader
src, dst = sys.argv[1], sys.argv[2]
r = PdfReader(src)
with open(dst, "w", encoding="utf-8") as f:
    for i, p in enumerate(r.pages):
        try:
            t = p.extract_text() or ""
        except Exception as e:
            t = f"[page {i+1} failed: {e}]"
        f.write(f"\n=== PAGE {i+1} ===\n{t}")
print(dst, len(r.pages))
