import os

path = 'src/ui/AddMediaModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { searchIGDB, fetchIGDBToken } from '../api/igdb';",
                          "import { searchIGDB, fetchIGDBToken } from '../api/igdb';\nimport { searchComicVine, getComicVineDetails } from '../api/comicVine';")

content = content.replace("defaultTab?: 'Movies' | 'TV' | 'Games' | 'Books'",
                          "defaultTab?: 'Movies' | 'TV' | 'Games' | 'Books' | 'Comics & Manga'")

content = content.replace("const [type, setType] = React.useState<'Movies' | 'TV' | 'Games' | 'Books'>(defaultTab || 'Movies');",
                          "const [type, setType] = React.useState<'Movies' | 'TV' | 'Games' | 'Books' | 'Comics & Manga'>(defaultTab || 'Movies');\n    const [customMediaType, setCustomMediaType] = React.useState('comic');")


search_logic = '''            } else if (type === 'Books') {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                const res = await searchGoogleBooks(query, plugin.settings.googleBooksApiKey);'''

search_logic_new = '''            } else if (type === 'Comics & Manga') {
                const res = await searchComicVine(query, plugin.settings.comicVineApiKey);
                setResults(res.results.map((r: ShelfAny) => {
                    const isIssue = r.resource_type === 'issue';
                    const tag = isIssue ? [Issue #] : '[Volume]';
                    const title = r.name || (r.volume && r.volume.name ? ${r.volume.name} # : 'Unknown');
                    
                    // Simple translation/language heuristic (ComicVine usually lists publisher or name variations)
                    // If a volume has multiple languages, it's often in the title like "Attack on Titan (German)"
                    return {
                        title: ${tag} ,
                        coverUrl: r.image && (r.image.medium_url || r.image.super_url || r.image.original_url) || '',
                        releaseDate: r.cover_date || r.start_year || '',
                        externalId: r.id.toString(),
                        overview: r.deck || '',
                        publisher: r.publisher ? r.publisher.name : '',
                        resourceType: r.resource_type,
                        raw: r
                    };
                }));
            } else if (type === 'Books') {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
                const res = await searchGoogleBooks(query, plugin.settings.googleBooksApiKey);'''

content = content.replace(search_logic, search_logic_new)

handle_add_logic = '''            } else if (type === 'Books') {
                if (result.releaseDate) {'''

handle_add_logic_new = '''            } else if (type === 'Comics & Manga') {
                finalMetadata.mediaType = customMediaType;
                const details = await getComicVineDetails(result.externalId, result.resourceType, plugin.settings.comicVineApiKey);
                if (details && details.results) {
                    const r = details.results;
                    if (r.character_credits) finalMetadata.characters = r.character_credits.map((c: any) => c.name);
                    if (r.person_credits) finalMetadata.authors = r.person_credits.map((c: any) => c.name);
                    if (r.publisher) finalMetadata.publisher = r.publisher.name;
                    if (r.issue_number) finalMetadata.issueNumber = r.issue_number;
                    if (r.start_year) finalMetadata.releaseDate = r.start_year;
                    if (r.cover_date) finalMetadata.coverDate = r.cover_date;
                }
                finalMetadata.releaseState = 'Released';
            } else if (type === 'Books') {
                if (result.releaseDate) {'''

content = content.replace(handle_add_logic, handle_add_logic_new)

form_options = '''                            <option value="Movies">Movies</option>
                            <option value="TV">TV Shows</option>
                            <option value="Games">Games</option>
                            <option value="Books">Books</option>
                        </select>'''

form_options_new = '''                            <option value="Movies">Movies</option>
                            <option value="TV">TV Shows</option>
                            <option value="Games">Games</option>
                            <option value="Books">Books</option>
                            <option value="Comics & Manga">Comics & Manga</option>
                        </select>
                        {type === 'Comics & Manga' && (
                            <div style={{ marginTop: '8px' }}>
                                <input 
                                    type="text" 
                                    placeholder="Media Type (e.g., comic, manga)" 
                                    value={customMediaType}
                                    onChange={e => setCustomMediaType(e.target.value)}
                                    title="Custom Media Type for Frontmatter"
                                    style={{ width: '100%', fontSize: '0.9em' }}
                                />
                            </div>
                        )}'''

content = content.replace(form_options, form_options_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
