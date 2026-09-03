import os

path = 'src/ui/TrackerModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_effect = '''    // Initialize state synchronously so it doesn't flicker before loadData
    React.useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
        const fm = plugin.app.metadataCache.getFileCache(item.file)?.frontmatter;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
        const fmWatched = fm?.watchedEpisodes;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
        const fmSkipped = fm?.skippedEpisodes;
        
        if (Array.isArray(fmWatched)) setWatched(new Set(fmWatched.map(String)));
        else setWatched(new Set(trackerData.watched || []));
        
        if (Array.isArray(fmSkipped)) setSkipped(new Set(fmSkipped.map(String)));
        else setSkipped(new Set(trackerData.skipped || []));
    }, [item.file, plugin.app.metadataCache, trackerData.watched, trackerData.skipped]);'''

new_effect = '''    // Load state from frontmatter and listen to external changes (like Obsidian Sync)
    React.useEffect(() => {
        const loadFromCache = () => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
            const fm = plugin.app.metadataCache.getFileCache(item.file)?.frontmatter;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
            const fmWatched = fm?.watchedEpisodes;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- Dynamic API response
            const fmSkipped = fm?.skippedEpisodes;
            
            if (Array.isArray(fmWatched)) setWatched(new Set(fmWatched.map(String)));
            else setWatched(new Set(trackerData.watched || []));
            
            if (Array.isArray(fmSkipped)) setSkipped(new Set(fmSkipped.map(String)));
            else setSkipped(new Set(trackerData.skipped || []));
        };

        loadFromCache();

        const eventRef = plugin.app.metadataCache.on('changed', (changedFile) => {
            if (changedFile.path === item.file.path) {
                loadFromCache();
            }
        });

        return () => {
            plugin.app.metadataCache.offref(eventRef);
        };
    }, [item.file, plugin.app.metadataCache, trackerData.watched, trackerData.skipped]);'''

content = content.replace(old_effect, new_effect)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
