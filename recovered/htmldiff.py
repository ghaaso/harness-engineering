import re, difflib, sys
a = open(sys.argv[1], encoding='utf-8').read()
b = open(sys.argv[2], encoding='utf-8').read()
# drop the embedded data script and the client script; compare the visible markup only
def strip(s):
    s = re.sub(r'<script[\s\S]*?</script>', '', s)
    s = re.sub(r'<style[\s\S]*?</style>', '', s)
    return re.split(r'(?<=[.>])\s*', s)
A, B = strip(a), strip(b)
for l in difflib.unified_diff(A, B, lineterm='', n=0):
    if l.startswith(('---', '+++', '@@')):
        continue
    print(l[:400])
