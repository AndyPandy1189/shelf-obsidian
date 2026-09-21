import os

path = 'src/ui/AddMediaModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix in two places in AddMediaModal.tsx
content = content.replace("const rawDate = r.cover_date || r.start_year || '';", "const rawDate = r.store_date || r.cover_date || r.start_year || '';")

# Fix the assignment in the details block
block = "if (r.start_year) finalMetadata.releaseDate = r.start_year;"
block_new = "if (r.store_date) finalMetadata.releaseDate = r.store_date;\n                    else if (r.cover_date) finalMetadata.releaseDate = r.cover_date;\n                    else if (r.start_year) finalMetadata.releaseDate = r.start_year;"

content = content.replace(block, block_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
