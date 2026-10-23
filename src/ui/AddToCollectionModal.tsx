import { ShelfAny } from '../types';
import * as React from 'react';
import { Notice, TFile, normalizePath } from 'obsidian';
import ShelfPlugin, { CollectionBinderConfig, openFileRight } from '../main';
import { searchPokemonCards, getPokemonCardDetails, wildcardMatch } from '../api/tcgdex';
import { NoteGenerator } from '../services/NoteGenerator';

interface AddToCollectionModalProps {
    plugin: ShelfPlugin;
    binder: CollectionBinderConfig;
    onClose: () => void;
}

export const AddToCollectionModal: React.FC<AddToCollectionModalProps> = ({ plugin, binder, onClose }) => {
    const isTcg = binder.collectionType === 'tcg';
    const [mode, setMode] = React.useState<'new' | 'existing'>('new');
    const [query, setQuery] = React.useState('');
    const [newItemTitle, setNewItemTitle] = React.useState('');
    const [apiResults, setApiResults] = React.useState<ShelfAny[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    // Auto-load cards if TCG collection has a preconfigured collectionSet
    React.useEffect(() => {
        if (isTcg && mode === 'new' && binder.collectionSet) {
            setLoading(true);
            searchPokemonCards('*', binder.collectionSet)
                .then(res => setApiResults(res))
                .catch(err => setError('Failed to load set cards: ' + String(err)))
                .finally(() => setLoading(false));
        }
    }, [isTcg, mode, binder.collectionSet]);

    const handleSearchTcg = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() && !binder.collectionSet) return;
        setLoading(true);
        setError('');
        try {
            const res = await searchPokemonCards(query || '*', binder.collectionSet);
            setApiResults(res);
        } catch (err: ShelfAny) {
            setError('Failed to search TCGdex: ' + ((err as any)?.message || String(err)));
        } finally {
            setLoading(false);
        }
    };

    const handleAddTcgCard = async (cardSummary: ShelfAny) => {
        setLoading(true);
        setError('');
        try {
            const details = await getPokemonCardDetails(cardSummary.id);
            if (!details) {
                throw new Error('Could not fetch card details from TCGdex.');
            }

            const { card, releaseDate, releaseState, coverUrl, currentValue, markdownBody } = details;
            const todayStr = new Date().toISOString().split('T')[0];

            const metadata: Record<string, ShelfAny> = {
                title: card.name || cardSummary.name,
                releaseDate: releaseDate || '',
                releaseState,
                coverUrl: coverUrl || cardSummary.image || '',
                externalId: card.id,
                rarity: card.rarity || '',
                collectionSet: card.set?.id || binder.collectionSet || '',
                currentValue: currentValue !== null ? currentValue.toFixed(2) : '',
                lastValueUpdate: currentValue !== null ? todayStr : '',
                illustrator: card.illustrator || '',
            };

            const suffix = card.localId ? `${card.localId}` : `${card.id}`;
            const fileName = `${card.name || 'Card'} - ${suffix}`;

            const generator = new NoteGenerator(plugin);
            const newFile = await generator.generateCollectionItemNote({
                folderPath: binder.folderPath,
                fileName,
                title: card.name || cardSummary.name,
                collectionType: 'tcg',
                metadata,
                body: markdownBody,
            });

            new Notice(`Added "${card.name}" to ${binder.name}`);
            void openFileRight(plugin, newFile);
            onClose();
        } catch (err: ShelfAny) {
            const msg = (err as any)?.message || String(err);
            if (msg.includes('already exists')) {
                setError('This card is already in this collection!');
            } else {
                setError('Failed to add card: ' + msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOtherItem = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newItemTitle.trim();
        if (!trimmed) {
            setError('Please enter a title for the new item.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const generator = new NoteGenerator(plugin);
            const newFile = await generator.generateCollectionItemNote({
                folderPath: binder.folderPath,
                fileName: trimmed,
                title: trimmed,
                collectionType: 'other',
                metadata: {
                    title: trimmed,
                },
            });
            new Notice(`Created "${trimmed}" in ${binder.name}`);
            void openFileRight(plugin, newFile);
            onClose();
        } catch (err: ShelfAny) {
            const msg = (err as any)?.message || String(err);
            if (msg.includes('already exists')) {
                setError('An item with this name already exists in this collection.');
            } else {
                setError('Failed to create item: ' + msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleMoveExistingFile = async (file: TFile) => {
        setLoading(true);
        setError('');
        try {
            const generator = new NoteGenerator(plugin);
            await generator.ensureFolderExists(binder.folderPath);

            const targetPath = normalizePath(`${binder.folderPath}/${file.name}`);
            if (file.path === targetPath) {
                setError('File is already in this collection.');
                setLoading(false);
                return;
            }

            const existingTarget = plugin.app.vault.getAbstractFileByPath(targetPath);
            if (existingTarget) {
                setError(`A file named "${file.name}" already exists in ${binder.name}.`);
                setLoading(false);
                return;
            }

            await plugin.app.fileManager.renameFile(file, targetPath);
            await plugin.app.fileManager.processFrontMatter(file, (fm: ShelfAny) => {
                if (!fm.collectionType) {
                    fm.collectionType = binder.collectionType;
                }
                if (isTcg && binder.collectionCategory && !fm.collectionCategory) {
                    fm.collectionCategory = binder.collectionCategory;
                }
                if (isTcg && binder.collectionSet && !fm.collectionSet) {
                    fm.collectionSet = binder.collectionSet;
                }
                if (fm.collection === undefined) {
                    fm.collection = false;
                }
            });

            new Notice(`Moved "${file.basename}" to ${binder.name}`);
            onClose();
        } catch (err: ShelfAny) {
            setError('Failed to move file: ' + ((err as any)?.message || String(err)));
        } finally {
            setLoading(false);
        }
    };

    // Vault file search with wildcard support for "Add an existing card/item"
    const vaultFiles = React.useMemo(() => {
        if (mode !== 'existing') return [];
        const allFiles = plugin.app.vault.getMarkdownFiles();
        const normalizedBinderFolder = normalizePath(binder.folderPath).toLowerCase();
        return allFiles
            .filter(f => f.parent?.path.toLowerCase() !== normalizedBinderFolder)
            .filter(f => {
                if (!query.trim()) return true;
                return wildcardMatch(f.basename, query) || wildcardMatch(f.path, query);
            })
            .slice(0, 100);
    }, [mode, query, binder.folderPath, plugin.app.vault]);

    return (
        <div className="shelf-modal-overlay">
            <div className="shelf-modal">
                <div className="shelf-modal-header">
                    <h2>Add to {binder.name}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="shelf-modal-body">
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <button
                            type="button"
                            onClick={() => { setMode('new'); setError(''); setQuery(''); }}
                            style={{
                                flex: 1,
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: '1px solid var(--background-modifier-border)',
                                backgroundColor: mode === 'new' ? 'var(--interactive-accent)' : 'var(--background-secondary)',
                                color: mode === 'new' ? 'var(--text-on-accent)' : 'var(--text-normal)',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            {isTcg ? 'Add a new card' : 'Add a new item'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('existing'); setError(''); setQuery(''); }}
                            style={{
                                flex: 1,
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: '1px solid var(--background-modifier-border)',
                                backgroundColor: mode === 'existing' ? 'var(--interactive-accent)' : 'var(--background-secondary)',
                                color: mode === 'existing' ? 'var(--text-on-accent)' : 'var(--text-normal)',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            {isTcg ? 'Add an existing card' : 'Add an existing item'}
                        </button>
                    </div>

                    {mode === 'new' && isTcg && (
                        <>
                            <form className="shelf-search-bar" onSubmit={(e) => { void handleSearchTcg(e); }}>
                                <div className="shelf-search-row">
                                    <input
                                        type="text"
                                        placeholder={binder.collectionSet ? `Search cards in ${binder.collectionSetName || binder.collectionSet} (supports * wildcard)...` : 'Search Pokémon cards (supports * wildcard)...'}
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                        autoFocus
                                    />
                                    <button type="submit" disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
                                </div>
                            </form>

                            {error && <div className="shelf-error">{error}</div>}

                            <div className="shelf-gallery shelf-modal-results">
                                {apiResults.map((card, idx) => (
                                    <div key={card.id || idx} className="shelf-card" onClick={() => { void handleAddTcgCard(card); }}>
                                        {card.image ? (
                                            <img src={card.image} className="shelf-card-image" alt={card.name} />
                                        ) : (
                                            <div className="shelf-card-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Image</div>
                                        )}
                                        <div className="shelf-card-content">
                                            <div className="shelf-card-title">
                                                {card.name} {card.localId ? `#${card.localId}` : ''}
                                            </div>
                                            <div className="shelf-card-subtitle">{card.id}</div>
                                            <div style={{
                                                fontSize: '12px',
                                                padding: '6px 16px',
                                                borderRadius: '100px',
                                                fontWeight: 600,
                                                backgroundColor: 'var(--interactive-accent)',
                                                color: 'var(--text-on-accent)',
                                                textAlign: 'center',
                                                marginTop: 'auto',
                                                alignSelf: 'flex-start'
                                            }}>Add Card</div>
                                        </div>
                                    </div>
                                ))}
                                {!loading && apiResults.length === 0 && (
                                    <div style={{ color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                                        {binder.collectionSet ? 'No matching cards found in this set.' : 'Search for a Pokémon card above to add it to this collection.'}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {mode === 'new' && !isTcg && (
                        <form onSubmit={(e) => { void handleCreateOtherItem(e); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Item Title</label>
                                <input
                                    type="text"
                                    placeholder="Enter title for the new collection item..."
                                    value={newItemTitle}
                                    onChange={e => setNewItemTitle(e.target.value)}
                                    style={{ width: '100%', height: '38px', padding: '0 14px', borderRadius: '8px', border: '1px solid var(--background-modifier-border)', backgroundColor: 'var(--background-primary)', color: 'var(--text-normal)' }}
                                    autoFocus
                                />
                            </div>
                            {error && <div className="shelf-error">{error}</div>}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{ padding: '8px 20px', borderRadius: '20px', border: 'none', backgroundColor: 'var(--interactive-accent)', color: 'var(--text-on-accent)', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    {loading ? 'Creating...' : 'Create Item'}
                                </button>
                            </div>
                        </form>
                    )}

                    {mode === 'existing' && (
                        <>
                            <div className="shelf-search-bar">
                                <div className="shelf-search-row">
                                    <input
                                        type="text"
                                        placeholder="Search vault files (wildcards like *pikachu* supported)..."
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {error && <div className="shelf-error">{error}</div>}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                                {vaultFiles.map(file => (
                                    <div
                                        key={file.path}
                                        onClick={() => { void handleMoveExistingFile(file); }}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            backgroundColor: 'var(--background-secondary)',
                                            cursor: 'pointer',
                                            border: '1px solid var(--background-modifier-border)'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-normal)' }}>{file.basename}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{file.path}</div>
                                        </div>
                                        <span style={{
                                            fontSize: '12px',
                                            padding: '4px 12px',
                                            borderRadius: '100px',
                                            fontWeight: 600,
                                            backgroundColor: 'var(--interactive-accent)',
                                            color: 'var(--text-on-accent)'
                                        }}>
                                            Move to Collection
                                        </span>
                                    </div>
                                ))}
                                {vaultFiles.length === 0 && (
                                    <div style={{ color: 'var(--text-muted)', padding: '12px' }}>No matching files found in vault.</div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
