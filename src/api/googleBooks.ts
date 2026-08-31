import { requestUrl } from 'obsidian';

export async function searchGoogleBooks(query: string, apiKey?: string) {
    let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`;
    if (apiKey) {
        url += `&key=${apiKey}`;
    }
    try {
        const response = await requestUrl(url);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Dynamic API response
        const data = response.json;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access -- Dynamic API response
        return data.items || [];
    } catch (e: ShelfAny) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Dynamic API response
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Dynamic API response
        return response.json;
    } catch (e: ShelfAny) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Dynamic API response
        if (e.status === 429 || (e.message && e.message.includes('429'))) {
            throw new Error("Rate limit exceeded (429). Please add a Google Books API Key in the plugin settings.");
        }
        throw e;
    }
}


