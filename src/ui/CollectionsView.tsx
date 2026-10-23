import { ShelfAny } from '../types';
import * as React from 'react';
import { TFolder, normalizePath, Notice } from 'obsidian';
import ShelfPlugin, { CollectionBinderConfig, openFileRight } from '../main';
import { MediaItem } from '../store/cache';
import {
    getPokemonSetDetails,
    getPokemonCardDetails,
    formatTcgdexLogoUrl,
    wildcardMatch,
    formatVariantLabel,
    VARIANT_KEY_ORDER,
    calculateFrontmatterVariantsValue
} from '../api/tcgdex';
import { AddToCollectionModal } from './AddToCollectionModal';

interface CollectionsViewProps {
    plugin: ShelfPlugin;
    items: MediaItem[];
    selectedBinderPath: string | null;
    onSelectBinder: (folderPath: string | null) => void;
    onRefreshSingleItem: (item: MediaItem) => Promise<boolean>;
    isRefreshing: boolean;
    setIsRefreshing: (val: boolean) => void;
    collectionsVersion: number;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
    plugin,
    items,
    selectedBinderPath,
    onSelectBinder,
    onRefreshSingleItem,
    isRefreshing,
    setIsRefreshing,
    collectionsVersion,
}) => {
    const [isAddToCollectionOpen, setIsAddToCollectionOpen] = React.useState(false);
    // Top-level Collections Overview filter & sort state
    const [binderSearchQuery, setBinderSearchQuery] = React.useState('');
    const [filterBinderType, setFilterBinderType] = React.useState<'All' | 'tcg' | 'other'>('All');
    const [filterBinderCategory, setFilterBinderCategory] = React.useState<string>('All');
    const [binderSortMode, setBinderSortMode] = React.useState<'Title' | 'Release Date'>('Title');
    const [binderSortAscending, setBinderSortAscending] = React.useState(true);
    // Opened Binder filter & sort state
    const [searchQuery, setSearchQuery] = React.useState('');
    const [filterCollection, setFilterCollection] = React.useState('All');
    const [filterRating, setFilterRating] = React.useState('All');
    const [filterReleaseState, setFilterReleaseState] = React.useState('All');
    const [sortMode, setSortMode] = React.useState<'Set Order' | 'Title' | 'Release Date' | 'Value'>('Set Order');
    const [sortAscending, setSortAscending] = React.useState(true);
    const [vaultTick, bumpVaultTick] = React.useReducer((x: number) => x + 1, 0);

    // Subscribe to vault folder create/delete/rename events so manual folder deletions or creations update immediately
    React.useEffect(() => {
        const { vault } = plugin.app;
        const createRef = vault.on('create', () => bumpVaultTick());
        const deleteRef = vault.on('delete', (file) => {
            if (file instanceof TFolder && plugin.settings.collectionsData) {
                const norm = normalizePath(file.path);
                if (plugin.settings.collectionsData[norm]) {
                    delete plugin.settings.collectionsData[norm];
                    void plugin.saveSettings();
                }
                if (selectedBinderPath && normalizePath(selectedBinderPath).toLowerCase() === norm.toLowerCase()) {
                    onSelectBinder(null);
                }
            }
            bumpVaultTick();
        });
        const renameRef = vault.on('rename', (file, oldPath) => {
            if (file instanceof TFolder && plugin.settings.collectionsData) {
                const oldNorm = normalizePath(oldPath);
                const newNorm = normalizePath(file.path);
                if (plugin.settings.collectionsData[oldNorm]) {
                    plugin.settings.collectionsData[newNorm] = {
                        ...plugin.settings.collectionsData[oldNorm],
                        name: file.name,
                        folderPath: newNorm,
                    };
                    delete plugin.settings.collectionsData[oldNorm];
                    void plugin.saveSettings();
                }
            }
            bumpVaultTick();
        });

        return () => {
            vault.offref(createRef);
            vault.offref(deleteRef);
            vault.offref(renameRef);
        };
    }, [plugin, selectedBinderPath, onSelectBinder]);

    const collectionItems = React.useMemo(
        () => items.filter(i => i.type === 'Collections'),
        [items]
    );

    // Build unified list of Binders strictly for folders that currently exist in the vault
    const binders = React.useMemo(() => {
        const map = new Map<string, CollectionBinderConfig>();
        const saved = plugin.settings.collectionsData || {};
        let staleRemoved = false;

        for (const [key, cfg] of Object.entries(saved)) {
            const norm = normalizePath(cfg.folderPath || key);
            const folderObj = plugin.app.vault.getAbstractFileByPath(norm);
            if (folderObj instanceof TFolder) {
                map.set(norm, { ...cfg, folderPath: norm });
            } else {
                // Folder was removed from vault; clean up stale entry
                delete saved[key];
                staleRemoved = true;
            }
        }

        if (staleRemoved) {
            void plugin.saveSettings();
        }

        // Discover subfolders inside collectionsDestinationFolder
        const parentPath = normalizePath(plugin.settings.collectionsDestinationFolder || 'Shelf/Collections');
        const parentFolder = plugin.app.vault.getAbstractFileByPath(parentPath);
        if (parentFolder && parentFolder instanceof TFolder) {
            for (const child of parentFolder.children) {
                if (child instanceof TFolder) {
                    const norm = normalizePath(child.path);
                    if (!map.has(norm)) {
                        map.set(norm, {
                            name: child.name,
                            folderPath: norm,
                            collectionType: 'other',
                        });
                    }
                }
            }
        }

        // Enrich from items inside each existing folder
        for (const item of collectionItems) {
            if (!item.collectionFolder) continue;
            const norm = normalizePath(item.collectionFolder);
            if (norm.toLowerCase() === parentPath.toLowerCase()) continue;

            const folderObj = plugin.app.vault.getAbstractFileByPath(norm);
            if (!(folderObj instanceof TFolder)) continue;

            const existing = map.get(norm) || {
                name: item.collectionName || norm.split('/').pop() || 'Collection',
                folderPath: norm,
                collectionType: (item.collectionType === 'tcg' ? 'tcg' : 'other') as 'tcg' | 'other',
            };

            if (item.collectionType === 'tcg') {
                existing.collectionType = 'tcg';
            }
            if (item.collectionCategory && !existing.collectionCategory) {
                existing.collectionCategory = item.collectionCategory;
            }
            if (item.collectionSet && !existing.collectionSet) {
                existing.collectionSet = item.collectionSet;
            }
            if (item.releaseDate && !existing.releaseDate && existing.collectionType === 'tcg') {
                existing.releaseDate = item.releaseDate;
            }
            map.set(norm, existing);
        }

        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [plugin, collectionItems, vaultTick, collectionsVersion]);

    // Backfill set logo, official card count, and releaseDate if a binder has collectionSet
    React.useEffect(() => {
        let cancelled = false;
        const enrichSets = async () => {
            let changed = false;
            for (const b of binders) {
                if (b.collectionType === 'tcg' && b.collectionSet && (!b.coverUrl || !b.totalCardsInSet || !b.releaseDate)) {
                    const setDetails = await getPokemonSetDetails(b.collectionSet);
                    if (setDetails && !cancelled) {
                        const logoUrl = formatTcgdexLogoUrl(setDetails.logo || setDetails.symbol, 'png');
                        const totalCards = setDetails.cardCount?.official || setDetails.cardCount?.total;
                        const setReleaseDate = setDetails.releaseDate || undefined;
                        if (!plugin.settings.collectionsData) plugin.settings.collectionsData = {};
                        plugin.settings.collectionsData[b.folderPath] = {
                            ...b,
                            coverUrl: logoUrl || b.coverUrl,
                            collectionSetName: setDetails.name || b.collectionSetName,
                            totalCardsInSet: totalCards || b.totalCardsInSet,
                            releaseDate: setReleaseDate || b.releaseDate,
                        };
                        changed = true;
                    }
                }
            }
            if (changed && !cancelled) {
                await plugin.saveSettings();
                bumpVaultTick();
            }
        };
        void enrichSets();
        return () => {
            cancelled = true;
        };
    }, [binders, plugin]);

    const activeBinder = React.useMemo(() => {
        if (!selectedBinderPath) return null;
        const norm = normalizePath(selectedBinderPath);
        return binders.find(b => normalizePath(b.folderPath).toLowerCase() === norm.toLowerCase()) || null;
    }, [selectedBinderPath, binders]);

    const backfilledCardIdsRef = React.useRef<Set<string>>(new Set());

    // Backfill applicable variant* and variant*Value properties for any existing TCG cards in the active binder that don't have them yet
    React.useEffect(() => {
        if (!activeBinder || activeBinder.collectionType !== 'tcg') return;
        let cancelled = false;
        const normActive = normalizePath(activeBinder.folderPath).toLowerCase();
        const cardsMissingVariants = collectionItems.filter(
            i =>
                normalizePath(i.collectionFolder || '').toLowerCase() === normActive &&
                i.externalId &&
                (
                    !i.variants ||
                    Object.keys(i.variants).length === 0 ||
                    !i.variantValues ||
                    Object.keys(i.variantValues).length === 0
                ) &&
                !backfilledCardIdsRef.current.has(i.id)
        );
        if (cardsMissingVariants.length === 0) return;

        const runBackfill = async () => {
            for (const item of cardsMissingVariants) {
                if (cancelled) break;
                backfilledCardIdsRef.current.add(item.id);
                try {
                    const details = await getPokemonCardDetails(item.externalId!);
                    if (details && details.variants && Object.keys(details.variants).length > 0 && !cancelled) {
                        await plugin.app.fileManager.processFrontMatter(item.file, (fm: ShelfAny) => {
                            for (const vKey of Object.keys(details.variants)) {
                                if (fm[vKey] === undefined || fm[vKey] === null || fm[vKey] === '') {
                                    fm[vKey] = 0;
                                }
                                const valProp = `${vKey}Value`;
                                if (fm[valProp] === undefined || fm[valProp] === null || fm[valProp] === '') {
                                    const unitVal = details.variantValues?.[valProp];
                                    fm[valProp] = typeof unitVal === 'number' ? Number(unitVal.toFixed(2)) : 0;
                                }
                            }
                            fm.currentValue = calculateFrontmatterVariantsValue(fm as Record<string, ShelfAny>);
                        });
                    }
                } catch (e) {
                    console.error(`Failed to backfill variants for ${item.title}:`, e);
                }
            }
        };
        void runBackfill();
        return () => {
            cancelled = true;
        };
    }, [activeBinder, collectionItems, plugin]);

    // Ensure currentValue property stays equal to the sum of owned variant values if edited manually in YAML
    React.useEffect(() => {
        if (!activeBinder || activeBinder.collectionType !== 'tcg') return;
        const normActive = normalizePath(activeBinder.folderPath).toLowerCase();
        const binderCards = collectionItems.filter(
            i =>
                normalizePath(i.collectionFolder || '').toLowerCase() === normActive &&
                i.variants &&
                Object.keys(i.variants).length > 0 &&
                i.variantValues &&
                Object.keys(i.variantValues).length > 0
        );
        for (const item of binderCards) {
            let expectedSum = 0;
            for (const [vKey, vCount] of Object.entries(item.variants!)) {
                const qty = typeof vCount === 'number' && !isNaN(vCount) ? Math.max(0, vCount) : 0;
                const unitVal = item.variantValues?.[`${vKey}Value`] ?? 0;
                if (qty > 0 && typeof unitVal === 'number' && !isNaN(unitVal)) {
                    expectedSum += qty * unitVal;
                }
            }
            const roundedExpected = Number(expectedSum.toFixed(2));
            const currentVal = item.currentValue !== undefined ? Number(item.currentValue.toFixed(2)) : NaN;
            if (currentVal !== roundedExpected) {
                void plugin.app.fileManager.processFrontMatter(item.file, (fm: ShelfAny) => {
                    fm.currentValue = calculateFrontmatterVariantsValue(fm as Record<string, ShelfAny>);
                });
            }
        }
    }, [activeBinder, collectionItems, plugin]);

    const handleRefreshBinder = async (binderItems: MediaItem[]) => {
        const refreshable = binderItems.filter(i => i.externalId);
        if (refreshable.length === 0) {
            new Notice('No cards with an externalId found in this collection to refresh.');
            return;
        }
        setIsRefreshing(true);
        new Notice(`Refreshing ${refreshable.length} cards...`);
        let refreshed = 0;
        let failed = 0;
        for (const item of refreshable) {
            try {
                const ok = await onRefreshSingleItem(item);
                if (ok) refreshed++;
                else failed++;
            } catch (e) {
                console.error(`Failed to refresh ${item.title}:`, e);
                failed++;
            }
        }
        setIsRefreshing(false);
        new Notice(`Collection refresh complete: ${refreshed} updated, ${failed} failed.`);
    };

    // ================= TOP-LEVEL COLLECTIONS BINDER OVERVIEW =================
    if (!activeBinder) {
        const availableCategories = Array.from(
            new Set([
                'pokemon',
                ...binders
                    .map(b => (b.collectionCategory || '').trim().toLowerCase())
                    .filter(Boolean)
            ])
        );

        let displayedBinders = [...binders];

        if (filterBinderType !== 'All') {
            displayedBinders = displayedBinders.filter(b => b.collectionType === filterBinderType);
        }

        if (filterBinderCategory !== 'All') {
            displayedBinders = displayedBinders.filter(
                b => (b.collectionCategory || '').toLowerCase() === filterBinderCategory.toLowerCase()
            );
        }

        if (binderSearchQuery.trim() !== '') {
            displayedBinders = displayedBinders.filter(b =>
                wildcardMatch(b.name, binderSearchQuery) ||
                wildcardMatch(b.collectionSetName || '', binderSearchQuery) ||
                wildcardMatch(b.collectionSet || '', binderSearchQuery)
            );
        }

        displayedBinders.sort((a, b) => {
            let res = 0;
            if (binderSortMode === 'Release Date') {
                const dateA = a.releaseDate || '0000-00-00';
                const dateB = b.releaseDate || '0000-00-00';
                if (dateA === dateB) {
                    res = a.name.localeCompare(b.name);
                } else {
                    res = dateA.localeCompare(dateB);
                }
            } else {
                res = a.name.localeCompare(b.name);
            }
            return binderSortAscending ? res : -res;
        });

        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="shelf-action-bar">
                    <div className="action-group" style={{ flexGrow: 1 }}>
                        <input
                            type="text"
                            className="shelf-search-input"
                            placeholder="Search collections..."
                            value={binderSearchQuery}
                            onChange={e => setBinderSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="action-group">
                        <select
                            value={filterBinderType}
                            onChange={e => {
                                const val = e.target.value as 'All' | 'tcg' | 'other';
                                setFilterBinderType(val);
                                if (val === 'other') setFilterBinderCategory('All');
                            }}
                            title="Filter by Collection Type"
                        >
                            <option value="All">All Types</option>
                            <option value="tcg">Trading Card Game (TCG)</option>
                            <option value="other">Other</option>
                        </select>
                        <select
                            value={filterBinderCategory}
                            onChange={e => setFilterBinderCategory(e.target.value)}
                            title="Filter by Category"
                        >
                            <option value="All">All Categories</option>
                            {availableCategories.map(cat => (
                                <option key={cat} value={cat}>
                                    {cat === 'pokemon' ? 'Pokémon' : cat}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="action-group">
                        <label>Sort By:</label>
                        <select
                            value={binderSortMode}
                            onChange={e => {
                                const nextMode = e.target.value as 'Title' | 'Release Date';
                                setBinderSortMode(nextMode);
                                if (nextMode === 'Release Date') setBinderSortAscending(false);
                                else setBinderSortAscending(true);
                            }}
                        >
                            <option value="Title">Title</option>
                            <option value="Release Date">Release Date</option>
                        </select>
                        <button
                            className="shelf-icon-button"
                            onClick={() => setBinderSortAscending(!binderSortAscending)}
                            title={binderSortAscending ? 'Ascending' : 'Descending'}
                        >
                            {binderSortAscending ? '↑' : '↓'}
                        </button>
                    </div>
                </div>

                <div className="shelf-gallery">
                    {displayedBinders.map(binder => {
                        const normFolder = normalizePath(binder.folderPath).toLowerCase();
                        const binderItems = collectionItems.filter(
                            i => normalizePath(i.collectionFolder || '').toLowerCase() === normFolder
                        );
                        const collectedItems = binderItems.filter(i => i.collection);
                        const collectedCount = collectedItems.length;
                        const totalTarget = (binder.collectionType === 'tcg' && binder.totalCardsInSet)
                            ? binder.totalCardsInSet
                            : binderItems.length;
                        const pct = totalTarget > 0 ? Math.min(100, Math.round((collectedCount / totalTarget) * 100)) : 0;

                        // Collection value is the sum of currentValue across the cards in the collection
                        const totalValue = binderItems.reduce((sum, i) => sum + (i.currentValue || 0), 0);
                        const fallbackCover = binderItems.find(i => i.coverUrl)?.coverUrl;
                        const displayCover = binder.coverUrl || fallbackCover;

                        return (
                            <div
                                key={binder.folderPath}
                                className="shelf-card"
                                onClick={() => onSelectBinder(binder.folderPath)}
                            >
                                <div className="shelf-card-image-wrapper" style={{ position: 'relative', width: '100%' }}>
                                    {displayCover ? (
                                        <img
                                            src={displayCover}
                                            className="shelf-card-image"
                                            alt={binder.name}
                                            style={binder.coverUrl ? { objectFit: 'contain', padding: '16px', boxSizing: 'border-box' } : undefined}
                                        />
                                    ) : (
                                        <div className="shelf-card-image" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                                            <span style={{ fontSize: '32px' }}>{binder.collectionType === 'tcg' ? '🃏' : '🗂️'}</span>
                                            <span style={{ fontSize: '12px' }}>{binder.collectionType === 'tcg' ? 'TCG Collection' : 'Collection'}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="shelf-card-content">
                                    <div className="shelf-card-title">{binder.name}</div>
                                    <div className="shelf-card-subtitle" style={{ marginBottom: binder.releaseDate ? '2px' : '8px' }}>
                                        {binder.collectionType === 'tcg'
                                            ? `TCG • ${binder.collectionCategory === 'pokemon' ? 'Pokémon' : (binder.collectionCategory || 'TCG')}${binder.collectionSetName ? ` • ${binder.collectionSetName}` : ''}`
                                            : 'Other Collection'}
                                    </div>
                                    {binder.releaseDate && (
                                        <div className="shelf-card-subtitle" style={{ marginBottom: '8px' }}>
                                            {binder.releaseDate}
                                        </div>
                                    )}

                                    <div style={{ marginTop: '4px', marginBottom: '8px' }} title={`${pct}% Collected (${collectedCount}/${totalTarget})`}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                            <span>{pct}% Collected</span>
                                            <span>{collectedCount} / {totalTarget}</span>
                                        </div>
                                        <div className="progress-bar-bg" style={{ width: '100%', height: '6px' }}>
                                            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>

                                    {binder.collectionType === 'tcg' && (
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--interactive-accent)', marginTop: 'auto' }}>
                                            Value: ${totalValue.toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {displayedBinders.length === 0 && (
                        <div style={{ color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                            {binders.length === 0
                                ? <>No collections yet. Click <strong>+ Add to Library</strong> at the top right to create your first Collection!</>
                                : 'No collections match your current filters.'}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ================= OPENED COLLECTION (BINDER DETAIL VIEW) =================
    const normActiveFolder = normalizePath(activeBinder.folderPath).toLowerCase();
    const isTcgBinder = activeBinder.collectionType === 'tcg';
    const binderItems = collectionItems.filter(
        i => normalizePath(i.collectionFolder || '').toLowerCase() === normActiveFolder
    );

    const collectedItems = binderItems.filter(i => i.collection);
    const collectedCount = collectedItems.length;
    const totalTarget = (isTcgBinder && activeBinder.totalCardsInSet)
        ? activeBinder.totalCardsInSet
        : binderItems.length;
    const pctCollected = totalTarget > 0 ? Math.min(100, Math.round((collectedCount / totalTarget) * 100)) : 0;
    const collectionValue = binderItems.reduce((sum, i) => sum + (i.currentValue || 0), 0);

    // Filter & Sort items inside the binder
    let processedItems = [...binderItems];

    if (filterCollection !== 'All') {
        const wantsInCollection = filterCollection === 'In Collection';
        processedItems = processedItems.filter(item => !!item.collection === wantsInCollection);
    }

    if (filterRating !== 'All') {
        if (filterRating === 'Unrated') {
            processedItems = processedItems.filter(item => !item.rating);
        } else {
            const num = parseInt(filterRating);
            processedItems = processedItems.filter(item => item.rating === num);
        }
    }

    if (filterReleaseState !== 'All') {
        if (filterReleaseState === 'Unknown') {
            processedItems = processedItems.filter(item => !item.releaseState);
        } else {
            processedItems = processedItems.filter(item => item.releaseState === filterReleaseState);
        }
    }

    if (searchQuery.trim() !== '') {
        processedItems = processedItems.filter(item =>
            wildcardMatch(item.title, searchQuery) ||
            wildcardMatch(item.cardNumber || '', searchQuery) ||
            wildcardMatch(item.externalId || '', searchQuery) ||
            wildcardMatch(item.cardRarity || '', searchQuery)
        );
    }

    const effectiveSortMode = (!isTcgBinder && sortMode === 'Set Order') ? 'Title' : sortMode;

    const compareCardNumbers = (numA?: string, numB?: string, titleA?: string, titleB?: string): number => {
        const a = (numA || '').trim();
        const b = (numB || '').trim();
        if (!a && !b) return (titleA || '').localeCompare(titleB || '');
        if (!a) return 1;
        if (!b) return -1;

        const leadNumA = a.match(/^\d+/);
        const leadNumB = b.match(/^\d+/);

        if (leadNumA && leadNumB) {
            const intA = parseInt(leadNumA[0], 10);
            const intB = parseInt(leadNumB[0], 10);
            if (intA !== intB) return intA - intB;
        } else if (leadNumA && !leadNumB) {
            return -1;
        } else if (!leadNumA && leadNumB) {
            return 1;
        }

        const cmp = a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        if (cmp !== 0) return cmp;
        return (titleA || '').localeCompare(titleB || '');
    };

    processedItems.sort((a, b) => {
        let result = 0;
        if (effectiveSortMode === 'Set Order') {
            result = compareCardNumbers(a.cardNumber, b.cardNumber, a.title, b.title);
        } else if (effectiveSortMode === 'Value') {
            const valA = a.currentValue ?? 0;
            const valB = b.currentValue ?? 0;
            if (valA === valB) {
                result = a.title.localeCompare(b.title);
            } else {
                result = valA - valB;
            }
        } else if (effectiveSortMode === 'Release Date') {
            const dateA = a.releaseDate || '0000-00-00';
            const dateB = b.releaseDate || '0000-00-00';
            if (dateA === dateB) {
                result = a.title.localeCompare(b.title);
            } else {
                result = dateA.localeCompare(dateB);
            }
        } else {
            result = a.title.localeCompare(b.title);
        }
        return sortAscending ? result : -result;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Binder Header & Stats Bar */}
            <div style={{
                padding: '16px 24px',
                backgroundColor: 'var(--background-secondary)',
                borderBottom: '1px solid var(--background-modifier-border)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={() => onSelectBinder(null)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: '1px solid var(--background-modifier-border)',
                            backgroundColor: 'var(--background-primary)',
                            color: 'var(--text-normal)',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        ← Back
                    </button>
                    {activeBinder.coverUrl && (
                        <img
                            src={activeBinder.coverUrl}
                            alt={activeBinder.name}
                            style={{ height: '36px', maxWidth: '120px', objectFit: 'contain' }}
                        />
                    )}
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25em' }}>{activeBinder.name}</h2>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {isTcgBinder
                                ? `Trading Card Game • Pokémon${activeBinder.collectionSetName ? ` • ${activeBinder.collectionSetName}` : ''}${activeBinder.releaseDate ? ` • ${activeBinder.releaseDate}` : ''}`
                                : 'Other Collection'}
                        </div>
                    </div>
                </div>

                {/* Stats Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                    <div style={{
                        padding: '6px 14px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--background-primary)',
                        border: '1px solid var(--background-modifier-border)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>% Collected</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-normal)' }}>
                            {pctCollected}% <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>({collectedCount}/{totalTarget})</span>
                        </div>
                    </div>

                    <div style={{
                        padding: '6px 14px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--background-primary)',
                        border: '1px solid var(--background-modifier-border)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Collection Value</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#22c55e' }}>
                            ${collectionValue.toFixed(2)}
                        </div>
                    </div>

                    <div style={{
                        padding: '6px 14px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--background-primary)',
                        border: '1px solid var(--background-modifier-border)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Cards</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-normal)' }}>
                            {binderItems.length}{activeBinder.totalCardsInSet ? ` / ${activeBinder.totalCardsInSet}` : ''}
                        </div>
                    </div>
                </div>

                {/* Binder Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {isTcgBinder && (
                        <button
                            className="shelf-fab"
                            style={{ backgroundColor: 'var(--interactive-normal)', color: 'var(--text-normal)' }}
                            onClick={() => { void handleRefreshBinder(binderItems); }}
                            disabled={isRefreshing}
                            title="Refresh Cards & Prices"
                        >
                            ↻ <span className="hide-on-mobile" style={{ marginLeft: '4px' }}>{isRefreshing ? 'Refreshing...' : 'Refresh Prices'}</span>
                        </button>
                    )}
                    <button
                        className="shelf-fab"
                        onClick={() => setIsAddToCollectionOpen(true)}
                        title="Add to Collection"
                    >
                        + <span className="hide-on-mobile" style={{ marginLeft: '4px' }}>Add to Collection</span>
                    </button>
                </div>
            </div>

            {/* Filter & Sort Bar (No Status Filter as requested) */}
            <div className="shelf-action-bar">
                <div className="action-group" style={{ flexGrow: 1 }}>
                    <input
                        type="text"
                        className="shelf-search-input"
                        placeholder="Search collection (wildcards * supported)..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="action-group">
                    <select value={filterCollection} onChange={e => setFilterCollection(e.target.value)} title="Filter by Collection">
                        <option value="All">All Items</option>
                        <option value="In Collection">In Collection</option>
                        <option value="Not In Collection">Not In Collection</option>
                    </select>
                    <select value={filterRating} onChange={e => setFilterRating(e.target.value)} title="Filter by Rating">
                        <option value="All">All Ratings</option>
                        <option value="5">❤️ Love (5)</option>
                        <option value="3">👍 Like (3)</option>
                        <option value="1">👎 Dislike (1)</option>
                        <option value="Unrated">Unrated</option>
                    </select>
                    <select value={filterReleaseState} onChange={e => setFilterReleaseState(e.target.value)} title="Filter by Release State">
                        <option value="All">All Releases</option>
                        <option value="Upcoming">Upcoming</option>
                        <option value="Released">Released</option>
                        <option value="Unknown">Unknown</option>
                    </select>
                </div>
                <div className="action-group">
                    <label>Sort By:</label>
                    <select
                        value={effectiveSortMode}
                        onChange={e => {
                            const nextMode = e.target.value as 'Set Order' | 'Title' | 'Release Date' | 'Value';
                            setSortMode(nextMode);
                            if (nextMode === 'Release Date' || nextMode === 'Value') setSortAscending(false);
                            else setSortAscending(true);
                        }}
                    >
                        {isTcgBinder && <option value="Set Order">Set Order</option>}
                        <option value="Title">Title</option>
                        <option value="Release Date">Release Date</option>
                        <option value="Value">Value</option>
                    </select>
                    <button
                        className="shelf-icon-button"
                        onClick={() => setSortAscending(!sortAscending)}
                        title={sortAscending ? 'Ascending' : 'Descending'}
                    >
                        {sortAscending ? '↑' : '↓'}
                    </button>
                </div>
            </div>

            {/* Cards Grid */}
            <div className={`shelf-gallery ${isTcgBinder ? 'shelf-tcg-gallery' : ''}`}>
                {processedItems.map(item => (
                    <div
                        key={item.id}
                        className="shelf-card"
                        onClick={() => { void openFileRight(plugin, item.file); }}
                    >
                        <div className="shelf-card-image-wrapper" style={{ position: 'relative', width: '100%' }}>
                            {item.coverUrl ? (
                                <img
                                    src={item.coverUrl}
                                    className={`shelf-card-image ${isTcgBinder ? 'shelf-tcg-card-image' : ''}`}
                                    alt={item.title}
                                />
                            ) : (
                                <div className={`shelf-card-image ${isTcgBinder ? 'shelf-tcg-card-image' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Cover</div>
                            )}
                            {item.releaseState && (
                                <div className={`shelf-card-release-banner state-${item.releaseState.toLowerCase().replace(' ', '-')}`}>
                                    {item.releaseState}
                                </div>
                            )}
                        </div>
                        <div
                            className={`shelf-collection-icon ${item.collection ? 'in-collection' : ''}`}
                            onClick={(e) => {
                                void (async () => {
                                    e.stopPropagation();
                                    const newVal = !item.collection;
                                    await plugin.app.fileManager.processFrontMatter(item.file, (fm: ShelfAny) => {
                                        fm.collection = newVal;
                                    });
                                })();
                            }}
                            title={item.collection ? 'In Collection (Collected)' : 'Mark as Collected'}
                        >
                            {item.collection ? (
                                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                            )}
                        </div>
                        <select
                            className={`shelf-rating-select rating-${item.rating || 'none'}`}
                            value={item.rating || ''}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                                void (async () => {
                                    const val = e.target.value;
                                    const ratingNum = val ? parseInt(val) : null;
                                    await plugin.app.fileManager.processFrontMatter(item.file, (fm: ShelfAny) => {
                                        if (ratingNum === null) {
                                            delete fm.rating;
                                        } else {
                                            fm.rating = ratingNum;
                                        }
                                    });
                                })();
                            }}
                            title="Rate"
                        >
                            <option value="">⚪</option>
                            <option value="5">❤️</option>
                            <option value="3">👍</option>
                            <option value="1">👎</option>
                        </select>

                        <div className="shelf-card-content">
                            <div className="shelf-card-title">
                                {item.title}
                                {isTcgBinder && item.cardNumber && (
                                    <span style={{ fontWeight: 500, color: 'var(--text-muted)', marginLeft: '6px', fontSize: '12px' }}>
                                        {activeBinder.totalCardsInSet ? `#${item.cardNumber}/${activeBinder.totalCardsInSet}` : `#${item.cardNumber}`}
                                    </span>
                                )}
                            </div>
                            {item.releaseDate && <div className="shelf-card-subtitle">{item.releaseDate}</div>}
                            {item.cardRarity && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                    {item.cardRarity}
                                </div>
                            )}

                            {isTcgBinder && item.variants && Object.keys(item.variants).length > 0 && (() => {
                                const variantEntries = Object.entries(item.variants).sort(([a], [b]) => {
                                    const idxA = VARIANT_KEY_ORDER.indexOf(a);
                                    const idxB = VARIANT_KEY_ORDER.indexOf(b);
                                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                                    if (idxA !== -1) return -1;
                                    if (idxB !== -1) return 1;
                                    return a.localeCompare(b);
                                });
                                return (
                                    <div
                                        onClick={e => e.stopPropagation()}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px',
                                            marginTop: '4px',
                                            marginBottom: '6px',
                                            paddingTop: '6px',
                                            borderTop: '1px solid var(--background-modifier-border)'
                                        }}
                                    >
                                        {variantEntries.map(([vKey, vCount]) => {
                                            const unitVal = item.variantValues?.[`${vKey}Value`];
                                            return (
                                                <div
                                                    key={vKey}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        fontSize: '11px',
                                                        color: 'var(--text-normal)',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, overflow: 'hidden' }}>
                                                        <span style={{ color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {formatVariantLabel(vKey)}
                                                        </span>
                                                        <span style={{ color: '#22c55e', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                            {unitVal !== undefined ? `$${unitVal.toFixed(2)}` : '—'}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const nextVal = Math.max(0, (vCount || 0) - 1);
                                                                void plugin.app.fileManager.processFrontMatter(item.file, (fm: ShelfAny) => {
                                                                    fm[vKey] = nextVal;
                                                                    fm.currentValue = calculateFrontmatterVariantsValue(fm as Record<string, ShelfAny>);
                                                                });
                                                            }}
                                                            disabled={!vCount || vCount <= 0}
                                                            style={{
                                                                width: '20px',
                                                                height: '20px',
                                                                padding: 0,
                                                                borderRadius: '4px',
                                                                border: '1px solid var(--background-modifier-border)',
                                                                backgroundColor: 'var(--background-primary)',
                                                                color: 'var(--text-normal)',
                                                                cursor: (!vCount || vCount <= 0) ? 'not-allowed' : 'pointer',
                                                                opacity: (!vCount || vCount <= 0) ? 0.4 : 1,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontWeight: 700,
                                                                lineHeight: 1
                                                            }}
                                                            title={`Decrease ${formatVariantLabel(vKey)} (${vKey})`}
                                                        >
                                                            −
                                                        </button>
                                                        <span style={{ minWidth: '16px', textAlign: 'center', fontWeight: 600 }}>
                                                            {vCount || 0}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const nextVal = (vCount || 0) + 1;
                                                                void plugin.app.fileManager.processFrontMatter(item.file, (fm: ShelfAny) => {
                                                                    fm[vKey] = nextVal;
                                                                    fm.currentValue = calculateFrontmatterVariantsValue(fm as Record<string, ShelfAny>);
                                                                });
                                                            }}
                                                            style={{
                                                                width: '20px',
                                                                height: '20px',
                                                                padding: 0,
                                                                borderRadius: '4px',
                                                                border: '1px solid var(--background-modifier-border)',
                                                                backgroundColor: 'var(--background-primary)',
                                                                color: 'var(--text-normal)',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontWeight: 700,
                                                                lineHeight: 1
                                                            }}
                                                            title={`Increase ${formatVariantLabel(vKey)} (${vKey})`}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}

                            {(!isTcgBinder || item.externalId) && (
                                <div style={{ display: 'flex', justifyContent: isTcgBinder ? 'flex-end' : 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '6px' }}>
                                    {!isTcgBinder && (
                                        <div
                                            style={{
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                color: item.currentValue !== undefined ? '#22c55e' : 'var(--text-muted)'
                                            }}
                                            title={item.lastValueUpdate ? `Last updated: ${item.lastValueUpdate}` : 'Value (USD)'}
                                        >
                                            {item.currentValue !== undefined ? `$${item.currentValue.toFixed(2)}` : '—'}
                                        </div>
                                    )}

                                    {item.externalId && (
                                        <button
                                            style={{
                                                padding: '0',
                                                height: '24px',
                                                width: '24px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '50%',
                                                border: 'none',
                                                backgroundColor: 'var(--interactive-normal)',
                                                cursor: 'pointer',
                                                color: 'var(--text-muted)'
                                            }}
                                            onClick={(e) => {
                                                void (async () => {
                                                    e.stopPropagation();
                                                    setIsRefreshing(true);
                                                    try {
                                                        const ok = await onRefreshSingleItem(item);
                                                        if (ok) new Notice(`Refreshed ${item.title}`);
                                                        else new Notice(`Failed to refresh ${item.title}`);
                                                    } catch {
                                                        new Notice(`Failed to refresh ${item.title}`);
                                                    } finally {
                                                        setIsRefreshing(false);
                                                    }
                                                })();
                                            }}
                                            title={item.lastValueUpdate ? `Refresh Card Metadata & Values (Last updated: ${item.lastValueUpdate})` : 'Refresh Card Metadata & Values'}
                                        >
                                            ↻
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {processedItems.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                        No items found in this collection. Click <strong>+ Add to Collection</strong> above to add items!
                    </div>
                )}
            </div>

            {isAddToCollectionOpen && (
                <AddToCollectionModal
                    plugin={plugin}
                    binder={activeBinder}
                    existingItems={binderItems}
                    onClose={() => setIsAddToCollectionOpen(false)}
                />
            )}
        </div>
    );
};
