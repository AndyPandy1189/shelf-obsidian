import os

path = 'src/services/NoteGenerator.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

sig_old = "async generateNote(type: 'Movies' | 'TV' | 'Games' | 'Books', title: string, metadata: ShelfAny)"
sig_new = "async generateNote(type: 'Movies' | 'TV' | 'Games' | 'Books' | 'Comics & Manga', title: string, metadata: ShelfAny)"
content = content.replace(sig_old, sig_new)

case_books = '''            case 'Books':
                template = this.plugin.settings.bookTemplate;
                destination = this.plugin.settings.bookDestinationFolder;
                break;'''
case_comics = case_books + '''
            case 'Comics & Manga':
                template = this.plugin.settings.comicMangaTemplate;
                destination = this.plugin.settings.comicMangaDestinationFolder;
                break;'''
content = content.replace(case_books, case_comics)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
