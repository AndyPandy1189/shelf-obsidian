import os

path = 'src/ui/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

block = "const date = r.cover_date || r.start_year || '';"
block_new = "const date = r.store_date || r.cover_date || r.start_year || '';"

content = content.replace(block, block_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
