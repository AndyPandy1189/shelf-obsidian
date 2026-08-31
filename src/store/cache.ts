import { ShelfAny } from '../types';
import { App, TFile } from 'obsidian';
import * as React from 'react';
import ShelfPlugin from '../main';

// Basic definition for a Media Item parsed from Frontmatter
export interface MediaItem {
    id: string; // The file path
    file: TFile;
    title: string;
    type: 'Movies' | 'TV' | 'Games' | 'Books' | 'Unknown';
    status: 'Wishlist' | 'Active' | 'Completed' | 'TBD';
    coverUrl?: string;
    releaseDate?: string;
    criticScore?: string;
    externalId?: string;
    collection?: boolean;
    rating?: number;
    releaseState?: string;
}

// React Hook to subscribe to Obsidian metadata changes
export function useMediaLibrary(plugin: ShelfPlugin) {
    const [mediaItems, setMediaItems] = React.useState<MediaItem[]>([]);
    const { app } = plugin;

    React.useEffect(() => {
        // Initial load
        const loadInitialData = async () => {
            const files = app.vault.getMarkdownFiles();
            const items = files.map(file => parseFileToMediaItem(plugin, file)).filter(Boolean) as MediaItem[];
            setMediaItems(items);
        };
        loadInitialData();

        // Listen for changes
        const eventRef = app.metadataCache.on('changed', (file, data, cache) => {
            const updatedItem = parseFileToMediaItem(plugin, file, cache);
            setMediaItems(prev => {
                const index = prev.findIndex(item => item.id === file.path);
                if (updatedItem) {
                    if (index > -1) {
                        const newArray = [...prev];
                        newArray[index] = updatedItem;
                        return newArray;
                    } else {
                        return [...prev, updatedItem];
                    }
                } else {
                    if (index > -1) {
                        return prev.filter(item => item.id !== file.path);
                    }
                    return prev;
                }
            });
        });

        const deleteRef = app.vault.on('delete', (file) => {
            if (file instanceof TFile) {
                setMediaItems(prev => prev.filter(item => item.id !== file.path));
            }
        });

        const renameRef = app.vault.on('rename', (file, oldPath) => {
            if (file instanceof TFile) {
                const updatedItem = parseFileToMediaItem(plugin, file);
                setMediaItems(prev => {
                    const newArray = prev.filter(item => item.id !== oldPath);
                    if (updatedItem) newArray.push(updatedItem);
                    return newArray;
                });
            }
        });

        return () => {
            app.metadataCache.offref(eventRef);
            app.vault.offref(deleteRef);
            app.vault.offref(renameRef);
        };
    }, [plugin, app]);

    const sortedItems = React.useMemo(() => {
        return [...mediaItems].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }, [mediaItems]);

    return sortedItems;
}

function parseFileToMediaItem(plugin: ShelfPlugin, file: TFile, passedCache?: ShelfAny): MediaItem | null {
    const cache = passedCache || plugin.app.metadataCache.getFileCache(file);
    if (!cache || !cache.frontmatter) return null;

    const fm = cache.frontmatter;
    const settings = plugin.settings;
    // We strictly enforce that a file MUST be in one of the mapped folders
    const lowerPath = file.path.toLowerCase();
    const movieFolder = String(settings.movieDestinationFolder).toLowerCase();
    const tvFolder = String(settings.tvDestinationFolder).toLowerCase();
    const gameFolder = String(settings.gameDestinationFolder).toLowerCase();
    const bookFolder = String(settings.bookDestinationFolder).toLowerCase();

    const isInMovie = movieFolder && lowerPath.includes(movieFolder);
    const isInTv = tvFolder && lowerPath.includes(tvFolder);
    const isInGame = gameFolder && lowerPath.includes(gameFolder);
    const isInBook = bookFolder && lowerPath.includes(bookFolder);

    if (!isInMovie && !isInTv && !isInGame && !isInBook) {
        return null; // Ignore files outside of configured folders
    }

    let typeStr = 'Unknown';
    // Let folder define the default type
    if (isInMovie) typeStr = 'Movies';
    else if (isInTv) typeStr = 'TV';
    else if (isInGame) typeStr = 'Games';
    else if (isInBook) typeStr = 'Books';

    // Allow frontmatter to override if they share a folder (but must still be inside the folder)
    const rawType = fm['mediaType'] || fm['type'] || fm['shelf_type'];
    if (rawType !== undefined && rawType !== null) {
        const strType = String(rawType).toLowerCase();
        if (strType.includes('movie')) typeStr = 'Movies';
        else if (strType.includes('tv') || strType.includes('show')) typeStr = 'TV';
        else if (strType.includes('game')) typeStr = 'Games';
        else if (strType.includes('book')) typeStr = 'Books';
    }
    
    const status = fm['status'] || fm['shelf_status'];
    
    if (typeStr === 'Unknown' && !status) {
        return null; // Not a shelf item
    }

    const parseStr = (val: ShelfAny) => {
        if (val === undefined || val === null) return undefined;
        if (typeof val === 'object' && !Array.isArray(val)) {
            // Probably an Obsidian link object e.g. [[Link]] -> { path: 'Link' }
            return val.path || val.link || JSON.stringify(val);
        }
        return String(val);
    };

    const t = (variable: string) => {
        let template = '';
        if (typeStr === 'Movies') template = plugin.settings.movieTemplate;
        else if (typeStr === 'TV') template = plugin.settings.tvTemplate;
        else if (typeStr === 'Games') template = plugin.settings.gameTemplate;
        else if (typeStr === 'Books') template = plugin.settings.bookTemplate;
        
        const regex = new RegExp(`^\\s*([^:\\n]+):.*\\{\\{${variable}\\}\\}`, 'm');
        const match = template.match(regex);
        if (match) return match[1].trim();
        return variable;
    };

    return {
        id: file.path,
        file: file,
        title: parseStr(fm[t('title')] || fm['title']) || file.basename,
        type: typeStr as ShelfAny,
        status: parseStr(status) || 'TBD',
        coverUrl: parseStr(fm[t('coverUrl')] || fm['posterImage'] || fm['coverUrl'] || fm['cover_url'] || fm['image']),
        releaseDate: parseStr(fm[t('releaseDate')] || fm['releaseDate'] || fm['release_date'] || fm['releasedate']),
        criticScore: parseStr(fm['criticScore'] || fm['critic_score'] || fm['criticscore']),
        rating: typeof fm['rating'] === 'number' ? fm['rating'] : parseInt(fm['rating']) || undefined,
        externalId: parseStr(fm[t('externalId')] || fm['externalId'] || fm['external_id'] || fm['externalid']),
        collection: fm['collection'] === true || fm['collection'] === 'true',
        releaseState: parseStr(fm[t('releaseState')] || fm['releaseState'] || fm['release_state'] || fm['releasestate']),
    };
}


