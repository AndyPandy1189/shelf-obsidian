import os
import re

path = 'src/main.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove from interface
content = re.sub(r'\s*comicMangaTemplatePath:\s*string;', '', content)
# 2. Remove from DEFAULT_SETTINGS
content = re.sub(r"\s*comicMangaTemplatePath:\s*'',", '', content)

# 3. Extract the sections
# The entire comics block at the end:
old_comics_block = '''
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

# Remove it
content = content.replace(old_comics_block, "")

# 4. Inject folder setting
folder_setting = '''		new Setting(containerEl)
			.setName('Comics & Manga Folder')
			.setDesc('Where new comics & manga notes will be saved.')
			.addSearch((cb) => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Shelf/Comics')
					.setValue(this.plugin.settings.comicMangaDestinationFolder)
					.onChange(async (new_folder) => {
						this.plugin.settings.comicMangaDestinationFolder = new_folder;
						await this.plugin.saveSettings();
					});
			});'''

book_folder_end = '''		new Setting(containerEl)
			.setName('Books Folder')
			.setDesc('Where new book notes will be saved.')
			.addSearch((search) => {
				new FolderSuggest(this.app, search.inputEl);
				search.setPlaceholder('Shelf/Books')
				.setValue(this.plugin.settings.bookDestinationFolder)
				.onChange(async (v) => { this.plugin.settings.bookDestinationFolder = v; await this.plugin.saveSettings(); });
			});'''

content = content.replace(book_folder_end, book_folder_end + '\n\n' + folder_setting)


# 5. Inject template setting
template_setting = '''		const s5 = new Setting(containerEl)
			.setName('Comics & Manga Template')
			.setDesc(createVarsDesc('Markdown template for newly added comics & manga. Maps metadata to frontmatter.', ['author', 'categories', 'publisher', 'releaseDate', 'issueNumber']))
			.addTextArea(text => {
				text.setValue(this.plugin.settings.comicMangaTemplate)
				.onChange(async (v) => { this.plugin.settings.comicMangaTemplate = v; await this.plugin.saveSettings(); });
				setupTextArea(text);
			});
		s5.settingEl.classList.add('shelf-setting-block');'''

book_template_end = '''		const s4 = new Setting(containerEl)
			.setName('Book Template')
			.setDesc(createVarsDesc('Markdown template for newly added books. Maps metadata to frontmatter.', ['authors', 'genres', 'publisher', 'pageCount', 'description']))
			.addTextArea(text => {
				text.setValue(this.plugin.settings.bookTemplate)
				.onChange(async (v) => { this.plugin.settings.bookTemplate = v; await this.plugin.saveSettings(); });
				setupTextArea(text);
			});
		s4.settingEl.classList.add('shelf-setting-block');'''

content = content.replace(book_template_end, book_template_end + '\n\n' + template_setting)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
