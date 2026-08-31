import { ShelfAny } from '../types';
import * as React from 'react';
import { Notice } from 'obsidian';
import ShelfPlugin, { openFileRight } from '../main';
import { searchTMDB, getTMDBDetails } from '../api/tmdb';
import { searchGoogleBooks } from '../api/googleBooks';
import { searchIGDB, fetchIGDBToken } from '../api/igdb';
import { NoteGenerator } from '../services/NoteGenerator';

export const AddMediaModal = ({ plugin, onClose, defaultTab }: { plugin: ShelfPlugin, onClose: () => void, defaultTab?: 'Movies' | 'TV' | 'Games' | 'Books' }) => {
    const [query, setQuery] = React.useState('');
    const [type, setType] = React.useState<'Movies' | 'TV' | 'Games' | 'Books'>(defaultTab || 'Movies');
    const [results, setResults] = React.useState<ShelfAny[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query) return;
        setLoading(true);
        setError('');
        setResults([]);

        try {
            if (type === 'Movies' || type === 'TV') {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                const res = await searchTMDB(query, plugin.settings.tmdbApiKey);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                const filtered = res.filter((r: ShelfAny) => type === 'Movies' ? r.media_type === 'movie' : r.media_type === 'tv');
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call -- Dynamic API response
                setResults(filtered.map((r: ShelfAny) => ({
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                    title: r.title || r.name,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Dynamic API response
                    coverUrl: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : '',
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                    releaseDate: r.release_date || r.first_air_date || '',
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                    externalId: r.id.toString(),
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                    overview: r.overview || '',
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                    rating: r.vote_average || '',
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                    originalLanguage: r.original_language || '',
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Dynamic API response
                    raw: r
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Dynamic API response
                })));
            } else if (type === 'Books') {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                const res = await searchGoogleBooks(query, plugin.settings.googleBooksApiKey);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call -- Dynamic API response
                setResults(res.map((r: ShelfAny) => {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                    const info = r.volumeInfo;
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Dynamic API response
                    return {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                        title: info.title,
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                        coverUrl: info.imageLinks?.thumbnail ? info.imageLinks.thumbnail.replace('http:', 'https:') : '',
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                        releaseDate: info.publishedDate || '',
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                        externalId: r.id,
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                        authors: info.authors || [],
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                        genres: info.categories || [],
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                        publisher: info.publisher || '',
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                        pageCount: info.pageCount || '',
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                        description: info.description || '',
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Dynamic API response
                        raw: r
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Dynamic API response
                    };
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Dynamic API response
                }));
            } else if (type === 'Games') {
                try {
                    let res;
                    try {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                        res = await searchIGDB(query, plugin.settings.igdbClientId, plugin.settings.igdbAccessToken);
                    } catch (e: ShelfAny) {
                        if (e.message === "IGDB_401") {
                            if (!plugin.settings.igdbClientSecret) {
                                new Notice('IGDB Access Token expired. Please enter an IGDB Client Secret in settings to auto-renew.');
                                throw new Error('Token Expired');
                            }
                            new Notice('Refreshing IGDB Access Token...');
                            const newToken = await fetchIGDBToken(plugin.settings.igdbClientId, plugin.settings.igdbClientSecret);
                            plugin.settings.igdbAccessToken = newToken;
                            await plugin.saveSettings();
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                            res = await searchIGDB(query, plugin.settings.igdbClientId, plugin.settings.igdbAccessToken);
                        } else {
                            throw e;
                        }
                    }
                    
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call -- Dynamic API response
                    setResults(res.map((r: ShelfAny) => ({
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                        title: r.name,
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call -- Dynamic API response
                        coverUrl: r.cover?.url ? `https:${r.cover.url.replace('t_thumb', 't_cover_big')}` : '',
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Dynamic API response
                        releaseDate: r.first_release_date ? new Date(r.first_release_date * 1000).toISOString().split('T')[0] : '',
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                        externalId: r.id.toString(),
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                        summary: r.summary || '',
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Dynamic API response
                        rating: r.rating ? Math.round(r.rating) : '',
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- Dynamic API response
                        genres: r.genres ? r.genres.map((g: ShelfAny) => g.name) : [],
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- Dynamic API response
                        developer: r.involved_companies ? r.involved_companies.filter((c: ShelfAny) => c.developer).map((c: ShelfAny) => c.company?.name) : [],
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Dynamic API response
                        raw: r
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Dynamic API response
                    })));
                } catch (e: ShelfAny) {
                    setError('IGDB search failed: ' + (e.message || String(e)));
                }
            }
        } catch (err: ShelfAny) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Dynamic API response
            setError(err.message || 'An error occurred during search');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (result: ShelfAny) => {
        setLoading(true);
        setError('');
        try {
            let finalMetadata: ShelfAny = {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                coverUrl: result.coverUrl,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                releaseDate: result.releaseDate,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                externalId: result.externalId,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                overview: result.overview,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                rating: result.rating,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                originalLanguage: result.originalLanguage,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                authors: result.authors,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                pageCount: result.pageCount,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                description: result.description,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                summary: result.summary,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                genres: result.genres,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                studios: result.studios,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                publisher: result.publisher,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                raw: result.raw
            };

            if (type === 'Movies' || type === 'TV') {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                const details = await getTMDBDetails(result.externalId, type === 'Movies' ? 'movie' : 'tv', plugin.settings.tmdbApiKey);
                if (details) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                    finalMetadata.genres = details.genres?.map((g: ShelfAny) => g.name) || [];
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                    finalMetadata.studios = details.production_companies?.map((c: ShelfAny) => c.name) || [];
                    if (type === 'Movies') {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                        finalMetadata.directors = details.credits?.crew?.filter((c: ShelfAny) => c.job === 'Director').map((c: ShelfAny) => c.name) || [];
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Dynamic API response
                        if (details.status === 'Released') finalMetadata.releaseState = 'Released';
                        else finalMetadata.releaseState = 'Upcoming';
                    } else {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                        finalMetadata.directors = details.created_by?.map((c: ShelfAny) => c.name) || [];
                        
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Dynamic API response
                        if (details.status === 'Returning Series') finalMetadata.releaseState = 'Continuing';
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Dynamic API response
                        else if (details.status === 'Ended') finalMetadata.releaseState = 'Ended';
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Dynamic API response
                        else if (details.status === 'Canceled') finalMetadata.releaseState = 'Canceled';
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                        else finalMetadata.releaseState = details.status;
                        
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Dynamic API response
                        if (details.seasons) {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                            const parsedSeasons = details.seasons
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                                .filter((s: ShelfAny) => s.season_number >= 0 && s.episode_count > 0)
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                                .map((s: ShelfAny) => ({
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                                    season: s.season_number,
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                                    name: s.name || `Season ${s.season_number}`,
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                                    episodes: s.episode_count
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                                }));
                            
                            let nextEp = undefined;
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Dynamic API response
                            if (details.next_episode_to_air) {
                                nextEp = {
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                                    date: details.next_episode_to_air.air_date,
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                                    title: details.next_episode_to_air.name,
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                                    season: details.next_episode_to_air.season_number,
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                                    episode: details.next_episode_to_air.episode_number
                                };
                            }

                            if (!plugin.settings.tvTrackerData) plugin.settings.tvTrackerData = {};
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Dynamic API response
                            plugin.settings.tvTrackerData[result.externalId] = {
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                                seasons: parsedSeasons,
                                watched: [],
                                progress: 0,
                                nextEpisode: nextEp
                            };
                            await plugin.saveSettings();
                        }
                    }
                }
            } else if (type === 'Games') {
                if (result.releaseDate) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Dynamic API response
                    const releaseDate = new Date(result.releaseDate);
                    if (releaseDate > new Date()) finalMetadata.releaseState = 'Upcoming';
                    else finalMetadata.releaseState = 'Released';
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Dynamic API response
                } else if (result.raw?.status !== undefined) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Dynamic API response
                    if (result.raw.status === 0 || result.raw.status === 4) finalMetadata.releaseState = 'Released';
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Dynamic API response
                    else if (result.raw.status === 6) finalMetadata.releaseState = 'Canceled';
                    else finalMetadata.releaseState = 'Upcoming';
                } else {
                    finalMetadata.releaseState = 'Released';
                }
            } else if (type === 'Books') {
                if (result.releaseDate) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Dynamic API response
                    const releaseDate = new Date(result.releaseDate);
                    if (releaseDate > new Date()) finalMetadata.releaseState = 'Upcoming';
                    else finalMetadata.releaseState = 'Released';
                } else {
                    finalMetadata.releaseState = 'Released';
                }
            }

            const generator = new NoteGenerator(plugin);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Dynamic API response
            const newFile = await generator.generateNote(type, result.title, finalMetadata);
            // eslint-disable-next-line @typescript-eslint/no-floating-promises -- Dynamic API response
            // eslint-disable-next-line @typescript-eslint/no-floating-promises -- Dynamic API response
            openFileRight(plugin, newFile);
            onClose();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Dynamic API response
        } catch (e: ShelfAny) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Dynamic API response
            if (e.message && e.message.includes('already exists')) {
                setError('This item is already in your library!');
            } else {
                setError('Failed to add to library: ' + e.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="shelf-modal-overlay">
            <div className="shelf-modal">
                <div className="shelf-modal-header">
                    <h2>Add to Library</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="shelf-modal-body">
                    <form className="shelf-search-bar" onSubmit={(e) => { void handleSearch(e); }}>
                        <select value={type} onChange={e => {setType(e.target.value as ShelfAny); setResults([]);}} style={{ width: '100%' }}>
                            <option value="Movies">Movies</option>
                            <option value="TV">TV Shows</option>
                            <option value="Games">Games</option>
                            <option value="Books">Books</option>
                        </select>
                        <div className="shelf-search-row">
                            <input 
                                type="text" 
                                placeholder="Search title..." 
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
                        </div>
                    </form>

                    {error && <div className="shelf-error">{error}</div>}

                    <div className="shelf-gallery shelf-modal-results">
                        {results.map((result, idx) => (
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                            <div key={idx} className="shelf-card" onClick={() => { void handleAdd(result); }}>
                                {result.coverUrl ? (
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                                    <img src={result.coverUrl} className="shelf-card-image" alt={result.title} />
                                ) : (
                                    <div className="shelf-card-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Cover</div>
                                )}
                                <div className="shelf-card-content">
                                    <div className="shelf-card-title">{result.title}</div>
                                    {result.releaseDate && <div className="shelf-card-subtitle">{result.releaseDate}</div>}
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
                                    }}>Add to Library</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


