import os

path = 'src/ui/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

block = '''                    const dateKey = mapped('releaseDate');
                    if (dateKey) {
                        if (r.cover_date) fm[dateKey] = r.cover_date.length > 10 ? r.cover_date.substring(0, 10) : r.cover_date;
                        else if (r.start_year) fm[dateKey] = r.start_year;
                    }'''
                    
block_new = '''                    const dateKey = mapped('releaseDate');
                    if (dateKey) {
                        if (r.store_date) fm[dateKey] = r.store_date.length > 10 ? r.store_date.substring(0, 10) : r.store_date;
                        else if (r.cover_date) fm[dateKey] = r.cover_date.length > 10 ? r.cover_date.substring(0, 10) : r.cover_date;
                        else if (r.start_year) fm[dateKey] = r.start_year;
                    }'''

content = content.replace(block, block_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
