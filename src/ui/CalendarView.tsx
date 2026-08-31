import { ShelfAny } from '../types';
import * as React from 'react';
import { MediaItem } from '../store/cache';
import ShelfPlugin, { openFileRight } from '../main';

interface CalendarViewProps {
    items: MediaItem[];
    plugin: ShelfPlugin;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ items, plugin }) => {
    const [viewMode, setViewMode] = React.useState<'Timeline' | 'Month' | 'Week'>('Timeline');
    const [currentDate, setCurrentDate] = React.useState(() => new Date());

    // Inject upcoming TV episodes into the calendar as synthetic items
    const calendarItems: MediaItem[] = [];
    items.forEach(item => {
        calendarItems.push(item);
        if (item.type === 'TV' && item.externalId && plugin.settings.tvTrackerData[item.externalId]?.nextEpisode) {
            const nextEp = plugin.settings.tvTrackerData[item.externalId].nextEpisode!;
            calendarItems.push({
                ...item,
                id: `${item.id}-next-ep`,
                title: `${item.title} (S${nextEp.season} E${nextEp.episode})`,
                releaseDate: nextEp.date
            });
        }
    });

    // Fix TBD logic: Only consider TBD if there is NO valid releaseDate
    const tbdItems = calendarItems.filter(i => !i.releaseDate || String(i.releaseDate).toLowerCase() === 'tbd');
    const datedItems = calendarItems.filter(i => i.releaseDate && String(i.releaseDate).toLowerCase() !== 'tbd');

    const handlePrev = () => {
        const d = new Date(currentDate);
        if (viewMode === 'Month') d.setMonth(d.getMonth() - 1);
        else if (viewMode === 'Week') d.setDate(d.getDate() - 7);
        setCurrentDate(d);
    };

    const handleNext = () => {
        const d = new Date(currentDate);
        if (viewMode === 'Month') d.setMonth(d.getMonth() + 1);
        else if (viewMode === 'Week') d.setDate(d.getDate() + 7);
        setCurrentDate(d);
    };

    const handleToday = () => setCurrentDate(new Date());

    return (
        <div className="shelf-calendar-container">
            <div className="shelf-calendar-main">
                <div className="calendar-header">
                    <div className="calendar-nav">
                        {viewMode !== 'Timeline' && (
                            <div className="calendar-nav-controls">
                                <button onClick={handlePrev}>&lt;</button>
                                <button onClick={handleToday}>Today</button>
                                <button onClick={handleNext}>&gt;</button>
                            </div>
                        )}
                        <h2>
                            {viewMode === 'Month' ? currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })
                            : viewMode === 'Week' ? `Week of ${getStartOfWeek(currentDate).toLocaleDateString()}`
                            : 'Upcoming Releases'}
                        </h2>
                    </div>
                    <div className="calendar-view-toggles">
                        {['Timeline', 'Month', 'Week'].map(mode => (
                            <button 
                                key={mode} 
                                className={viewMode === mode ? 'active' : ''}
                                onClick={() => setViewMode(mode as ShelfAny)}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="calendar-body">
                    {viewMode === 'Timeline' && <TimelineView items={datedItems} plugin={plugin} />}
                    {viewMode === 'Month' && <MonthView items={datedItems} currentDate={currentDate} plugin={plugin} />}
                    {viewMode === 'Week' && <WeekView items={datedItems} currentDate={currentDate} plugin={plugin} />}
                </div>
            </div>

            <div className="shelf-calendar-sidebar">
                <h3>Unknown Dates</h3>
                <div className="tbd-list">
                    {tbdItems.map(item => (
                        // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Dynamic API response
                        // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Dynamic API response
                        <div key={item.id} className="tbd-item" onClick={() => openFileRight(plugin, item.file)}>
                            <div className="tbd-title">{item.title}</div>
                            <div className="tbd-type">{item.type}</div>
                        </div>
                    ))}
                    {tbdItems.length === 0 && <p className="text-muted">No TBD items.</p>}
                </div>
            </div>
        </div>
    );
};

// ================= TIMELINE VIEW =================
const TimelineView: React.FC<{items: MediaItem[], plugin: ShelfPlugin}> = ({ items, plugin }) => {
    // Only show items >= today
    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingItems = items.filter(i => (i.releaseDate || '') >= todayStr);
    
    const groupedItems: Record<string, MediaItem[]> = {};
    upcomingItems.forEach(item => {
        let key = item.releaseDate || "Unknown";
        const parts = key.split('-');
        if (parts.length === 1) key = `${parts[0]} (Yearly)`;
        else if (parts.length === 2) key = `${parts[0]}-${parts[1]}`;
        
        if (!groupedItems[key]) groupedItems[key] = [];
        groupedItems[key].push(item);
    });

    const sortedKeys = Object.keys(groupedItems).sort();

    return (
        <div className="timeline-view">
            {sortedKeys.length === 0 && <p className="text-muted">No upcoming releases found.</p>}
            {sortedKeys.map(key => (
                <div key={key} className="calendar-group" style={{marginTop: 0}}>
                    <h3>{key}</h3>
                    <div className="shelf-gallery calendar-gallery">
                        {groupedItems[key].map(item => (
                            <CalendarCard key={item.id} item={item} plugin={plugin} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ================= MONTH VIEW =================
const MonthView: React.FC<{items: MediaItem[], currentDate: Date, plugin: ShelfPlugin}> = ({ items, currentDate, plugin }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
        <div className="shelf-calendar-month-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="month-day-header">{d}</div>
            ))}
            {days.map((day, idx) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Dynamic API response
                if (!day) return <div key={`empty-${idx}`} className="month-day-cell empty" />;
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Dynamic API response
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                
                // Find items that loosely match this date
                const dayItems = items.filter(i => {
                    if (!i.releaseDate) return false;
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Dynamic API response
                    // If the item just says "2024-10", place it on the 1st
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Dynamic API response
                    if (i.releaseDate === `${year}-${String(month + 1).padStart(2, '0')}` && day === 1) return true;
                    return i.releaseDate === dateStr;
                });

                return (
                    <div key={day} className={`month-day-cell ${dayItems.length > 0 ? 'has-items' : ''}`}>
                        <div className="day-number">{day}</div>
                        <div className="day-items">
                            // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Dynamic API response
                            {dayItems.map(item => (
                                // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Dynamic API response
                                <div key={item.id} className="day-item-pill" onClick={() => openFileRight(plugin, item.file)} title={item.title}>
                                    <span className="pill-type">{item.type.charAt(0)}</span>
                                    <span className="pill-title">{item.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ================= WEEK VIEW =================
const WeekView: React.FC<{items: MediaItem[], currentDate: Date, plugin: ShelfPlugin}> = ({ items, currentDate, plugin }) => {
    const startOfWeek = getStartOfWeek(currentDate);
    const weekDays = Array.from({length: 7}).map((_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        return d;
    });

    return (
        <div className="shelf-calendar-week-grid">
            {weekDays.map((date, idx) => {
                const dateStr = date.toISOString().split('T')[0];
                const dayItems = items.filter(i => i.releaseDate === dateStr);
                
                return (
                    <div key={idx} className={`week-day-col ${dayItems.length > 0 ? 'has-items' : ''}`}>
                        <div className="week-day-header">
                            <div className="weekday-name">{date.toLocaleDateString('default', { weekday: 'short' })}</div>
                            <div className="weekday-date">{date.getDate()}</div>
                        </div>
                        <div className="week-day-body">
                            {dayItems.map(item => (
                                <CalendarCard key={item.id} item={item} plugin={plugin} compact />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ================= HELPERS =================
function getStartOfWeek(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
}
// eslint-disable-next-line @typescript-eslint/no-misused-promises -- Dynamic API response

const CalendarCard: React.FC<{item: MediaItem, plugin: ShelfPlugin, compact?: boolean}> = ({ item, plugin, compact }) => (
    // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Dynamic API response
    <div className={`shelf-card ${compact ? 'compact' : ''}`} onClick={() => openFileRight(plugin, item.file)}>
        {item.coverUrl ? (
            <img src={item.coverUrl} className="shelf-card-image" alt={item.title} />
        ) : (
            <div className="shelf-card-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Cover</div>
        )}
        <div className="shelf-card-content">
            <div className="shelf-card-title">{item.title}</div>
            <div className="shelf-card-subtitle">{item.releaseDate}</div>
        </div>
    </div>
);


