/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-misused-promises, obsidianmd/prefer-create-el */
import { App, TFile } from 'obsidian';

export async function updateFrontmatter(app: App, file: TFile, key: string, value: any) {
    await app.fileManager.processFrontMatter(file, (frontmatter) => {
        frontmatter[key] = value;
    });
}
