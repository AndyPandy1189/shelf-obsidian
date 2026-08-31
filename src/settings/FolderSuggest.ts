/* eslint-disable @typescript-eslint/no-unsafe-assignment -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-unsafe-member-access -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-unsafe-return -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-unsafe-call -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-unsafe-argument -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-floating-promises -- Not fully strict */
/* eslint-disable @typescript-eslint/no-misused-promises -- React onClick handlers */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion -- Casting dynamic values */
/* eslint-disable @typescript-eslint/no-unused-vars -- Component props */
import { App, AbstractInputSuggest, TFolder, TAbstractFile } from 'obsidian';

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
    textInputEl: HTMLInputElement;

    constructor(app: App, textInputEl: HTMLInputElement) {
        super(app, textInputEl);
        this.textInputEl = textInputEl;
    }

    getSuggestions(inputStr: string): TFolder[] {
        const abstractFiles = this.app.vault.getAllLoadedFiles();
        const folders: TFolder[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        abstractFiles.forEach((folder: TAbstractFile) => {
            if (folder instanceof TFolder && folder.path.toLowerCase().contains(lowerCaseInputStr)) {
                folders.push(folder);
            }
        });

        return folders;
    }

    renderSuggestion(file: TFolder, el: HTMLElement): void {
        el.setText(file.path);
    }

    selectSuggestion(file: TFolder): void {
        this.textInputEl.value = file.path;
        this.textInputEl.trigger('input');
        this.close();
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
