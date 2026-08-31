import { App, TFile } from 'obsidian';

export async function updateFrontmatter(app: App, file: TFile, key: string, value: any) {
    await app.fileManager.processFrontMatter(file, (frontmatter) => {
        frontmatter[key] = value;
    });
}
