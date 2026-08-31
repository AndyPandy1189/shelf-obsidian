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
                const res = await searchTMDB(query, plugin.settings.tmdbApiKey);
                const filtered = res.filter((r: ShelfAny) => type === 'Movies' ? r.media_type === 'movie' : r.media_type === 'tv');
                setResults(filtered.map((r: ShelfAny) => ({
                    title: r.title || r.name,
                    coverUrl: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : '',
                    releaseDate: r.release_date || r.first_air_date || '',
                    externalId: r.id.toString(),
                    overview: r.overview || '',
                    rating: r.vote_average || '',
                    originalLanguage: r.original_language || '',
                    raw: r
                })));
            } else if (type === 'Books') {
                const res = await searchGoogleBooks(query, plugin.settings.googleBooksApiKey);
                setResults(res.map((r: ShelfAny) => {
                    const info = r.volumeInfo;
                    return {
                        title: info.title,
                        coverUrl: info.imageLinks?.thumbnail ? info.imageLinks.thumbnail.replace('http:', 'https:') : '',
                        releaseDate: info.publishedDate || '',
                        externalId: r.id,
                        authors: info.authors || [],
                        genres: info.categories || [],
                        publisher: info.publisher || '',
                        pageCount: info.pageCount || '',
                        description: info.description || '',
                        raw: r
                    };
                }));
            } else if (type === 'Games') {
                try {
                    let res;
                    try {
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
                            res = await searchIGDB(query, plugin.settings.igdbClientId, plugin.settings.igdbAccessToken);
                        } else {
                            throw e;
                        }
                    }
                    
                    setResults(res.map((r: ShelfAny) => ({
                        title: r.name,
                        coverUrl: r.cover?.url ? `https:${r.cover.url.replace('t_thumb', 't_cover_big')}` : '',
                        releaseDate: r.first_release_date ? new Date(r.first_release_date * 1000).toISOString().split('T')[0] : '',
                        externalId: r.id.toString(),
                        summary: r.summary || '',
                        rating: r.rating ? Math.round(r.rating) : '',
                        genres: r.genres ? r.genres.map((g: ShelfAny) => g.name) : [],
                        developer: r.involved_companies ? r.involved_companies.filter((c: ShelfAny) => c.developer).map((c: ShelfAny) => c.company?.name) : [],
                        raw: r
                    })));
                } catch (e: ShelfAny) {
                    setError('IGDB search failed: ' + (e.message || String(e)));
                }
            }
        } catch (err: ShelfAny) {
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
                coverUrl: result.coverUrl,
                releaseDate: result.releaseDate,
                externalId: result.externalId,
                overview: result.overview,
                rating: result.rating,
                originalLanguage: result.originalLanguage,
                authors: result.authors,
                pageCount: result.pageCount,
                description: result.description,
                summary: result.summary,
                genres: result.genres,
                studios: result.studios,
                publisher: result.publisher,
                raw: result.raw
            };

            if (type === 'Movies' || type === 'TV') {
                const details = await getTMDBDetails(result.externalId, type === 'Movies' ? 'movie' : 'tv', plugin.settings.tmdbApiKey);
                if (details) {
                    finalMetadata.genres = details.genres?.map((g: ShelfAny) => g.name) || [];
                    finalMetadata.studios = details.production_companies?.map((c: ShelfAny) => c.name) || [];
                    if (type === 'Movies') {
                        finalMetadata.directors = details.credits?.crew?.filter((c: ShelfAny) => c.job === 'Director').map((c: ShelfAny) => c.name) || [];
                        if (details.status === 'Released') finalMetadata.releaseState = 'Released';
                        else finalMetadata.releaseState = 'Upcoming';
                    } else {
                        finalMetadata.directors = details.created_by?.map((c: ShelfAny) => c.name) || [];
                        
                        if (details.status === 'Returning Series') finalMetadata.releaseState = 'Continuing';
                        else if (details.status === 'Ended') finalMetadata.releaseState = 'Ended';
                        else if (details.status === 'Canceled') finalMetadata.releaseState = 'Canceled';
                        else finalMetadata.releaseState = details.status;
                        
                        if (details.seasons) {
                            const parsedSeasons = details.seasons
                                .filter((s: ShelfAny) => s.season_number >= 0 && s.episode_count > 0)
                                .map((s: ShelfAny) => ({
                                    season: s.season_number,
                                    name: s.name || `Season ${s.season_number}`,
                                    episodes: s.episode_count
                                }));
                            
                            let nextEp = undefined;
                            if (details.next_episode_to_air) {
                                nextEp = {
                                    date: details.next_episode_to_air.air_date,
                                    title: details.next_episode_to_air.name,
                                    season: details.next_episode_to_air.season_number,
                                    episode: details.next_episode_to_air.episode_number
                                };
                            }

                            if (!plugin.settings.tvTrackerData) plugin.settings.tvTrackerData = {};
                            plugin.settings.tvTrackerData[result.externalId] = {
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
                    const releaseDate = new Date(result.releaseDate);
                    if (releaseDate > new Date()) finalMetadata.releaseState = 'Upcoming';
                    else finalMetadata.releaseState = 'Released';
                } else if (result.raw?.status !== undefined) {
                    if (result.raw.status === 0 || result.raw.status === 4) finalMetadata.releaseState = 'Released';
                    else if (result.raw.status === 6) finalMetadata.releaseState = 'Canceled';
                    else finalMetadata.releaseState = 'Upcoming';
                } else {
                    finalMetadata.releaseState = 'Released';
                }
            } else if (type === 'Books') {
                if (result.releaseDate) {
                    const releaseDate = new Date(result.releaseDate);
                    if (releaseDate > new Date()) finalMetadata.releaseState = 'Upcoming';
                    else finalMetadata.releaseState = 'Released';
                } else {
                    finalMetadata.releaseState = 'Released';
                }
            }

            const generator = new NoteGenerator(plugin);
            const newFile = await generator.generateNote(type, result.title, finalMetadata);
            openFileRight(plugin, newFile);
            onClose();
        } catch (e: ShelfAny) {
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
                    <form className="shelf-search-bar" onSubmit={handleSearch}>
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
                            <div key={idx} className="shelf-card" onClick={() => handleAdd(result)}>
                                {result.coverUrl ? (
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


/* eslint-enable @typescript-eslint/no-unsafe-assignment -- End of file */
/* eslint-enable @typescript-eslint/no-unsafe-member-access -- End of file */
/* eslint-enable @typescript-eslint/no-unsafe-return -- End of file */
/* eslint-enable @typescript-eslint/no-unsafe-call -- End of file */
/* eslint-enable @typescript-eslint/no-unsafe-argument -- End of file */
/* eslint-enable @typescript-eslint/no-floating-promises -- End of file */
/* eslint-enable @typescript-eslint/no-misused-promises -- End of file */
/* eslint-enable @typescript-eslint/no-unnecessary-type-assertion -- End of file */
/* eslint-enable @typescript-eslint/no-unused-vars -- End of file */
