import os
import re

path = 'src/main.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. API Keys
gb_api = '''		new Setting(containerEl)
			.setName('Google Books API Key')
			.setDesc('Required for Books metadata.')
			.addText(text => {
				text.inputEl.type = 'password';
				text.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.googleBooksApiKey)
				.onChange(async (value) => {
					this.plugin.settings.googleBooksApiKey = value;
					await this.plugin.saveSettings();
				});
			});'''

cv_api = gb_api + '''

		new Setting(containerEl)
			.setName('Comic Vine API Key')
			.setDesc('Required for Comics & Manga metadata.')
			.addText(text => {
				text.inputEl.type = 'password';
				text.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.comicVineApiKey)
				.onChange(async (value) => {
					this.plugin.settings.comicVineApiKey = value;
					await this.plugin.saveSettings();
				});
			});'''

content = content.replace(gb_api, cv_api)

# 2. Template settings
book_template_end = '''			.addTextArea(text => {
				text.setValue(this.plugin.settings.bookTemplate)
				.onChange(async (v) => { this.plugin.settings.bookTemplate = v; await this.plugin.saveSettings(); });
				setupTextArea(text);
			});
		s4.settingEl.classList.add('shelf-setting-block');'''

comic_template = book_template_end + '''

		new Setting(containerEl).setName('Comics & Manga Setup').setHeading();
		
		new Setting(containerEl)
			.setName('Destination Folder')
			.setDesc('Default folder to save comics & manga notes')
			.addSearch((cb) => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: folder1/folder2')
					.setValue(this.plugin.settings.comicMangaDestinationFolder)
					.onChange(async (new_folder) => {
						this.plugin.settings.comicMangaDestinationFolder = new_folder;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Custom Template Path (Optional)')
			.setDesc('Absolute path to a template file. If empty, the fallback template below is used.')
			.addText(text => text
				.setPlaceholder('Templates/Comic.md')
				.setValue(this.plugin.settings.comicMangaTemplatePath)
				.onChange(async (value) => {
					this.plugin.settings.comicMangaTemplatePath = value;
					await this.plugin.saveSettings();
				}));

		const s5 = new Setting(containerEl)
			.setName('Comics & Manga Template')
			.setDesc(createVarsDesc('Markdown template for newly added comics. Maps metadata to frontmatter.', ['author', 'categories', 'publisher', 'releaseDate', 'issueNumber']))
			.addTextArea(text => {
				text.setValue(this.plugin.settings.comicMangaTemplate)
				.onChange(async (v) => { this.plugin.settings.comicMangaTemplate = v; await this.plugin.saveSettings(); });
				setupTextArea(text);
			});
		s5.settingEl.classList.add('shelf-setting-block');'''

content = content.replace(book_template_end, comic_template)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
