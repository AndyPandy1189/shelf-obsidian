import os

path = 'src/ui/TrackerModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_code = '''                setSeasons(currentSeasons);
                setWatched(new Set(trackerData.watched || []));
                setSkipped(new Set(trackerData.skipped || []));
            } catch (err: ShelfAny) {'''

new_code = '''                setSeasons(currentSeasons);
            } catch (err: ShelfAny) {'''

content = content.replace(old_code, new_code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
