import { requestUrl } from 'obsidian';

export async function fetchIGDBToken(clientId: string, clientSecret: string): Promise<string> {
    const response = await requestUrl({
        url: `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
        method: 'POST'
    });
    return response.json.access_token;
}

export async function searchIGDB(query: string, clientId: string, accessToken: string) {
    if (!clientId || !accessToken) throw new Error("IGDB credentials missing");
    
    const body = `search "${query}"; fields name, cover.url, first_release_date, slug, summary, rating, genres.name, involved_companies.company.name; limit 10;`;
    
    try {
        const response = await requestUrl({
            url: 'https://api.igdb.com/v4/games',
            method: 'POST',
            contentType: 'text/plain',
            headers: {
                'Client-ID': clientId,
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            },
            body: body
        });
        return response.json;
    } catch (e: any) {
        if (e.status === 401 || (e.message && e.message.includes('401'))) {
            throw new Error("IGDB_401");
        }
        throw e;
    }
}

export async function getIGDBDetails(id: string, clientId: string, accessToken: string) {
    if (!clientId || !accessToken) throw new Error("IGDB credentials missing");
    const body = `where id = ${id}; fields name, cover.url, first_release_date, slug, summary, rating, genres.name, involved_companies.company.name, status; limit 1;`;
    try {
        const response = await requestUrl({
            url: 'https://api.igdb.com/v4/games',
            method: 'POST',
            contentType: 'text/plain',
            headers: {
                'Client-ID': clientId,
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            },
            body: body
        });
        return response.json[0];
    } catch (e: any) {
        if (e.status === 401 || (e.message && e.message.includes('401'))) {
            throw new Error("IGDB_401");
        }
        throw e;
    }
}
