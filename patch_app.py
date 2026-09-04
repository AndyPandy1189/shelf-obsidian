import os
import re

path = 'src/ui/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const [activeTab, setActiveTab] = React.useState<'Movies' | 'TV' | 'Games' | 'Books' | 'Calendar'>('Movies');",
                          "const [activeTab, setActiveTab] = React.useState<'Movies' | 'TV' | 'Games' | 'Books' | 'Comics & Manga' | 'Calendar'>('Movies');")

content = content.replace("else if (item.type === 'Books') template = plugin.settings.bookTemplate;",
                          "else if (item.type === 'Books') template = plugin.settings.bookTemplate;\n            else if (item.type === 'Comics & Manga') template = plugin.settings.comicMangaTemplate;")

content = content.replace("{item.type === 'Books' && <option value=\"Reading\">Reading</option>}",
                          "{(item.type === 'Books' || item.type === 'Comics & Manga') && <option value=\"Reading\">Reading</option>}")

content = content.replace("{['Movies', 'TV', 'Games', 'Books', 'Calendar'].map(tab => (",
                          "{['Movies', 'TV', 'Games', 'Books', 'Comics & Manga', 'Calendar'].map(tab => (")

content = content.replace("<option value=\"Books\">Books</option>\n                        <option value=\"Calendar\">Calendar</option>",
                          "<option value=\"Books\">Books</option>\n                        <option value=\"Comics & Manga\">Comics & Manga</option>\n                        <option value=\"Calendar\">Calendar</option>")

content = content.replace("{activeTab === 'Books' && <option value=\"Reading\">Reading</option>}",
                          "{(activeTab === 'Books' || activeTab === 'Comics & Manga') && <option value=\"Reading\">Reading</option>}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
