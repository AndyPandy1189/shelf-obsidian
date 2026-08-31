/* eslint-disable @typescript-eslint/no-unsafe-assignment -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-unsafe-member-access -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-unsafe-return -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-unsafe-call -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-unsafe-argument -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-floating-promises -- Not fully strict */
/* eslint-disable @typescript-eslint/no-misused-promises -- React onClick handlers */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion -- Casting dynamic values */
/* eslint-disable @typescript-eslint/no-unused-vars -- Component props */
import { ShelfAny } from '../types';
import { App, normalizePath } from 'obsidian';
import ShelfPlugin from '../main';

export class NoteGenerator {
    plugin: ShelfPlugin;

    constructor(plugin: ShelfPlugin) {
        this.plugin = plugin;
    }

    async generateNote(type: 'Movies' | 'TV' | 'Games' | 'Books', title: string, metadata: ShelfAny) {
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
        }

        // Add title directly to metadata object
        metadata.title = title || '';
        
        let content = template;
        
        // Replace all available variables matching {{key}}
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
        
        // Clean up any remaining unmapped {{variables}}
        content = content.replace(/\{\{[\w]+\}\}/g, '');

        // Replace colons with dashes, then strip other invalid path characters
        const safeTitle = title.replace(/:/g, ' -').replace(/[\\/"*?<>|]/g, '');
        const finalPath = normalizePath(`${destination}/${safeTitle}.md`);
        
        const existingFile = this.plugin.app.vault.getAbstractFileByPath(finalPath);
        if (existingFile) {
            throw new Error(`File already exists: ${finalPath}`);
        }

        // Ensure folder exists
        const folder = this.plugin.app.vault.getAbstractFileByPath(normalizePath(destination));
        if (!folder) {
            await this.plugin.app.vault.createFolder(normalizePath(destination));
        }

        const newFile = await this.plugin.app.vault.create(finalPath, content);
        return newFile;
    }
}


/* eslint-enable @typescript-eslint/no-unsafe-assignment -- End of file */
/* eslint-enable @typescript-eslint/no-unsafe-member-access -- End of file */
/* eslint-enable @typescript-eslint/no-unsafe-return -- End of file */
/* eslint-enable @typescript-eslint/no-unsafe-call -- End of file */
/* eslint-enable @typescript-eslint/no-unsafe-argument -- End of file */
/* eslint-enable @typescript-eslint/no-floating-promises -- End of file */
/* eslint-enable @typescript-eslint/no-misused-promises -- End of file */
/* eslint-enable @typescript-eslint/no-unnecessary-type-assertion -- End of file */
/* eslint-enable @typescript-eslint/no-unused-vars -- End of file */
