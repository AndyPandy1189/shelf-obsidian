import { ShelfAny } from './types';
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
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<ShelfPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

export async function openFileRight(plugin: ShelfPlugin, file: ShelfAny) { const { workspace } = plugin.app; const currentLeaf = workspace.getMostRecentLeaf(); const markdownLeaves = workspace.getLeavesOfType('markdown'); const otherLeaf = markdownLeaves.find(l => l !== currentLeaf); let newLeaf; if (otherLeaf) { workspace.setActiveLeaf(otherLeaf, { focus: true }); newLeaf = workspace.getLeaf('tab'); } else { newLeaf = workspace.getLeaf('split', 'vertical'); } await newLeaf.openFile(file); }
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
		
		const noticeDiv = containerEl.createDiv();
		noticeDiv.addClass('shelf-settings-callout');
		
		noticeDiv.createEl('strong', { text: '⚠️ Important: ' });
		noticeDiv.appendText('The ');
		noticeDiv.createEl('code', { text: '{{externalId}}', cls: 'shelf-settings-code' });
		noticeDiv.appendText(' variable is ');
		noticeDiv.createEl('strong', { text: 'strictly required' });
		noticeDiv.appendText(' in all of your templates. Without it, the plugin will not be able to sync or refresh metadata for your items!');
		
		const createVarsDesc = (desc: string, vars: string[]) => {
			const frag = createFragment();
			frag.appendText(desc);
			frag.createEl('br');
			frag.createEl('br');
			frag.createEl('strong', { text: 'Available Variables: ' });
			vars.forEach(v => {
				frag.createEl('code', { text: `{{${v}}}`, cls: 'shelf-settings-code' });
			});
			return frag;
		};

		const commonDiv = containerEl.createDiv();
		commonDiv.addClass('setting-item-description');
		commonDiv.createEl('strong', { text: 'Common Variables (All Types): ' });
		['title', 'coverUrl', 'releaseDate', 'releaseState', 'externalId'].forEach(v => {
			commonDiv.createEl('code', { text: `{{${v}}}`, cls: 'shelf-settings-code' });
		});
		
		const setupTextArea = (text: import('obsidian').TextAreaComponent) => {
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


