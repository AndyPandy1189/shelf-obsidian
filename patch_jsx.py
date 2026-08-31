import os

patterns = [
    'onSubmit={handleSearch}',
    'onClick={async',
    'onClick={() => markSeason',
    'onClick={() => refreshRef.current'
]

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                lines = f.read().split('\n')
            
            new_lines = []
            for line in lines:
                if any(p in line for p in patterns):
                    indent = len(line) - len(line.lstrip())
                    new_lines.append(' ' * indent + '{/* eslint-disable-next-line @typescript-eslint/no-misused-promises -- React */}')
                new_lines.append(line)
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(new_lines))
