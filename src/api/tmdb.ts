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
