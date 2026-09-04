import os

path = 'src/ui/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
import_str = "import { getGoogleBooksDetails } from '../api/googleBooks';"
import_str_new = "import { getGoogleBooksDetails } from '../api/googleBooks';\nimport { getComicVineDetails } from '../api/comicVine';"
content = content.replace(import_str, import_str_new)

# 2. Add sync logic for Comics & Manga
sync_str = '''        } else if (item.type === 'Books') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
            const details = await getGoogleBooksDetails(item.externalId, plugin.settings.googleBooksApiKey);'''

sync_str_new = '''        } else if (item.type === 'Comics & Manga') {
            const details = await getComicVineDetails(item.externalId, plugin.settings.comicVineApiKey);
            if (details && details.results) {
                await plugin.app.fileManager.processFrontMatter(item.file, (fm: ShelfAny) => {
                    const r = details.results;
                    
                    // Same heuristics as AddMediaModal for title
                    const isIssue = r.resource_type === 'issue';
                    const tag = isIssue ? [Issue #] : '[Volume]';
                    const titleName = r.name || (r.volume && r.volume.name ? ${r.volume.name} # : 'Unknown');
                    fm[t('title')] = ${titleName} ;
                    
                    if (r.character_credits) fm[t('characters')] = r.character_credits.map((c: any) => c.name);
                    if (r.person_credits) fm[t('author')] = r.person_credits.map((c: any) => c.name);
                    if (r.publisher) fm[t('publisher')] = r.publisher.name;
                    if (r.issue_number) fm[t('issueNumber')] = r.issue_number;
                    if (r.start_year) fm[t('releaseDate')] = r.start_year;
                    if (r.cover_date) {
                        fm[t('releaseDate')] = r.cover_date.length > 10 ? r.cover_date.substring(0, 10) : r.cover_date;
                    }
                    fm[t('releaseState')] = 'Released';
                    if (r.image && (r.image.medium_url || r.image.super_url || r.image.original_url)) {
                        fm[t('posterImage')] = r.image.medium_url || r.image.super_url || r.image.original_url;
                    }
                    if (r.deck) fm[t('overview')] = r.deck;
                });
                return true;
            }
        } else if (item.type === 'Books') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
            const details = await getGoogleBooksDetails(item.externalId, plugin.settings.googleBooksApiKey);'''

content = content.replace(sync_str, sync_str_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
