import pathlib
root = pathlib.Path('.')
for path in root.rglob('*'):
    if path.is_file() and path.suffix in {'.ts','.tsx','.js','.json','.md','.env','.sql'}:
        try:
            text = path.read_text(encoding='utf-8')
        except Exception:
            continue
        for i,line in enumerate(text.splitlines(),1):
            if any(ord(ch)>127 for ch in line):
                print(f"{path}:{i}:{line}")
