import { ShelfAny } from '../types';
import { TFile } from 'obsidian';
import * as React from 'react';
import ShelfPlugin from '../main';

// Basic definition for a Media Item parsed from Frontmatter
export interface MediaItem {
    id: string; // The file path
    file: TFile;
    title: string;
    type: 'Movies' | 'TV' | 'Games' | 'Books' | 'Comics & Manga' | 'Collections';
    status: 'Wishlist' | 'Active' | 'Completed' | 'TBD' | string;
    coverUrl?: string;
    releaseDate?: string;
    criticScore?: string;
    externalId?: string;
    collection?: boolean;
    rating?: number;
    releaseState?: string;
    // Collection / Binder item properties
    collectionFolder?: string;
    collectionName?: string;
    collectionType?: string;
    collectionCategory?: string;
    collectionSet?: string;
    cardNumber?: string;
    cardRarity?: string;
    currentValue?: number;
    lastValueUpdate?: string;
    variants?: Record<string, number>;
    variantValues?: Record<string, number>;
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
        // eslint-disable-next-line @typescript-eslint/no-floating-promises -- Dynamic API response
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

        const resolvedRef = app.metadataCache.on('resolved', () => {
            void loadInitialData();
        });

        const createRef = app.vault.on('create', (file) => {
            if (file instanceof TFile && file.extension === 'md') {
                const updatedItem = parseFileToMediaItem(plugin, file);
                if (updatedItem) {
                    setMediaItems(prev => {
                        const index = prev.findIndex(item => item.id === file.path);
                        if (index > -1) {
                            const next = [...prev];
                            next[index] = updatedItem;
                            return next;
                        }
                        return [...prev, updatedItem];
                    });
                }
            }
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
            app.metadataCache.offref(resolvedRef);
            app.vault.offref(createRef);
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
    const settings = plugin.settings;
    const lowerPath = file.path.toLowerCase();
    const movieFolder = String(settings.movieDestinationFolder || '').toLowerCase();
    const tvFolder = String(settings.tvDestinationFolder || '').toLowerCase();
    const gameFolder = String(settings.gameDestinationFolder || '').toLowerCase();
    const bookFolder = String(settings.bookDestinationFolder || '').toLowerCase();
    const comicMangaFolder = String(settings.comicMangaDestinationFolder || '').toLowerCase();
    const collectionsFolder = String(settings.collectionsDestinationFolder || '').toLowerCase();

    const cache = passedCache || plugin.app.metadataCache.getFileCache(file);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
    const fm: ShelfAny = cache?.frontmatter || {};

    const savedBinderFolders = settings.collectionsData
        ? Object.entries(settings.collectionsData).map(([k, v]) =>
            String(v?.folderPath || k).toLowerCase().replace(/^\/+|\/+$/g, '')
        )
        : [];
    const isInSavedBinder = savedBinderFolders.some(
        folder => folder && (lowerPath.startsWith(folder + '/') || lowerPath.includes('/' + folder + '/'))
    );
    const hasCollectionFrontmatter = Boolean(fm && (fm['collectionType'] || fm['collectionSet']));

    const isInMovie = Boolean(movieFolder && lowerPath.includes(movieFolder));
    const isInTv = Boolean(tvFolder && lowerPath.includes(tvFolder));
    const isInGame = Boolean(gameFolder && lowerPath.includes(gameFolder));
    const isInBook = Boolean(bookFolder && lowerPath.includes(bookFolder));
    const isInComicManga = Boolean(comicMangaFolder && lowerPath.includes(comicMangaFolder));
    const isInCollections = Boolean(
        settings.enableCollections && (
            (collectionsFolder && lowerPath.includes(collectionsFolder)) ||
            isInSavedBinder ||
            hasCollectionFrontmatter
        )
    );

    if (!isInMovie && !isInTv && !isInGame && !isInBook && !isInComicManga && !isInCollections) {
        return null; // Ignore files outside of configured folders
    }

    if (!isInCollections && (!cache || !cache.frontmatter)) return null;

    let typeStr = 'Unknown';
    // Let folder define the default type
    if (isInCollections) typeStr = 'Collections';
    else if (isInMovie) typeStr = 'Movies';
    else if (isInTv) typeStr = 'TV';
    else if (isInGame) typeStr = 'Games';
    else if (isInBook) typeStr = 'Books';
    else if (isInComicManga) typeStr = 'Comics & Manga';

    if (!isInCollections) {
        // Allow frontmatter to override if they share a folder (but must still be inside the folder)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
        const rawType = fm['mediaType'] || fm['type'] || fm['shelf_type'];
        if (rawType !== undefined && rawType !== null) {
            const strType = String(rawType).toLowerCase();
            if (strType.includes('movie')) typeStr = 'Movies';
            else if (strType.includes('tv') || strType.includes('show')) typeStr = 'TV';
            else if (strType.includes('game')) typeStr = 'Games';
            else if (strType.includes('book')) typeStr = 'Books';
            else if (strType.includes('comic') || strType.includes('manga')) typeStr = 'Comics & Manga';
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
    const status = fm['status'] || fm['shelf_status'];

    if (typeStr === 'Unknown' && !status) {
        return null; // Not a shelf item
    }

    const parseStr = (val: ShelfAny) => {
        if (val === undefined || val === null) return undefined;
        if (typeof val === 'object' && !Array.isArray(val)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Dynamic API response
            return (val as any).path || (val as any).link || JSON.stringify(val);
        }
        const s = String(val).trim();
        return s === '' ? undefined : s;
    };

    const t = (variable: string) => {
        let template = '';
        if (typeStr === 'Movies') template = plugin.settings.movieTemplate;
        else if (typeStr === 'TV') template = plugin.settings.tvTemplate;
        else if (typeStr === 'Games') template = plugin.settings.gameTemplate;
        else if (typeStr === 'Books') template = plugin.settings.bookTemplate;
        else if (typeStr === 'Comics & Manga') template = plugin.settings.comicMangaTemplate;
        else if (typeStr === 'Collections') template = `${plugin.settings.tcgPokemonTemplate}\n${plugin.settings.otherCollectionTemplate}`;

        const regex = new RegExp(`^\\s*([^:\\n]+):.*\\{\\{${variable}\\}\\}`, 'm');
        const match = template.match(regex);
        if (match) return match[1].trim();
        return variable;
    };

    const rawVal = fm[t('currentValue')] ?? fm['currentValue'] ?? fm['value'];
    let parsedValue: number | undefined = undefined;
    if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
        const num = parseFloat(String(rawVal).replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) parsedValue = num;
    }

    const parentFolder = file.parent?.path || '';
    const parentName = file.parent?.name || '';
    const parsedExternalId = parseStr(fm[t('externalId')] || fm['externalId'] || fm['external_id'] || fm['externalid']);

    let cardNumber = parseStr(fm[t('cardNumber')] || fm['cardNumber'] || fm['localId']);
    if (!cardNumber && isInCollections) {
        if (parsedExternalId && parsedExternalId.includes('-')) {
            const parts = parsedExternalId.split('-');
            cardNumber = parts[parts.length - 1];
        } else if (file.basename.includes(' - ')) {
            const parts = file.basename.split(' - ');
            cardNumber = parts[parts.length - 1].trim();
        }
    }

    let variants: Record<string, number> | undefined = undefined;
    let variantValues: Record<string, number> | undefined = undefined;
    if (isInCollections && fm && typeof fm === 'object') {
        const parsedVariants: Record<string, number> = {};
        const parsedVariantValues: Record<string, number> = {};
        for (const [k, v] of Object.entries(fm as Record<string, ShelfAny>)) {
            if (k.startsWith('variant') && !k.endsWith('Value') && k.length > 7 && v !== undefined && v !== null) {
                const count = typeof v === 'number' ? v : parseInt(String(v), 10);
                parsedVariants[k] = isNaN(count) ? 0 : Math.max(0, count);
            } else if (k.startsWith('variant') && k.endsWith('Value') && k.length > 12 && v !== undefined && v !== null && String(v).trim() !== '') {
                const val = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
                if (!isNaN(val)) {
                    parsedVariantValues[k] = Number(val.toFixed(2));
                }
            }
        }
        if (Object.keys(parsedVariants).length > 0) {
            variants = parsedVariants;
        }
        if (Object.keys(parsedVariantValues).length > 0) {
            variantValues = parsedVariantValues;
        }
    }

    return {
        id: file.path,
        file: file,
        title: parseStr(fm[t('title')] || fm['title']) || file.basename,
        type: typeStr as MediaItem['type'],
        status: parseStr(status) || 'TBD',
        coverUrl: parseStr(fm[t('coverUrl')] || fm['posterImage'] || fm['coverUrl'] || fm['cover_url'] || fm['image']),
        releaseDate: parseStr(fm[t('releaseDate')] || fm['releaseDate'] || fm['release_date'] || fm['releasedate']),
        criticScore: parseStr(fm['criticScore'] || fm['critic_score'] || fm['criticscore']),
        rating: typeof fm['rating'] === 'number' ? fm['rating'] : parseInt(fm['rating']) || undefined,
        externalId: parsedExternalId,
        collection: fm['collection'] === true || fm['collection'] === 'true',
        releaseState: parseStr(fm[t('releaseState')] || fm['releaseState'] || fm['release_state'] || fm['releasestate']),
        collectionFolder: isInCollections ? parentFolder : undefined,
        collectionName: isInCollections ? parentName : undefined,
        collectionType: parseStr(fm['collectionType']),
        collectionCategory: parseStr(fm['collectionCategory']),
        collectionSet: parseStr(fm[t('collectionSet')] || fm['collectionSet']),
        cardNumber,
        cardRarity: parseStr(fm[t('rarity')] || fm['cardRarity'] || fm['rarity']),
        currentValue: parsedValue,
        lastValueUpdate: parseStr(fm[t('lastValueUpdate')] || fm['lastValueUpdate']),
        variants,
        variantValues,
    };
}


