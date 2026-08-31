/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-misused-promises, obsidianmd/prefer-create-el */
import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { ShelfView, VIEW_TYPE_SHELF } from './ShelfView';
import { FolderSuggest } from './settings/FolderSuggest';

interface ShelfPluginSettings {
	tmdbApiKey: string;
	igdbClientId: string;
	igdbClientSecret: string;
	igdbAccessToken: string;
	googleBooksApiKey: string;
	movieTemplatePath: string;
	movieDestinationFolder: string;
	tvTemplatePath: string;
	tvDestinationFolder: string;
	gameDestinationFolder: string;
	gameTemplatePath: string;
	bookTemplatePath: string;
	bookDestinationFolder: string;
	movieTemplate: string;
	tvTemplate: string;
	gameTemplate: string;
	bookTemplate: string;
	tvTrackerData: Record<string, {
		seasons: {season: number, name?: string, episodes: number}[];
		watched: string[];
		skipped?: string[];
		progress: number;
		nextEpisode?: {
			date: string;
			title: string;
			season: number;
			episode: number;
		};
	}>;
}

const DEFAULT_SETTINGS: ShelfPluginSettings = {
	tmdbApiKey: '',
	igdbClientId: '',
	igdbClientSecret: '',
	igdbAccessToken: '',
	googleBooksApiKey: '',
	movieTemplatePath: '',
	movieDestinationFolder: 'Shelf/Movies',
	tvTemplatePath: '',
	tvDestinationFolder: 'Shelf/TV Shows',
	gameTemplatePath: '',
	gameDestinationFolder: 'Shelf/Games',
	bookTemplatePath: '',
	bookDestinationFolder: 'Shelf/Books',
	tvTrackerData: {},
	movieTemplate: `---
title: "{{title}}"
releaseDate: "{{releaseDate}}"
releaseState: "{{releaseState}}"
posterImage: "{{coverUrl}}"
rating: "{{rating}}"
overview: "{{overview}}"
genres: {{genres}}
studios: {{studios}}
directors: {{directors}}
mediaType: "movie"
status: "Not Started"
externalId: "{{externalId}}"
collection: false
---`,
	tvTemplate: `---
title: "{{title}}"
releaseDate: "{{releaseDate}}"
releaseState: "{{releaseState}}"
posterImage: "{{coverUrl}}"
rating: "{{rating}}"
overview: "{{overview}}"
genres: {{genres}}
studios: {{studios}}
directors: {{directors}}
mediaType: "tv"
status: "Not Started"
externalId: "{{externalId}}"
collection: false
---`,
	gameTemplate: `---
title: "{{title}}"
releaseDate: "{{releaseDate}}"
releaseState: "{{releaseState}}"
posterImage: "{{coverUrl}}"
rating: "{{rating}}"
overview: "{{summary}}"
genres: {{genres}}
developer: "{{developer}}"
mediaType: "game"
status: "Not Started"
externalId: "{{externalId}}"
collection: false
---`,
	bookTemplate: `---
title: "{{title}}"
releaseDate: "{{releaseDate}}"
releaseState: "{{releaseState}}"
posterImage: "{{coverUrl}}"
authors: {{authors}}
publisher: "{{publisher}}"
pageCount: {{pageCount}}
overview: "{{description}}"
genres: {{genres}}
mediaType: "book"
status: "Not Started"
externalId: "{{externalId}}"
collection: false
---`,
}

