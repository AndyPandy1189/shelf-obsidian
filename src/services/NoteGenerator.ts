import { ShelfAny } from '../types';
import { normalizePath } from 'obsidian';
import ShelfPlugin from '../main';

export class NoteGenerator {
    plugin: ShelfPlugin;

    constructor(plugin: ShelfPlugin) {
        this.plugin = plugin;
    }

    async generateNote(type: 'Movies' | 'TV' | 'Games' | 'Books' | 'Comics & Manga', title: string, metadata: ShelfAny) {
        let template = '';
        let destination = '';

        switch (type) {
            case 'Movies':
                template = this.plugin.settings.movieTemplate;
                destination = this.plugin.settings.movieDestinationFolder;
                break;
            case 'TV':
                template = this.plugin.settings.tvTemplate;
                destination = this.plugin.settings.tvDestinationFolder;
                break;
            case 'Games':
                template = this.plugin.settings.gameTemplate;
                destination = this.plugin.settings.gameDestinationFolder;
                break;
            case 'Books':
                template = this.plugin.settings.bookTemplate;
                destination = this.plugin.settings.bookDestinationFolder;
                break;
            case 'Comics & Manga':
                template = this.plugin.settings.comicMangaTemplate;
                destination = this.plugin.settings.comicMangaDestinationFolder;
                break;
        }

        // Add title directly to metadata object
        metadata.title = title || '';
        
        let content = template;
        
        // Replace all available variables matching {{key}}
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Dynamic API response
        for (const [key, value] of Object.entries(metadata)) {
            if (key === 'raw') continue; // Skip raw dump
            
            // If the template has [{{key}}], the user is manually creating a list format.
            // In that case, we should just join with commas.
            // But if the template has {{key}} and the value is an array, we output a YAML array representation.
            const bracketRegex = new RegExp(`\\[\\{\\{${key}\\}\\}\\]`, 'g');
            if (bracketRegex.test(content)) {
                content = content.replace(bracketRegex, `[${Array.isArray(value) ? value.join(', ') : String(value || '')}]`);
            }
            
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            let replaceStr = String(value || '');
            if (Array.isArray(value)) {
                // Formatting as a proper JSON/YAML array
                // Example: ["Action", "Adventure"]
                replaceStr = JSON.stringify(value);
            }
            content = content.replace(regex, replaceStr);
        }
        
        // Clean up any remaining unmapped [{{variables}}] and {{variables}}
        content = content.replace(/\[\{\{[\w]+\}\}\]/g, '[]');
        content = content.replace(/\{\{[\w]+\}\}/g, '');

        // Replace colons with dashes, then strip other invalid path characters
        const safeTitle = title.replace(/:/g, ' -').replace(/[\\/"*?<>|]/g, '');
        const finalPath = normalizePath(`${destination}/${safeTitle}.md`);
        
        const existingFile = this.plugin.app.vault.getAbstractFileByPath(finalPath);
        if (existingFile) {
            throw new Error(`File already exists: ${finalPath}`);
        }

        await this.ensureFolderExists(destination);

        const newFile = await this.plugin.app.vault.create(finalPath, content);
        return newFile;
    }

    async ensureFolderExists(folderPath: string) {
        const normalized = normalizePath(folderPath);
        if (!normalized) return;
        const parts = normalized.split('/');
        let current = '';
        for (const part of parts) {
            current = current ? `${current}/${part}` : part;
            const existing = this.plugin.app.vault.getAbstractFileByPath(current);
            if (!existing) {
                try {
                    await this.plugin.app.vault.createFolder(current);
                } catch {
                    // Ignore if created concurrently
                }
            }
        }
    }

    async generateCollectionItemNote(options: {
        folderPath: string;
        fileName: string;
        title: string;
        collectionType: 'tcg' | 'other';
        metadata: ShelfAny;
        body?: string;
    }) {
        const { folderPath, fileName, title, collectionType, metadata, body } = options;
        let template = collectionType === 'tcg'
            ? this.plugin.settings.tcgPokemonTemplate
            : this.plugin.settings.otherCollectionTemplate;

        const metaObj: Record<string, ShelfAny> = {
            ...(metadata as Record<string, ShelfAny>),
            title: title || '',
        };

        let content = template.replace(/"\{\{currentValue\}\}"/g, '{{currentValue}}');

        for (const [key, value] of Object.entries(metaObj)) {
            if (key === 'raw') continue;

            const bracketRegex = new RegExp(`\\[\\{\\{${key}\\}\\}\\]`, 'g');
            if (bracketRegex.test(content)) {
                if (Array.isArray(value)) {
                    content = content.replace(bracketRegex, JSON.stringify(value));
                } else if (value !== undefined && value !== null && String(value).trim() !== '') {
                    content = content.replace(bracketRegex, JSON.stringify([String(value)]));
                } else {
                    content = content.replace(bracketRegex, '[]');
                }
            }

            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            let replaceStr = value !== undefined && value !== null ? String(value) : '';
            if (Array.isArray(value)) {
                replaceStr = JSON.stringify(value);
            }
            content = content.replace(regex, replaceStr);
        }

        content = content.replace(/\[\{\{[\w]+\}\}\]/g, '[]');
        content = content.replace(/\{\{[\w]+\}\}/g, '');

        if (body) {
            content = `${content.trimEnd()}\n\n${body}`;
        }

        const safeFileName = fileName.replace(/:/g, ' -').replace(/[\\/"*?<>|]/g, '').trim();
        const finalPath = normalizePath(`${folderPath}/${safeFileName}.md`);

        const existingFile = this.plugin.app.vault.getAbstractFileByPath(finalPath);
        if (existingFile) {
            throw new Error(`File already exists: ${finalPath}`);
        }

        await this.ensureFolderExists(folderPath);
        const newFile = await this.plugin.app.vault.create(finalPath, content);
        return newFile;
    }
}



