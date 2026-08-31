import os

path = 'src/ui/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix onChange={async
content = content.replace('''                onChange={async (e) => {
                    const val = e.target.value;
                    const ratingNum = val ? parseInt(val) : null;
                    await plugin.app.fileManager.processFrontMatter(item.file, (fm: ShelfAny) => {
                        if (ratingNum === null) {
                            delete fm.rating;
                        } else {
                            fm.rating = ratingNum;
                        }
                    });
                }}''', '''                onChange={(e) => {
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
                }}''')

content = content.replace('''                        onChange={async (e) => {
                            e.stopPropagation();
                            const newStatus = e.target.value;
                            await plugin.app.fileManager.processFrontMatter(item.file, (fm: ShelfAny) => {
                                fm.status = newStatus;
                            });
                        }}''', '''                        onChange={(e) => {
                            void (async () => {
                                e.stopPropagation();
                                const newStatus = e.target.value;
                                await plugin.app.fileManager.processFrontMatter(item.file, (fm: ShelfAny) => {
                                    fm.status = newStatus;
                                });
                            })();
                        }}''')

# Fix unnecessary assertion
content = content.replace('const tvd = plugin.settings.tvTrackerData[item.externalId!];', 'const tvd = plugin.settings.tvTrackerData[item.externalId];')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)


path2 = 'src/ui/TrackerModal.tsx'
with open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()

content2 = content2.replace('refreshRef.current = () => loadData(true);', 'refreshRef.current = () => { void loadData(true); };')

with open(path2, 'w', encoding='utf-8') as f:
    f.write(content2)

