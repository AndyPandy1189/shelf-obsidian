import os

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            lines = content.split('\n')
            new_lines = []
            for line in lines:
                if 'no-misused-promises' in line and '// eslint-disable-next-line' in line:
                    continue
                new_lines.append(line)
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(new_lines))
