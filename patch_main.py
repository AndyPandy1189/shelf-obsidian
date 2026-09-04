import os
import re

path = 'src/main.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update ShelfPluginSettings
settings_interface = '''interface ShelfPluginSettings {
	tmdbApiKey: string;
	igdbClientId: string;
	igdbClientSecret: string;
	igdbAccessToken: string;
	googleBooksApiKey: string;'''

settings_interface_new = '''interface ShelfPluginSettings {
	tmdbApiKey: string;
	igdbClientId: string;
	igdbClientSecret: string;
	igdbAccessToken: string;
	googleBooksApiKey: string;
	comicVineApiKey: string;
	comicMangaTemplatePath: string;
	comicMangaDestinationFolder: string;
	comicMangaTemplate: string;'''
content = content.replace(settings_interface, settings_interface_new)


# 2. Update DEFAULT_SETTINGS
default_settings = '''const DEFAULT_SETTINGS: ShelfPluginSettings = {
	tmdbApiKey: '',
	igdbClientId: '',
	igdbClientSecret: '',
	igdbAccessToken: '',
	googleBooksApiKey: '','''

default_settings_new = '''const DEFAULT_SETTINGS: ShelfPluginSettings = {
	tmdbApiKey: '',
	igdbClientId: '',
	igdbClientSecret: '',
	igdbAccessToken: '',
	googleBooksApiKey: '',
	comicVineApiKey: '',
	comicMangaTemplatePath: '',
	comicMangaDestinationFolder: 'Shelf/Comics',
	comicMangaTemplate: '---\\nexternalId: {{externalId}}\\ntitle: {{title}}\\ncreator: {{author}}\\ncategories: {{categories}}\\npublisher: {{publisher}}\\nreleaseDate: {{releaseDate}}\\nposterImage: {{posterImage}}\\nrating: 0\\nmediaType: comic\\nstatus: Reading\\n---\\n','''
content = content.replace(default_settings, default_settings_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
