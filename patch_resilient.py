import os

path = 'src/ui/TrackerModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_load = '''            if (Array.isArray(fmWatched)) setWatched(new Set(fmWatched.map(String)));
            else setWatched(new Set(trackerData.watched || []));
            
            if (Array.isArray(fmSkipped)) setSkipped(new Set(fmSkipped.map(String)));
            else setSkipped(new Set(trackerData.skipped || []));'''

new_load = '''            if (fmWatched !== undefined && fmWatched !== null) {
                if (Array.isArray(fmWatched)) setWatched(new Set(fmWatched.map(String)));
                else setWatched(new Set([String(fmWatched)]));
            } else {
                setWatched(new Set(trackerData.watched || []));
            }
            
            if (fmSkipped !== undefined && fmSkipped !== null) {
                if (Array.isArray(fmSkipped)) setSkipped(new Set(fmSkipped.map(String)));
                else setSkipped(new Set([String(fmSkipped)]));
            } else {
                setSkipped(new Set(trackerData.skipped || []));
            }'''

content = content.replace(old_load, new_load)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)


path_app = 'src/ui/App.tsx'
with open(path_app, 'r', encoding='utf-8') as f:
    content_app = f.read()

old_app_count = '''                    const watchedCount = Array.isArray(fmWatched) ? fmWatched.length : (tvd.watched?.length || 0);
                    const skippedCount = Array.isArray(fmSkipped) ? fmSkipped.length : (tvd.skipped?.length || 0);'''

new_app_count = '''                    const watchedCount = fmWatched !== undefined && fmWatched !== null ? (Array.isArray(fmWatched) ? fmWatched.length : 1) : (tvd.watched?.length || 0);
                    const skippedCount = fmSkipped !== undefined && fmSkipped !== null ? (Array.isArray(fmSkipped) ? fmSkipped.length : 1) : (tvd.skipped?.length || 0);'''

content_app = content_app.replace(old_app_count, new_app_count)


old_app_array = '''                    const watchedArray = Array.isArray(fmWatched) ? fmWatched.map(String) : (plugin.settings.tvTrackerData[item.externalId]?.watched || []);
                    const skippedArray = Array.isArray(fmSkipped) ? fmSkipped.map(String) : (plugin.settings.tvTrackerData[item.externalId]?.skipped || []);'''

new_app_array = '''                    const watchedArray = fmWatched !== undefined && fmWatched !== null ? (Array.isArray(fmWatched) ? fmWatched.map(String) : [String(fmWatched)]) : (plugin.settings.tvTrackerData[item.externalId]?.watched || []);
                    const skippedArray = fmSkipped !== undefined && fmSkipped !== null ? (Array.isArray(fmSkipped) ? fmSkipped.map(String) : [String(fmSkipped)]) : (plugin.settings.tvTrackerData[item.externalId]?.skipped || []);'''

content_app = content_app.replace(old_app_array, new_app_array)

with open(path_app, 'w', encoding='utf-8') as f:
    f.write(content_app)

