import { ShelfAny } from '../types';
import { App, TFile } from 'obsidian';

export async function updateFrontmatter(app: App, file: TFile, key: string, value: ShelfAny) {
    await app.fileManager.processFrontMatter(file, (frontmatter) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Dynamic API response
        frontmatter[key] = value;
    });
}


