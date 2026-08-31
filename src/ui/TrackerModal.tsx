import { ShelfAny } from '../types';
import * as React from 'react';
import ShelfPlugin from '../main';
import { MediaItem } from '../store/cache';
import { getTMDBDetails } from '../api/tmdb';

export const TrackerModal = ({ plugin, item, onClose }: { plugin: ShelfPlugin, item: MediaItem, onClose: () => void }) => {
    const [seasons, setSeasons] = React.useState<{season: number, name?: string, episodes: number}[]>([]);
    const [watched, setWatched] = React.useState<Set<string>>(new Set());
    const [skipped, setSkipped] = React.useState<Set<string>>(new Set());
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');

    const trackerData = plugin.settings.tvTrackerData[item.externalId || ''] || { seasons: [], watched: [], skipped: [], progress: 0 };

    React.useEffect(() => {
        const loadData = async (forceRefresh = false) => {
            setLoading(true);
            setError('');
            
            try {
                if (!item.externalId) {
                    setError('No externalId found for this item. Cannot fetch TV data.');
                    setLoading(false);
                    return;
                }

                let currentSeasons = trackerData.seasons;

                // Fetch from TMDB if we don't have seasons cached, or if forceRefresh is true
                if (!currentSeasons || currentSeasons.length === 0 || forceRefresh) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                    const details = await getTMDBDetails(item.externalId, 'tv', plugin.settings.tmdbApiKey);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Dynamic API response
                    if (details && details.seasons) {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                        currentSeasons = details.seasons
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

                        // Save the fetched seasons to plugin settings
                        if (!plugin.settings.tvTrackerData) plugin.settings.tvTrackerData = {};
                        plugin.settings.tvTrackerData[item.externalId] = {
                            seasons: currentSeasons,
                            watched: trackerData.watched || [],
                            skipped: trackerData.skipped || [],
                            progress: trackerData.progress || 0,
                            nextEpisode: nextEp
                        };
                        await plugin.saveSettings();
                    } else {
                        setError('Could not fetch season data from TMDB.');
                    }
                }

                setSeasons(currentSeasons);
                setWatched(new Set(trackerData.watched || []));
                setSkipped(new Set(trackerData.skipped || []));
            } catch (err: ShelfAny) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Dynamic API response
                setError(err.message || 'Error loading tracker data');
            } finally {
                setLoading(false);
            }
        };

        // eslint-disable-next-line @typescript-eslint/no-floating-promises -- Dynamic API response
        // eslint-disable-next-line @typescript-eslint/no-floating-promises -- Dynamic API response
        loadData();
        
        // Save loadData to a ref so we can call it manually
        refreshRef.current = () => loadData(true);
    }, [item.externalId, plugin]);

    const refreshRef = React.useRef<() => void>();

    const saveState = async (newWatched: Set<string>, newSkipped: Set<string>) => {
        if (!item.externalId) return;
        
        const watchedArray = Array.from(newWatched);
        const skippedArray = Array.from(newSkipped);
        let total = 0;
        seasons.forEach(s => total += s.episodes);
        const progress = total > 0 ? Math.round(((watchedArray.length + skippedArray.length) / total) * 100) : 0;

        plugin.settings.tvTrackerData[item.externalId] = {
            ...plugin.settings.tvTrackerData[item.externalId],
            seasons,
            watched: watchedArray,
            skipped: skippedArray,
            progress
        };
        await plugin.saveSettings();
    };

    const toggleEpisode = async (season: number, ep: number) => {
        const epKey = `S${season}E${ep}`;
        const newWatched = new Set(watched);
        const newSkipped = new Set(skipped);

        if (newWatched.has(epKey)) {
            newWatched.delete(epKey);
            newSkipped.add(epKey);
        } else if (newSkipped.has(epKey)) {
            newSkipped.delete(epKey);
        } else {
            newWatched.add(epKey);
        }
        
        setWatched(newWatched);
        setSkipped(newSkipped);
        await saveState(newWatched, newSkipped);
    };

    const markSeasonWatched = async (season: number, totalEpisodes: number) => {
        const newWatched = new Set(watched);
        const newSkipped = new Set(skipped);
        let allWatched = true;
        for (let i = 1; i <= totalEpisodes; i++) {
            if (!newWatched.has(`S${season}E${i}`)) allWatched = false;
        }
        
        for (let i = 1; i <= totalEpisodes; i++) {
            const epKey = `S${season}E${i}`;
            newSkipped.delete(epKey);
            if (allWatched) {
                newWatched.delete(epKey);
            } else {
                newWatched.add(epKey);
            }
        }
        
        setWatched(newWatched);
        setSkipped(newSkipped);
        await saveState(newWatched, newSkipped);
    };

    const markSeasonSkipped = async (season: number, totalEpisodes: number) => {
        const newWatched = new Set(watched);
        const newSkipped = new Set(skipped);
        
        for (let i = 1; i <= totalEpisodes; i++) {
            const epKey = `S${season}E${i}`;
            newWatched.delete(epKey);
            newSkipped.add(epKey);
        }
        
        setWatched(newWatched);
        setSkipped(newSkipped);
        await saveState(newWatched, newSkipped);
    };

    let totalEpisodes = 0;
    seasons.forEach(s => totalEpisodes += s.episodes);
    const progress = totalEpisodes > 0 ? Math.round(((watched.size + skipped.size) / totalEpisodes) * 100) : 0;
    const watchedPct = totalEpisodes > 0 ? (watched.size / totalEpisodes) * 100 : 0;
    const skippedPct = totalEpisodes > 0 ? (skipped.size / totalEpisodes) * 100 : 0;

    return (
        <div className="shelf-modal-overlay">
            <div className="shelf-modal" style={{ maxWidth: '800px' }}>
                <div className="shelf-modal-header">
                    <h2>Track Episodes: {item.title}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="shelf-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
                    
                    {loading && <div>Loading season data...</div>}
                    {error && <div className="shelf-error">{error}</div>}

                    <div className="shelf-tracker-container">
                        <div className="shelf-tracker-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h3>Episode Tracker</h3>
                                <button 
                                    style={{ fontSize: '0.8em', padding: '4px 8px' }} 
                                    {/* eslint-disable-next-line @typescript-eslint/no-misused-promises -- React */}
                                    onClick={() => refreshRef.current?.()}
                                    title="Pull latest episodes from TMDB"
                                >
                                    ↻ Refresh Data
                                </button>
                            </div>
                            
                            {seasons.length > 0 && (
                                <div className="shelf-tracker-progress">
                                    <div className="progress-bar-bg">
                                        <div className="progress-bar-fill" style={{ width: `${watchedPct}%` }} />
                                        <div className="progress-bar-fill" style={{ width: `${skippedPct}%`, backgroundColor: '#3b82f6' }} />
                                    </div>
                                    <span>{progress}% Watched/Skipped ({watched.size + skipped.size}/{totalEpisodes} Episodes)</span>
                                </div>
                            )}
                        </div>

                        {!loading && !error && seasons.length === 0 && (
                            <div style={{ marginTop: '16px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                No season data available.
                            </div>
                        )}

                        {!loading && !error && seasons.length > 0 && (
                            <div className="shelf-tracker-seasons">
                            
                            {seasons.map(s => {
                                let seasonWatchedCount = 0;
                                for(let i=1; i<=s.episodes; i++) {
                                    if (watched.has(`S${s.season}E${i}`)) seasonWatchedCount++;
                                }
                                const allWatched = seasonWatchedCount === s.episodes;

                                return (
                                    <div key={s.season} className="tracker-season">
                                        <div className="tracker-season-header">
                                            <h4>
                                                {s.name || `Season ${s.season}`} 
                                                <span style={{fontSize: '0.8em', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 'normal'}}>
                                                    ({s.episodes} Episodes)
                                                </span>
                                            </h4>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {/* eslint-disable-next-line @typescript-eslint/no-misused-promises -- React */}
                                                <button onClick={() => markSeasonWatched(s.season, s.episodes)}>
                                                    {allWatched ? '✗ Unmark All' : '✓ Mark All'}
                                                </button>
                                                {/* eslint-disable-next-line @typescript-eslint/no-misused-promises -- React */}
                                                <button onClick={() => markSeasonSkipped(s.season, s.episodes)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/></svg> Skip All
                                                </button>
                                            </div>
                                        </div>
                                        <div className="tracker-episodes">
                                            {Array.from({length: s.episodes}).map((_, i) => {
                                                const ep = i + 1;
                                                const isWatched = watched.has(`S${s.season}E${ep}`);
                                                const isSkipped = skipped.has(`S${s.season}E${ep}`);
                                                return (
                                                    <button 
                                                        key={ep} 
                                                        className={`tracker-ep-btn ${isWatched ? 'watched' : ''} ${isSkipped ? 'skipped' : ''}`}
                                                        {/* eslint-disable-next-line @typescript-eslint/no-misused-promises -- React */}
                                                        onClick={() => toggleEpisode(s.season, ep)}
                                                        title={`Season ${s.season} Episode ${ep}`}
                                                    >
                                                        {isWatched ? '✓' : isSkipped ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/></svg>
                                                        ) : ep}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    </div>
                </div>
            </div>
        </div>
    );
};


