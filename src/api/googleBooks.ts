/* eslint-disable @typescript-eslint/no-unsafe-assignment -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-unsafe-member-access -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-unsafe-return -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-unsafe-call -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-unsafe-argument -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-floating-promises -- Not fully strict */
/* eslint-disable @typescript-eslint/no-misused-promises -- React onClick handlers */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion -- Casting dynamic values */
/* eslint-disable @typescript-eslint/no-unused-vars -- Component props */
import { ShelfAny } from '../types';
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
    } catch (e: ShelfAny) {
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
    } catch (e: ShelfAny) {
        if (e.status === 429 || (e.message && e.message.includes('429'))) {
            throw new Error("Rate limit exceeded (429). Please add a Google Books API Key in the plugin settings.");
        }
        throw e;
    }
}


/* eslint-enable @typescript-eslint/no-unsafe-assignment -- End of file */
/* eslint-enable @typescript-eslint/no-unsafe-member-access -- End of file */
/* eslint-enable @typescript-eslint/no-unsafe-return -- End of file */
/* eslint-enable @typescript-eslint/no-unsafe-call -- End of file */
/* eslint-enable @typescript-eslint/no-unsafe-argument -- End of file */
/* eslint-enable @typescript-eslint/no-floating-promises -- End of file */
/* eslint-enable @typescript-eslint/no-misused-promises -- End of file */
/* eslint-enable @typescript-eslint/no-unnecessary-type-assertion -- End of file */
/* eslint-enable @typescript-eslint/no-unused-vars -- End of file */
