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
import { App, TFile } from 'obsidian';

export async function updateFrontmatter(app: App, file: TFile, key: string, value: ShelfAny) {
    await app.fileManager.processFrontMatter(file, (frontmatter) => {
        frontmatter[key] = value;
    });
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
