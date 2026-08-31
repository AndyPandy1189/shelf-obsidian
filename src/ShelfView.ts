import { ItemView, WorkspaceLeaf } from 'obsidian';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import ShelfPlugin from './main';
import { App as ReactApp } from './ui/App';

export const VIEW_TYPE_SHELF = 'shelf-view';

export class ShelfView extends ItemView {
	plugin: ShelfPlugin;
	root: Root | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: ShelfPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE_SHELF;
	}

	getDisplayText() {
		return 'Shelf';
	}

	getIcon() {
		return 'library';
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('shelf-view-container');
		
		this.root = createRoot(container);
		this.root.render(React.createElement(ReactApp, { plugin: this.plugin }));
	}

	async onClose() {
		if (this.root) {
			this.root.unmount();
		}
	}
}


