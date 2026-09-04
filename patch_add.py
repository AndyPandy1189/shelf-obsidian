import os

path = 'src/ui/AddMediaModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Timestamp & Title in AddMediaModal
# 1. Release date parse (just slice first 10 chars if it's a timestamp like 2021-03-24 00:00:00)
# 2. Title formatting (Attack on Titan [Volume])
target_search = '''                    const tag = isIssue ? [Issue #] : '[Volume]';
                    const title = r.name || (r.volume && r.volume.name ? ${r.volume.name} # : 'Unknown');
                    
                    // Simple translation/language heuristic (ComicVine usually lists publisher or name variations)
                    // If a volume has multiple languages, it's often in the title like "Attack on Titan (German)"
                    return {
                        title: ${tag} ,
                        coverUrl: r.image && (r.image.medium_url || r.image.super_url || r.image.original_url) || '',
                        releaseDate: r.cover_date || r.start_year || '','''

target_replace = '''                    const tag = isIssue ? [Issue #] : '[Volume]';
                    const title = r.name || (r.volume && r.volume.name ? ${r.volume.name} # : 'Unknown');
                    const rawDate = r.cover_date || r.start_year || '';
                    
                    // Simple translation/language heuristic (ComicVine usually lists publisher or name variations)
                    // If a volume has multiple languages, it's often in the title like "Attack on Titan (German)"
                    return {
                        title: ${title} ,
                        coverUrl: r.image && (r.image.medium_url || r.image.super_url || r.image.original_url) || '',
                        releaseDate: rawDate.length > 10 ? rawDate.substring(0, 10) : rawDate,'''

content = content.replace(target_search, target_replace)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
