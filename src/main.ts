import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, Notice, TFile } from 'obsidian';
import { ShelfView, VIEW_TYPE_SHELF } from './ShelfView';
import { FolderSuggest } from './settings/FolderSuggest';
import { getTMDBDetails } from './api/tmdb';

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
	movieDestinationFolder: 'Shelf/Movies',
	tvDestinationFolder: 'Shelf/TV',
	gameDestinationFolder: 'Shelf/Games',
	bookDestinationFolder: 'Shelf/Books',
	movieTemplatePath: '',
	tvTemplatePath: '',
	gameTemplatePath: '',
	tvTrackerData: {},
	movieTemplate: `---
title: "{{title}}"
creator: ""
categories: []
publisher: []
releaseDate: "{{releaseDate}}"
releaseState: "{{releaseState}}"
posterImage: "{{coverUrl}}"
rating: 
mediaType: "movie"
status: "Not Started"
externalId: "{{externalId}}"
movie series: ""
movie series order: ""
collection: false
---`,
	tvTemplate: `---
title: "{{title}}"
creator: ""
categories: []
publisher: []
releaseDate: "{{releaseDate}}"
releaseState: "{{releaseState}}"
posterImage: "{{coverUrl}}"
rating: 
mediaType: "tv"
status: "Not Started"
externalId: "{{externalId}}"
collection: false
---`,
	gameTemplate: `---
title: "{{title}}"
creator: ""
categories: []
publisher: []
releaseDate: "{{releaseDate}}"
releaseState: "{{releaseState}}"
posterImage: "{{coverUrl}}"
rating: 
mediaType: "game"
status: "Not Started"
externalId: "{{externalId}}"
collection: false
---`,
	bookTemplate: `---
title: "{{title}}"
creator: ""
categories: []
publisher: []
releaseDate: "{{releaseDate}}"
releaseState: "{{releaseState}}"
posterImage: "{{coverUrl}}"
rating: 
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
			this.activateView();
		});

		this.addSettingTab(new ShelfSettingTab(this.app, this));
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_SHELF);
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(VIEW_TYPE_SHELF)[0];

		if (!leaf) {
			const leafObj = workspace.getLeaf(true);
			await leafObj.setViewState({ type: VIEW_TYPE_SHELF, active: true });
			leaf = leafObj;
		}

		workspace.revealLeaf(leaf);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

export async function openFileRight(plugin: ShelfPlugin, file: any) {
    const { workspace } = plugin.app;
    const currentLeaf = workspace.getMostRecentLeaf();
    
    // Find any existing markdown leaf that isn't the shelf view or current leaf
    const markdownLeaves = workspace.getLeavesOfType('markdown');
    const otherLeaf = markdownLeaves.find(l => l !== currentLeaf);
    
    let newLeaf;
    if (otherLeaf) {
        // Set focus to the other pane, then create a new tab in it
        workspace.setActiveLeaf(otherLeaf, { focus: true });
        newLeaf = workspace.getLeaf('tab');
    } else {
        // If there's no other pane, split vertically
        newLeaf = workspace.getLeaf('split', 'vertical');
    }
    
    await newLeaf.openFile(file);
}

class ShelfSettingTab extends PluginSettingTab {
	plugin: ShelfPlugin;

	constructor(app: App, plugin: ShelfPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		containerEl.createEl('h3', {text: 'API Setup'});
		new Setting(containerEl)
			.setName('TMDB API Key')
			.setDesc('Required for Movies & TV Shows metadata.')
			.addText(text => {
				text.inputEl.type = 'password';
				text.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.tmdbApiKey)
				.onChange(async (value) => {
					this.plugin.settings.tmdbApiKey = value;
					await this.plugin.saveSettings();
				});
			});

        new Setting(containerEl)
			.setName('IGDB Client ID')
			.setDesc('Required for Games metadata.')
			.addText(text => {
				text.inputEl.type = 'password';
				text.setPlaceholder('Enter your Client ID')
				.setValue(this.plugin.settings.igdbClientId)
				.onChange(async (value) => {
					this.plugin.settings.igdbClientId = value;
					await this.plugin.saveSettings();
				});
			});
        
        new Setting(containerEl)
			.setName('IGDB Client Secret')
			.setDesc('Required to automatically fetch IGDB Access Tokens.')
			.addText(text => {
				text.inputEl.type = 'password';
				text.setPlaceholder('Enter your Client Secret')
				.setValue(this.plugin.settings.igdbClientSecret)
				.onChange(async (value) => {
					this.plugin.settings.igdbClientSecret = value;
					await this.plugin.saveSettings();
				});
			});

        new Setting(containerEl)
			.setName('Google Books API Key')
			.setDesc('Optional but recommended to prevent 429 Too Many Requests errors for Books.')
			.addText(text => {
				text.inputEl.type = 'password';
				text.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.googleBooksApiKey)
				.onChange(async (value) => {
					this.plugin.settings.googleBooksApiKey = value;
					await this.plugin.saveSettings();
				});
			});

		containerEl.createEl('h3', {text: 'Folder Settings'});
		
		new Setting(containerEl)
			.setName('Movies Folder')
			.addText(text => {
				new FolderSuggest(this.app, text.inputEl);
				text.setValue(this.plugin.settings.movieDestinationFolder)
				.onChange(async (v) => { this.plugin.settings.movieDestinationFolder = v; await this.plugin.saveSettings(); });
			});
				
		new Setting(containerEl)
			.setName('TV Folder')
			.addText(text => {
				new FolderSuggest(this.app, text.inputEl);
				text.setValue(this.plugin.settings.tvDestinationFolder)
				.onChange(async (v) => { this.plugin.settings.tvDestinationFolder = v; await this.plugin.saveSettings(); });
			});
				
		new Setting(containerEl)
			.setName('Games Folder')
			.addText(text => {
				new FolderSuggest(this.app, text.inputEl);
				text.setValue(this.plugin.settings.gameDestinationFolder)
				.onChange(async (v) => { this.plugin.settings.gameDestinationFolder = v; await this.plugin.saveSettings(); });
			});
				
		new Setting(containerEl)
			.setName('Books Folder')
			.addText(text => {
				new FolderSuggest(this.app, text.inputEl);
				text.setValue(this.plugin.settings.bookDestinationFolder)
				.onChange(async (v) => { this.plugin.settings.bookDestinationFolder = v; await this.plugin.saveSettings(); });
			});

		containerEl.createEl('h3', {text: 'Template Settings'});
		
		const noticeDiv = containerEl.createEl('div', { 
			attr: { 
				style: 'background-color: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-left: 4px solid var(--interactive-accent); color: var(--text-normal); padding: 10px 15px; border-radius: 4px; margin-bottom: 15px; font-size: 0.9em; line-height: 1.5;' 
			} 
		});
		noticeDiv.innerHTML = `<strong>⚠️ Important:</strong> The <code style="background: var(--background-modifier-form-field); padding: 2px 4px; border-radius: 4px;">{{externalId}}</code> variable is <strong>strictly required</strong> in all of your templates. Without it, the plugin will not be able to sync or refresh metadata for your items!`;
		
		const createVarsDesc = (desc: string, vars: string[]) => {
			const frag = document.createDocumentFragment();
			frag.appendText(desc);
			frag.appendChild(document.createElement('br'));
			frag.appendChild(document.createElement('br'));
			const b = document.createElement('strong');
			b.textContent = 'Available Variables: ';
			frag.appendChild(b);
			vars.forEach(v => {
				const code = document.createElement('code');
				code.textContent = `{{${v}}}`;
				code.style.marginLeft = '4px';
				code.style.padding = '2px 4px';
				code.style.backgroundColor = 'var(--background-modifier-form-field)';
				code.style.borderRadius = '4px';
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
			code.style.marginLeft = '4px';
			code.style.padding = '2px 4px';
			code.style.backgroundColor = 'var(--background-modifier-form-field)';
			code.style.borderRadius = '4px';
			commonDesc.appendChild(code);
		});
		const commonDiv = containerEl.createEl('div', { cls: 'setting-item-description', attr: { style: 'margin-bottom: 15px;' } });
		commonDiv.appendChild(commonDesc);
		
		new Setting(containerEl)
			.setName('Movie Template')
			.setDesc(createVarsDesc('Markdown template for newly added movies. Maps metadata to frontmatter.', ['overview', 'rating', 'originalLanguage', 'genres', 'studios', 'directors']))
			.addTextArea(text => {
				text.setValue(this.plugin.settings.movieTemplate)
				.onChange(async (v) => { this.plugin.settings.movieTemplate = v; await this.plugin.saveSettings(); });
				text.inputEl.style.width = '100%';
				text.inputEl.style.minHeight = '150px';
				text.inputEl.style.fontFamily = 'monospace';
			}).settingEl.style.display = 'block';

		new Setting(containerEl)
			.setName('TV Show Template')
			.setDesc(createVarsDesc('Markdown template for newly added TV shows. Maps metadata to frontmatter.', ['overview', 'rating', 'originalLanguage', 'genres', 'studios', 'directors']))
			.addTextArea(text => {
				text.setValue(this.plugin.settings.tvTemplate)
				.onChange(async (v) => { this.plugin.settings.tvTemplate = v; await this.plugin.saveSettings(); });
				text.inputEl.style.width = '100%';
				text.inputEl.style.minHeight = '150px';
				text.inputEl.style.fontFamily = 'monospace';
			}).settingEl.style.display = 'block';

		new Setting(containerEl)
			.setName('Game Template')
			.setDesc(createVarsDesc('Markdown template for newly added games. Maps metadata to frontmatter.', ['summary', 'rating', 'genres', 'developer']))
			.addTextArea(text => {
				text.setValue(this.plugin.settings.gameTemplate)
				.onChange(async (v) => { this.plugin.settings.gameTemplate = v; await this.plugin.saveSettings(); });
				text.inputEl.style.width = '100%';
				text.inputEl.style.minHeight = '150px';
				text.inputEl.style.fontFamily = 'monospace';
			}).settingEl.style.display = 'block';

		new Setting(containerEl)
			.setName('Book Template')
			.setDesc(createVarsDesc('Markdown template for newly added books. Maps metadata to frontmatter.', ['authors', 'genres', 'publisher', 'pageCount', 'description']))
			.addTextArea(text => {
				text.setValue(this.plugin.settings.bookTemplate)
				.onChange(async (v) => { this.plugin.settings.bookTemplate = v; await this.plugin.saveSettings(); });
				text.inputEl.style.width = '100%';
				text.inputEl.style.minHeight = '150px';
				text.inputEl.style.fontFamily = 'monospace';
			}).settingEl.style.display = 'block';
	}
}
