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

export async function getComicVineDetails(id: string, apiKey: string) {
    if (!apiKey) return null;
    let endpoint = 'volume';
    if (id.startsWith('4000-')) endpoint = 'issue';
    
    const url = `https://comicvine.gamespot.com/api/${endpoint}/${id}/?api_key=${apiKey}&format=json`;
    const response = await requestUrl({
        url: url,
        method: 'GET',
        headers: {
            'User-Agent': 'Shelf-Obsidian-Plugin/1.0'
        }
    });
    return response.json;
}
