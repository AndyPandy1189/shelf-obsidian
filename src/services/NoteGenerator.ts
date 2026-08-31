/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-misused-promises, obsidianmd/prefer-create-el */
import { App, normalizePath } from 'obsidian';
import ShelfPlugin from '../main';

export class NoteGenerator {
    plugin: ShelfPlugin;

    constructor(plugin: ShelfPlugin) {
        this.plugin = plugin;
    }

    async generateNote(type: 'Movies' | 'TV' | 'Games' | 'Books', title: string, metadata: any) {
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
