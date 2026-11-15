import ast, os, sys, collections
R='C:/Users/User/Documents/projects/EMS_workshop1/backend'
n=0; files=0; defs=collections.Counter(); calls=[]
for root,ds,fs in os.walk(R):
    ds[:]=[d for d in ds if d not in ('venv','.venv','node_modules','__pycache__','.mypy_cache','.pytest_cache','.ruff_cache')]
    for f in fs:
        if not f.endswith('.py'): continue
        p=os.path.join(root,f); files+=1
        t=ast.parse(open(p,encoding='utf8').read())
        for x in ast.walk(t):
            if isinstance(x,(ast.FunctionDef,ast.AsyncFunctionDef,ast.ClassDef)): defs[x.name]+=1
            if isinstance(x,ast.Call):
                n+=1
                fn=x.func
                nm=fn.attr if isinstance(fn,ast.Attribute) else (fn.id if isinstance(fn,ast.Name) else None)
                calls.append((nm, 'tests' in p.replace(os.sep,'/').split('/') or os.path.basename(p).startswith('test_') or f=='conftest.py'))
print('py files',files,'call nodes',n)
m=sum(1 for nm,t in calls if nm in defs); print('call sites whose callee name equals some repo def name',m)
print('  of which in test files',sum(1 for nm,t in calls if nm in defs and t))
