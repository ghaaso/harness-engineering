# Lists every call site in a line range of a Python file: line, callee expression text.
# python -I callsites.py <file> <start> <end>
import ast, sys
path, a, b = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
src = open(path, encoding="utf8").read()
tree = ast.parse(src)
seen = []
for node in ast.walk(tree):
    if isinstance(node, ast.Call) and a <= node.lineno <= b:
        seen.append((node.lineno, ast.get_source_segment(src, node.func)))
for ln, t in sorted(seen):
    print(ln, t)
