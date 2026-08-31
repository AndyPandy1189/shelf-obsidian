import os

files = [
    'src/api/googleBooks.ts',
    'src/api/igdb.ts',
    'src/api/tmdb.ts',
    'src/ui/AddMediaModal.tsx',
    'src/ui/App.tsx',
    'src/main.ts',
    'src/services/NoteGenerator.ts',
    'src/store/cache.ts',
    'src/utils/frontmatter.ts',
    'src/ui/CalendarView.tsx',
    'src/ui/TrackerModal.tsx'
]

for file_path in files:
    if not os.path.exists(file_path): continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'any' not in content: continue

    # Add import
    if "import { ShelfAny } from '../types';" not in content and "import { ShelfAny } from '../../types';" not in content:
        if file_path.startswith('src/api/') or file_path.startswith('src/ui/') or file_path.startswith('src/store/') or file_path.startswith('src/utils/') or file_path.startswith('src/services/'):
            content = "import { ShelfAny } from '../types';\n" + content
        else:
            content = "import { ShelfAny } from './types';\n" + content

    content = content.replace(': any', ': ShelfAny')
    content = content.replace('as any', 'as ShelfAny')
    content = content.replace('<any>', '<ShelfAny>')
    content = content.replace('<any[]>', '<ShelfAny[]>')
    content = content.replace('catch (e: any)', 'catch (e: ShelfAny)')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