export default class ShelfPlugin extends Plugin {
	settings: ShelfPluginSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_SHELF,
			(leaf) => new ShelfView(leaf, this)
		);
		
		this.addRibbonIcon('library', 'Shelf', (evt: MouseEvent) => {
			void this.activateView();
		});

		this.addSettingTab(new ShelfSettingTab(this.app, this));
	}

	onunload() {
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(VIEW_TYPE_SHELF)[0];

		if (!leaf) {
			const leafObj = workspace.getLeaf(true);
			await leafObj.setViewState({ type: VIEW_TYPE_SHELF, active: true });
			leaf = leafObj;
		}

		workspace.setActiveLeaf(leaf, { focus: true });
	}

	async loadSettings() {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

export async function openFileRight(plugin: ShelfPlugin, file: any) { const { workspace } = plugin.app; const currentLeaf = workspace.getMostRecentLeaf(); const markdownLeaves = workspace.getLeavesOfType('markdown'); const otherLeaf = markdownLeaves.find(l => l !== currentLeaf); let newLeaf; if (otherLeaf) { workspace.setActiveLeaf(otherLeaf, { focus: true }); newLeaf = workspace.getLeaf('tab'); } else { newLeaf = workspace.getLeaf('split', 'vertical'); } await newLeaf.openFile(file); }
class ShelfSettingTab extends PluginSettingTab {
	plugin: ShelfPlugin;

	constructor(app: App, plugin: ShelfPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions() {
		return [];
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl).setName('API Setup').setHeading();
		new Setting(containerEl)
			.setName('TMDB API Key')
			.setDesc('Required for Movies & TV Shows metadata.')
			.addText(text => text
				.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.tmdbApiKey)
				.onChange(async (value) => {
					this.plugin.settings.tmdbApiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('IGDB Client ID')
			.setDesc('Required for Video Games metadata.')
			.addText(text => text
				.setPlaceholder('Enter your Client ID')
				.setValue(this.plugin.settings.igdbClientId)
				.onChange(async (value) => {
					this.plugin.settings.igdbClientId = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('IGDB Client Secret')
			.setDesc('Required to generate an access token for Video Games metadata.')
			.addText(text => text
				.setPlaceholder('Enter your Client Secret')
				.setValue(this.plugin.settings.igdbClientSecret)
				.onChange(async (value) => {
					this.plugin.settings.igdbClientSecret = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Google Books API Key')
			.setDesc('Required for Books metadata.')
			.addText(text => text
				.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.googleBooksApiKey)
				.onChange(async (value) => {
					this.plugin.settings.googleBooksApiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl).setName('Folders').setHeading();
		
		new Setting(containerEl)
			.setName('Movies Folder')
			.setDesc('Where new movie notes will be saved.')
			.addSearch((search) => {
				new FolderSuggest(this.app, search.inputEl);
				search.setPlaceholder('Shelf/Movies')
				.setValue(this.plugin.settings.movieDestinationFolder)
				.onChange(async (v) => { this.plugin.settings.movieDestinationFolder = v; await this.plugin.saveSettings(); });
			});

		new Setting(containerEl)
			.setName('TV Shows Folder')
			.setDesc('Where new TV show notes will be saved.')
			.addSearch((search) => {
				new FolderSuggest(this.app, search.inputEl);
				search.setPlaceholder('Shelf/TV Shows')
				.setValue(this.plugin.settings.tvDestinationFolder)
				.onChange(async (v) => { this.plugin.settings.tvDestinationFolder = v; await this.plugin.saveSettings(); });
			});

		new Setting(containerEl)
			.setName('Games Folder')
			.setDesc('Where new game notes will be saved.')
			.addSearch((search) => {
				new FolderSuggest(this.app, search.inputEl);
				search.setPlaceholder('Shelf/Games')
				.setValue(this.plugin.settings.gameDestinationFolder)
				.onChange(async (v) => { this.plugin.settings.gameDestinationFolder = v; await this.plugin.saveSettings(); });
			});

		new Setting(containerEl)
			.setName('Books Folder')
			.setDesc('Where new book notes will be saved.')
			.addSearch((search) => {
				new FolderSuggest(this.app, search.inputEl);
				search.setPlaceholder('Shelf/Books')
				.setValue(this.plugin.settings.bookDestinationFolder)
				.onChange(async (v) => { this.plugin.settings.bookDestinationFolder = v; await this.plugin.saveSettings(); });
			});

		new Setting(containerEl).setName('Templates').setHeading();
		
		const noticeDiv = containerEl.createEl('div', { 
			cls: 'shelf-settings-callout'
		});
		
		noticeDiv.createEl('strong', { text: '⚠️ Important: ' });
		noticeDiv.appendText('The ');
		noticeDiv.createEl('code', { text: '{{externalId}}', cls: 'shelf-settings-code' });
		noticeDiv.appendText(' variable is ');
		noticeDiv.createEl('strong', { text: 'strictly required' });
		noticeDiv.appendText(' in all of your templates. Without it, the plugin will not be able to sync or refresh metadata for your items!');
		
		const createVarsDesc = (desc: string, vars: string[]) => {
			const frag = document.createDocumentFragment();
			frag.appendText(desc);
			frag.appendChild(document.createElement('br'));
			frag.appendChild(document.createElement('br'));
			frag.appendChild(Object.assign(document.createElement('strong'), { textContent: 'Available Variables: ' }));
			vars.forEach(v => {
				const code = document.createElement('code');
				code.textContent = `{{${v}}}`;
				code.classList.add('shelf-settings-code');
				frag.appendChild(code);
			});
			return frag;
		};

		const commonDesc = document.createDocumentFragment();
		const commonB = document.createElement('strong');
		commonB.textContent = 'Common Variables (All Types): ';
		commonDesc.appendChild(commonB);
		['title', 'coverUrl', 'releaseDate', 'releaseState', 'externalId'].forEach(v => {
			const code = document.createElement('code');
			code.textContent = `{{${v}}}`;
			code.classList.add('shelf-settings-code');
			commonDesc.appendChild(code);
		});
		
		const commonDiv = containerEl.createEl('div', { cls: 'setting-item-description' });
		commonDiv.appendChild(commonDesc);
		
		const setupTextArea = (text: any) => {
			text.inputEl.classList.add('shelf-textarea');
		};

		const s1 = new Setting(containerEl)
			.setName('Movie Template')
			.setDesc(createVarsDesc('Markdown template for newly added movies. Maps metadata to frontmatter.', ['overview', 'rating', 'originalLanguage', 'genres', 'studios', 'directors']))
			.addTextArea(text => {
				text.setValue(this.plugin.settings.movieTemplate)
				.onChange(async (v) => { this.plugin.settings.movieTemplate = v; await this.plugin.saveSettings(); });
				setupTextArea(text);
			});
		s1.settingEl.classList.add('shelf-setting-block');

		const s2 = new Setting(containerEl)
			.setName('TV Show Template')
			.setDesc(createVarsDesc('Markdown template for newly added TV shows. Maps metadata to frontmatter.', ['overview', 'rating', 'originalLanguage', 'genres', 'studios', 'directors']))
			.addTextArea(text => {
				text.setValue(this.plugin.settings.tvTemplate)
				.onChange(async (v) => { this.plugin.settings.tvTemplate = v; await this.plugin.saveSettings(); });
				setupTextArea(text);
			});
		s2.settingEl.classList.add('shelf-setting-block');

		const s3 = new Setting(containerEl)
			.setName('Game Template')
			.setDesc(createVarsDesc('Markdown template for newly added games. Maps metadata to frontmatter.', ['summary', 'rating', 'genres', 'developer']))
			.addTextArea(text => {
				text.setValue(this.plugin.settings.gameTemplate)
				.onChange(async (v) => { this.plugin.settings.gameTemplate = v; await this.plugin.saveSettings(); });
				setupTextArea(text);
			});
		s3.settingEl.classList.add('shelf-setting-block');

		const s4 = new Setting(containerEl)
			.setName('Book Template')
			.setDesc(createVarsDesc('Markdown template for newly added books. Maps metadata to frontmatter.', ['authors', 'genres', 'publisher', 'pageCount', 'description']))
			.addTextArea(text => {
				text.setValue(this.plugin.settings.bookTemplate)
				.onChange(async (v) => { this.plugin.settings.bookTemplate = v; await this.plugin.saveSettings(); });
				setupTextArea(text);
			});
		s4.settingEl.classList.add('shelf-setting-block');
	}
}
