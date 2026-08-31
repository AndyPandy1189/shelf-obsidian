import { requestUrl } from 'obsidian';

export async function searchGoogleBooks(query: string, apiKey?: string) {
    let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`;
    if (apiKey) {
        url += `&key=${apiKey}`;
    }
    try {
        const response = await requestUrl(url);
        const data = response.json;
        return data.items || [];
    } catch (e: any) {
        if (e.status === 429 || (e.message && e.message.includes('429'))) {
            throw new Error("Rate limit exceeded (429). Please add a Google Books API Key in the plugin settings.");
        }
        throw e;
    }
}

export async function getGoogleBooksDetails(id: string, apiKey?: string) {
    let url = `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(id)}`;
    if (apiKey) {
        url += `?key=${apiKey}`;
    }
    try {
        const response = await requestUrl(url);
        return response.json;
    } catch (e: any) {
        if (e.status === 429 || (e.message && e.message.includes('429'))) {
            throw new Error("Rate limit exceeded (429). Please add a Google Books API Key in the plugin settings.");
        }
        throw e;
    }
}
