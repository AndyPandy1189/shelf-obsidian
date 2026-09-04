import { requestUrl } from 'obsidian';

export async function searchComicVine(query: string, apiKey: string) {
    if (!apiKey) throw new Error("Comic Vine API Key missing");
    const url = `https://comicvine.gamespot.com/api/search/?api_key=${apiKey}&format=json&resources=volume,issue&query=${encodeURIComponent(query)}`;
    const response = await requestUrl({
        url: url,
        method: 'GET',
        headers: {
            'User-Agent': 'Shelf-Obsidian-Plugin/1.0'
        }
    });
    return response.json;
}

export async function getComicVineDetails(id: string, resourceType: 'volume' | 'issue', apiKey: string) {
    if (!apiKey) return null;
    const resId = resourceType === 'volume' ? `4050-${id}` : `4000-${id}`;
    const url = `https://comicvine.gamespot.com/api/${resourceType}/${resId}/?api_key=${apiKey}&format=json`;
    const response = await requestUrl({
        url: url,
        method: 'GET',
        headers: {
            'User-Agent': 'Shelf-Obsidian-Plugin/1.0'
        }
    });
    return response.json;
}
