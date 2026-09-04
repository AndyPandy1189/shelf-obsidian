import os

path = 'src/ui/AddMediaModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update externalId mapping in search results
search_block = '''                    return {
                        title: ${title} ,
                        coverUrl: r.image && (r.image.medium_url || r.image.super_url || r.image.original_url) || '',
                        releaseDate: rawDate.length > 10 ? rawDate.substring(0, 10) : rawDate,
                        externalId: r.id.toString(),
                        overview: r.deck || '',
                        publisher: r.publisher ? r.publisher.name : '',
                        resourceType: r.resource_type,
                        raw: r
                    };'''

search_block_new = '''                    const prefixedId = isIssue ? 4000- : 4050-;
                    return {
                        title: ${title} ,
                        coverUrl: r.image && (r.image.medium_url || r.image.super_url || r.image.original_url) || '',
                        releaseDate: rawDate.length > 10 ? rawDate.substring(0, 10) : rawDate,
                        externalId: prefixedId,
                        overview: r.deck || '',
                        publisher: r.publisher ? r.publisher.name : '',
                        resourceType: r.resource_type,
                        raw: r
                    };'''
content = content.replace(search_block, search_block_new)

# 2. Update getComicVineDetails call
call_block = "const details = await getComicVineDetails(result.externalId, result.resourceType, plugin.settings.comicVineApiKey);"
call_block_new = "const details = await getComicVineDetails(result.externalId, plugin.settings.comicVineApiKey);"
content = content.replace(call_block, call_block_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
