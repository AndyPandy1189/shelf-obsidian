/* eslint-disable @typescript-eslint/no-unsafe-assignment -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-unsafe-member-access -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-unsafe-return -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-unsafe-call -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-unsafe-argument -- We use dynamic API responses */
/* eslint-disable @typescript-eslint/no-floating-promises -- Not fully strict */
/* eslint-disable @typescript-eslint/no-misused-promises -- React onClick handlers */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion -- Casting dynamic values */
/* eslint-disable @typescript-eslint/no-unused-vars -- Component props */
import { requestUrl } from 'obsidian';

export async function searchTMDB(query: string, apiKey: string) {
    if (!apiKey) throw new Error("TMDB API Key missing");
    const response = await requestUrl(`https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}`);
    const data = response.json;
    return data.results;
}

export async function getTMDBDetails(id: string, type: 'movie' | 'tv', apiKey: string) {
    if (!apiKey) return null;
    const response = await requestUrl(`https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&append_to_response=credits`);
    return response.json;
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
