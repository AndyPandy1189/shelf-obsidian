import os
import re

path = 'src/store/cache.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("export type MediaItem = {", "export type MediaItem = {\n    type: 'Movies' | 'TV' | 'Games' | 'Books' | 'Comics & Manga' | 'Unknown';")
content = content.replace("type: 'Movies' | 'TV' | 'Games' | 'Books' | 'Unknown';", "")

# Note: The first replacement will add the new type list, the second will remove the old one if I did it right, 
# but it's easier to just regex the type definition.

content = re.sub(r"type: 'Movies' \| 'TV' \| 'Games' \| 'Books' \| 'Unknown';",
                 r"type: 'Movies' | 'TV' | 'Games' | 'Books' | 'Comics & Manga' | 'Unknown';", content)

content = content.replace("const bookFolder = String(settings.bookDestinationFolder).toLowerCase();",
                          "const bookFolder = String(settings.bookDestinationFolder).toLowerCase();\n    const comicMangaFolder = String(settings.comicMangaDestinationFolder).toLowerCase();")

content = content.replace("const isInBook = bookFolder && lowerPath.includes(bookFolder);",
                          "const isInBook = bookFolder && lowerPath.includes(bookFolder);\n    const isInComicManga = comicMangaFolder && lowerPath.includes(comicMangaFolder);")

content = content.replace("if (!isInMovie && !isInTv && !isInGame && !isInBook) {",
                          "if (!isInMovie && !isInTv && !isInGame && !isInBook && !isInComicManga) {")

content = content.replace("else if (isInBook) typeStr = 'Books';",
                          "else if (isInBook) typeStr = 'Books';\n    else if (isInComicManga) typeStr = 'Comics & Manga';")

content = content.replace("else if (strType.includes('book')) typeStr = 'Books';",
                          "else if (strType.includes('book')) typeStr = 'Books';\n        else if (strType.includes('comic') || strType.includes('manga')) typeStr = 'Comics & Manga';")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
