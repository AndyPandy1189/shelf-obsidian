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
import ShelfPlugin, { openFileRight } from '../main';
import { useMediaLibrary, MediaItem } from '../store/cache';
import { CalendarView } from './CalendarView';
import { AddMediaModal } from './AddMediaModal';
import { TrackerModal } from './TrackerModal';
import { getTMDBDetails } from '../api/tmdb';
import { getIGDBDetails, fetchIGDBToken } from '../api/igdb';
import { getGoogleBooksDetails } from '../api/googleBooks';
import { Notice } from 'obsidian';

export const App = ({ plugin }: { plugin: ShelfPlugin }) => {
    const items = useMediaLibrary(plugin);
    const [activeTab, setActiveTab] = React.useState<'Movies' | 'TV' | 'Games' | 'Books' | 'Calendar'>('Movies');
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [trackingItem, setTrackingItem] = React.useState<MediaItem | null>(null);
    const [sortMode, setSortMode] = React.useState<'Title' | 'Release Date'>('Title');
    const [sortAscending, setSortAscending] = React.useState(true);
    const [groupMode, setGroupMode] = React.useState<'None' | 'Status'>('None');
    const [filterStatus, setFilterStatus] = React.useState<string>('All');
    const [filterCollection, setFilterCollection] = React.useState<string>('All');
    const [filterRating, setFilterRating] = React.useState<string>('All');
    const [filterReleaseState, setFilterReleaseState] = React.useState<string>('All');
    const [searchQuery, setSearchQuery] = React.useState<string>('');

    const [isRefreshing, setIsRefreshing] = React.useState(false);

    const refreshSingleItem = async (item: MediaItem) => {
        if (!item.externalId) throw new Error("No external ID");

        const t = (variable: string) => {
            let template = '';
            if (item.type === 'Movies') template = plugin.settings.movieTemplate;
            else if (item.type === 'TV') template = plugin.settings.tvTemplate;
            else if (item.type === 'Games') template = plugin.settings.gameTemplate;
            else if (item.type === 'Books') template = plugin.settings.bookTemplate;
            
            const regex = new RegExp(`^\\s*([^:\\n]+):.*\\{\\{${variable}\\}\\}`, 'm');
            const match = template.match(regex);
            if (match) return match[1].trim();
            return variable;
        };

        if (item.type === 'Movies' || item.type === 'TV') {
            const typeStr = item.type === 'Movies' ? 'movie' : 'tv';
            const details = await getTMDBDetails(item.externalId, typeStr, plugin.settings.tmdbApiKey);
            if (details) {
                await plugin.app.fileManager.processFrontMatter(item.file, (fm: ShelfAny) => {
                    if (details.genres) fm[t('genres')] = details.genres.map((g: ShelfAny) => g.name);
                    if (details.production_companies) fm[t('studios')] = details.production_companies.map((c: ShelfAny) => c.name);
                    if (item.type === 'Movies') {
                        if (details.credits?.crew) {
                            fm[t('directors')] = details.credits.crew.filter((c: ShelfAny) => c.job === 'Director').map((c: ShelfAny) => c.name);
                        }
                        if (details.release_date) fm[t('releaseDate')] = details.release_date;
                        if (details.status === 'Released') fm[t('releaseState')] = 'Released';
                        else fm[t('releaseState')] = 'Upcoming';
                    }
                    if (item.type === 'TV') {
                        if (details.created_by) {
                            fm[t('directors')] = details.created_by.map((c: ShelfAny) => c.name);
                        }
                        if (details.first_air_date) fm[t('releaseDate')] = details.first_air_date;
                        if (details.status === 'Returning Series') fm[t('releaseState')] = 'Continuing';
                        else if (details.status === 'Ended') fm[t('releaseState')] = 'Ended';
                        else if (details.status === 'Canceled') fm[t('releaseState')] = 'Canceled';
                        else fm[t('releaseState')] = details.status;
                    }
                });
                
                // Handle TV specific tracker data
                if (item.type === 'TV' && details.seasons) {
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
                    plugin.settings.tvTrackerData[item.externalId] = {
                        seasons: parsedSeasons,
                        watched: plugin.settings.tvTrackerData[item.externalId]?.watched || [],
                        progress: plugin.settings.tvTrackerData[item.externalId]?.progress || 0,
                        nextEpisode: nextEp
                    };
                    await plugin.saveSettings();
                }
                return true;
            }
        } else if (item.type === 'Games') {
            let details: ShelfAny = {};
            try {
                details = await getIGDBDetails(item.externalId, plugin.settings.igdbClientId, plugin.settings.igdbAccessToken);
            } catch (e: ShelfAny) {
                if (e.message === "IGDB_401") {
                    if (plugin.settings.igdbClientSecret) {
                        const newToken = await fetchIGDBToken(plugin.settings.igdbClientId, plugin.settings.igdbClientSecret);
                        plugin.settings.igdbAccessToken = newToken;
                        await plugin.saveSettings();
                        details = await getIGDBDetails(item.externalId, plugin.settings.igdbClientId, plugin.settings.igdbAccessToken);
                    } else {
                        throw new Error('Token Expired');
                    }
                } else {
                    throw e;
                }
            }
            if (details) {
                await plugin.app.fileManager.processFrontMatter(item.file, (fm: ShelfAny) => {
                    if (details.genres) fm[t('genres')] = details.genres.map((g: ShelfAny) => g.name);
                    if (details.involved_companies) {
                        const devs = details.involved_companies.filter((c: ShelfAny) => c.developer).map((c: ShelfAny) => c.company?.name);
                        if (devs.length > 0) fm[t('developer')] = devs;
                    }
                    if (details.first_release_date) {
                        const releaseDate = new Date(details.first_release_date * 1000);
                        fm[t('releaseDate')] = releaseDate.toISOString().split('T')[0];
                        if (releaseDate > new Date()) fm[t('releaseState')] = 'Upcoming';
                        else fm[t('releaseState')] = 'Released';
                    } else if (details.status !== undefined) {
                        if (details.status === 0 || details.status === 4) fm[t('releaseState')] = 'Released';
                        else if (details.status === 6) fm[t('releaseState')] = 'Canceled';
                        else fm[t('releaseState')] = 'Upcoming';
                    } else {
                        fm[t('releaseState')] = 'Released';
                    }
                });
                return true;
            }
        } else if (item.type === 'Books') {
            const details = await getGoogleBooksDetails(item.externalId, plugin.settings.googleBooksApiKey);
            if (details && details.volumeInfo) {
                await plugin.app.fileManager.processFrontMatter(item.file, (fm: ShelfAny) => {
                    const info = details.volumeInfo;
                    if (info.authors) fm[t('authors')] = info.authors; // Google Books authors is already string[]
                    if (info.categories) fm[t('genres')] = info.categories; // Google Books categories is already string[]
                    if (info.publisher) fm[t('publisher')] = info.publisher;
                    if (info.publishedDate) {
                        fm[t('releaseDate')] = info.publishedDate;
                        const pubDate = new Date(info.publishedDate);
                        if (pubDate > new Date()) fm[t('releaseState')] = 'Upcoming';
                        else fm[t('releaseState')] = 'Released';
                    } else {
                        fm[t('releaseState')] = 'Released';
                    }
                });
                return true;
            }
        }
        return false;
    };

    const handleGlobalRefresh = async () => {
        if (activeTab === 'Calendar') return;
        const currentItems = items.filter(item => item.type === activeTab && item.externalId);
        
        if (currentItems.length === 0) {
            new Notice(`No items found for ${activeTab} with an external ID.`);
            return;
        }

        setIsRefreshing(true);
        new Notice(`Refreshing ${currentItems.length} items for ${activeTab}...`);

        let refreshed = 0;
        let failed = 0;

        for (const item of currentItems) {
            try {
                const success = await refreshSingleItem(item);
                if (success) refreshed++;
                else failed++;
            } catch (err) {
                console.error(`Failed to refresh item: ${item.title}`, err);
                failed++;
            }
        }

        setIsRefreshing(false);
        new Notice(`Refresh complete: ${refreshed} refreshed, ${failed} failed.`);
    };

    const renderCard = (item: MediaItem) => (
        <div key={item.id} className="shelf-card" onClick={() => {
            openFileRight(plugin, item.file);
        }}>
            <div className="shelf-card-image-wrapper" style={{ position: 'relative', width: '100%' }}>
                {item.coverUrl ? (
                    <img src={item.coverUrl} className="shelf-card-image" alt={item.title} />
                ) : (
                    <div className="shelf-card-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Cover</div>
                )}
                {item.releaseState && (
                    <div className={`shelf-card-release-banner state-${item.releaseState.toLowerCase().replace(' ', '-')}`}>
                        {item.releaseState}
                    </div>
                )}
            </div>
            <div 
                className={`shelf-collection-icon ${item.collection ? 'in-collection' : ''}`}
                onClick={async (e) => {
                    e.stopPropagation();
                    const newVal = !item.collection;
                    await plugin.app.fileManager.processFrontMatter(item.file, (fm: ShelfAny) => {
                        fm.collection = newVal;
                    });
                }}
                title={item.collection ? "In Collection" : "Add to Collection"}
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
                onChange={async (e) => {
                    const val = e.target.value;
                    const ratingNum = val ? parseInt(val) : null;
                    await plugin.app.fileManager.processFrontMatter(item.file, (fm: ShelfAny) => {
                        if (ratingNum === null) {
                            delete fm.rating;
                        } else {
                            fm.rating = ratingNum;
                        }
                    });
                }}
                title="Rate"
            >
                <option value="">⚪</option>
                <option value="5">❤️</option>
                <option value="3">👍</option>
                <option value="1">👎</option>
            </select>
            <div className="shelf-card-content">
                <div className="shelf-card-title">{item.title}</div>
                {item.releaseDate && <div className="shelf-card-subtitle">{item.releaseDate}</div>}
                
                {item.type === 'TV' && item.externalId && plugin.settings.tvTrackerData[item.externalId] && (() => {
                    const tvd = plugin.settings.tvTrackerData[item.externalId!];
                    const total = tvd.seasons.reduce((acc, s) => acc + s.episodes, 0);
                    const watchedPct = total > 0 ? (tvd.watched.length / total) * 100 : 0;
                    const skippedPct = total > 0 ? ((tvd.skipped?.length || 0) / total) * 100 : 0;
                    
                    return (
                        <div style={{ marginTop: '4px', marginBottom: '8px' }} title={`${Math.round(watchedPct + skippedPct)}% Completed`}>
                            <div className="progress-bar-bg" style={{ width: '100%', height: '4px' }}>
                                <div className="progress-bar-fill" style={{ width: `${watchedPct}%` }} />
                                <div className="progress-bar-fill" style={{ width: `${skippedPct}%`, backgroundColor: '#3b82f6' }} />
                            </div>
                        </div>
                    );
                })()}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <select 
                        className={`shelf-card-status status-${(item.status || 'not started').toLowerCase().replace(' ', '-')}`}
                        value={item.status || 'Not Started'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={async (e) => {
                            e.stopPropagation();
                            const newStatus = e.target.value;
                            await plugin.app.fileManager.processFrontMatter(item.file, (fm: ShelfAny) => {
                                fm.status = newStatus;
                            });
                        }}
                    >
                        <option value="Not Started">Not Started</option>
                        {(item.type === 'Movies' || item.type === 'TV') && <option value="Watching">Watching</option>}
                        {item.type === 'Games' && <option value="Playing">Playing</option>}
                        {item.type === 'Books' && <option value="Reading">Reading</option>}
                        <option value="Complete">Complete</option>
                        <option value="Dropped">Dropped</option>
                    </select>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
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
                            onClick={async (e) => {
                                e.stopPropagation();
                                setIsRefreshing(true);
                                try {
                                    const success = await refreshSingleItem(item);
                                    if (success) {
                                        new Notice(`Refreshed ${item.title}`);
                                    } else {
                                        new Notice(`Failed to refresh ${item.title}`);
                                    }
                                } catch (err) {
                                    console.error(`Failed to refresh item: ${item.title}`, err);
                                    new Notice(`Failed to refresh ${item.title}`);
                                } finally {
                                    setIsRefreshing(false);
                                }
                            }}
                            title="Refresh Metadata"
                        >
                            ↻
                        </button>
                        {item.type === 'TV' && (
                            <button 
                                style={{ 
                                    fontSize: '11px', 
                                    padding: '4px 12px', 
                                    borderRadius: '100px',
                                    fontWeight: 600,
                                    border: 'none',
                                    backgroundColor: 'var(--interactive-normal)',
                                    cursor: 'pointer'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setTrackingItem(item);
                                }}
                            >
                                Track
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    let processedItems = items.filter(item => item.type === activeTab);

    if (filterStatus !== 'All') {
        processedItems = processedItems.filter(item => item.status === filterStatus);
    }

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
        const query = searchQuery.toLowerCase();
        processedItems = processedItems.filter(item => item.title.toLowerCase().includes(query));
    }

    processedItems.sort((a, b) => {
        let result = 0;
        if (sortMode === 'Release Date') {
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

    let renderContent;

    if (groupMode === 'Status') {
        const groups: Record<string, MediaItem[]> = {};
        processedItems.forEach(item => {
            const status = item.status || 'Not Started';
            if (!groups[status]) groups[status] = [];
            groups[status].push(item);
        });

        const statusOrder = ['Not Started', 'Watching', 'Playing', 'Reading', 'Complete', 'Dropped'];

        renderContent = (
            <div className="shelf-grouped-gallery">
                {statusOrder.filter(s => groups[s]).map(status => (
                    <div key={status} className="shelf-group-section">
                        <h3 className="shelf-group-header">{status}</h3>
                        <div className="shelf-gallery" style={{ paddingTop: '12px', paddingBottom: '24px' }}>
                            {groups[status].map(item => renderCard(item))}
                        </div>
                    </div>
                ))}
                {Object.keys(groups).filter(s => !statusOrder.includes(s)).map(status => (
                    <div key={status} className="shelf-group-section">
                        <h3 className="shelf-group-header">{status}</h3>
                        <div className="shelf-gallery" style={{ paddingTop: '12px', paddingBottom: '24px' }}>
                            {groups[status].map(item => renderCard(item))}
                        </div>
                    </div>
                ))}
                {processedItems.length === 0 && <div style={{ color: 'var(--text-muted)', padding: '24px' }}>No items found for {activeTab}.</div>}
            </div>
        );
    } else {
        renderContent = (
            <div className="shelf-gallery">
                {processedItems.map(item => renderCard(item))}
                {processedItems.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No items found for {activeTab}.</div>}
            </div>
        );
    }

    return (
        <div className="shelf-app">
            <div className="shelf-header">
                <div className="shelf-tabs-desktop">
                    {['Movies', 'TV', 'Games', 'Books', 'Calendar'].map(tab => (
                        <div 
                            key={tab} 
                            className={`shelf-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab as ShelfAny)}
                        >
                            {tab}
                        </div>
                    ))}
                </div>
                <div className="shelf-tabs-mobile">
                    <select value={activeTab} onChange={(e) => setActiveTab(e.target.value as ShelfAny)} className="shelf-tab-select">
                        <option value="Movies">Movies</option>
                        <option value="TV">TV</option>
                        <option value="Games">Games</option>
                        <option value="Books">Books</option>
                        <option value="Calendar">Calendar</option>
                    </select>
                </div>
                <div style={{flexGrow: 1}} />
                {activeTab !== 'Calendar' && (
                    <button 
                        className="shelf-fab" 
                        style={{ marginRight: '8px', backgroundColor: 'var(--interactive-normal)', color: 'var(--text-normal)' }} 
                        onClick={handleGlobalRefresh}
                        disabled={isRefreshing}
                        title={`Refresh ${activeTab}`}
                    >
                        ↻ <span className="hide-on-mobile" style={{ marginLeft: '4px' }}>{isRefreshing ? 'Refreshing...' : `Refresh ${activeTab}`}</span>
                    </button>
                )}
                <button className="shelf-fab" onClick={() => setIsAddModalOpen(true)} title="Add to Library">
                    + <span className="hide-on-mobile" style={{ marginLeft: '4px' }}>Add to Library</span>
                </button>
            </div>

            {activeTab !== 'Calendar' && (
                <div className="shelf-action-bar">
                    <div className="action-group" style={{ flexGrow: 1 }}>
                        <input 
                            type="text" 
                            className="shelf-search-input"
                            placeholder="Search library..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="action-group">
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} title="Filter by Status">
                            <option value="All">All Statuses</option>
                            <option value="Not Started">Not Started</option>
                            {(activeTab === 'Movies' || activeTab === 'TV') && <option value="Watching">Watching</option>}
                            {activeTab === 'Games' && <option value="Playing">Playing</option>}
                            {activeTab === 'Books' && <option value="Reading">Reading</option>}
                            <option value="Complete">Complete</option>
                            <option value="Dropped">Dropped</option>
                        </select>
                        <select value={filterCollection} onChange={e => setFilterCollection(e.target.value)} title="Filter by Collection">
                            <option value="All">All Collections</option>
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
                            {activeTab === 'TV' && <option value="Continuing">Continuing</option>}
                            {activeTab === 'TV' && <option value="Ended">Ended</option>}
                            {activeTab === 'TV' && <option value="Canceled">Canceled</option>}
                            <option value="Unknown">Unknown</option>
                        </select>
                    </div>
                    <div className="action-group">
                        <label>Sort By:</label>
                        <select value={sortMode} onChange={e => {
                            setSortMode(e.target.value as ShelfAny);
                            if (e.target.value === 'Release Date') setSortAscending(false); // Default newest first
                            else setSortAscending(true); // Default A-Z
                        }}>
                            <option value="Title">Title</option>
                            <option value="Release Date">Release Date</option>
                        </select>
                        <button 
                            className="shelf-icon-button"
                            onClick={() => setSortAscending(!sortAscending)}
                            title={sortAscending ? "Ascending" : "Descending"}
                        >
                            {sortAscending ? "↑" : "↓"}
                        </button>
                    </div>
                    <div className="action-group">
                        <label>Group By:</label>
                        <select value={groupMode} onChange={e => setGroupMode(e.target.value as ShelfAny)}>
                            <option value="None">None</option>
                            <option value="Status">Status</option>
                        </select>
                    </div>
                </div>
            )}
            
            <div className="shelf-view-container shelf-gallery-container">
                {activeTab === 'Calendar' ? (
                    <CalendarView items={items} plugin={plugin} />
                ) : renderContent}
            </div>

            {isAddModalOpen && (
                <AddMediaModal plugin={plugin} onClose={() => setIsAddModalOpen(false)} defaultTab={activeTab === 'Calendar' ? 'Movies' : activeTab} />
            )}
            
            {trackingItem && (
                <TrackerModal plugin={plugin} item={trackingItem} onClose={() => setTrackingItem(null)} />
            )}
        </div>
    );
};


/* eslint-enable @typescript-eslint/no-unsafe-assignment */
/* eslint-enable @typescript-eslint/no-unsafe-member-access */
/* eslint-enable @typescript-eslint/no-unsafe-return */
/* eslint-enable @typescript-eslint/no-unsafe-call */
/* eslint-enable @typescript-eslint/no-unsafe-argument */
/* eslint-enable @typescript-eslint/no-floating-promises */
/* eslint-enable @typescript-eslint/no-misused-promises */
/* eslint-enable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-enable @typescript-eslint/no-unused-vars */
