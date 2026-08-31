import { ShelfAny } from '../types';
import { App, TFile } from 'obsidian';

export async function updateFrontmatter(app: App, file: TFile, key: string, value: ShelfAny) {
    await app.fileManager.processFrontMatter(file, (frontmatter) => {
        frontmatter[key] = value;
    });
}


