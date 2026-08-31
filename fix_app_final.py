import os

path = 'src/ui/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = '''                            onClick={async (e) => {
                                e.stopPropagation();
                                setIsRefreshing(true);
                                try {
                                    const success = await refreshSingleItem(item);
                                    if (success) {
                                        new Notice(Refreshed );
                                    } else {
                                        new Notice(Failed to refresh );
                                    }
                                } catch (err) {
                                    console.error(Failed to refresh item: , err);
                                    new Notice(Failed to refresh );
                                } finally {
                                    setIsRefreshing(false);
                                }
                            }}'''

new_block = '''                            onClick={(e) => {
                                void (async () => {
                                    e.stopPropagation();
                                    setIsRefreshing(true);
                                    try {
                                        const success = await refreshSingleItem(item);
                                        if (success) {
                                            new Notice(Refreshed );
                                        } else {
                                            new Notice(Failed to refresh );
                                        }
                                    } catch (err) {
                                        console.error(Failed to refresh item: , err);
                                        new Notice(Failed to refresh );
                                    } finally {
                                        setIsRefreshing(false);
                                    }
                                })();
                            }}'''

content = content.replace(old_block, new_block)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
