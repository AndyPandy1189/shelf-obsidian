import os

path = 'src/ui/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'const watchedCount = Array.isArray(fmWatched) ? fmWatched.length : tvd.watched.length;',
    'const watchedCount = Array.isArray(fmWatched) ? fmWatched.length : (tvd.watched?.length || 0);'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
