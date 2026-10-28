import { requestUrl } from 'obsidian';
import { ShelfAny } from '../types';

const setDetailsCache: Record<string, ShelfAny> = {};
let allSetsCache: ShelfAny[] | null = null;

export function formatTcgdexImageUrl(baseUrl?: string, quality: 'high' | 'low' = 'high', ext: 'webp' | 'png' = 'webp'): string {
    if (!baseUrl) return '';
    if (/\.(png|jpg|jpeg|webp)$/i.test(baseUrl)) return baseUrl;
    return `${baseUrl.replace(/\/$/, '')}/${quality}.${ext}`;
}

export function formatTcgdexLogoUrl(baseUrl?: string, ext: 'png' | 'webp' = 'png'): string {
    if (!baseUrl) return '';
    if (/\.(png|jpg|jpeg|webp)$/i.test(baseUrl)) return baseUrl;
    return `${baseUrl}.${ext}`;
}

export async function getPokemonSets(): Promise<ShelfAny[]> {
    if (allSetsCache && allSetsCache.length > 0) {
        return allSetsCache;
    }
    const response = await requestUrl({
        url: 'https://api.tcgdex.net/v2/en/sets',
        method: 'GET',
    });
    const data = response.json;
    if (Array.isArray(data)) {
        allSetsCache = data;
        return data;
    }
    return [];
}

export async function getPokemonSetDetails(setId: string): Promise<ShelfAny | null> {
    if (!setId) return null;
    if (setDetailsCache[setId]) {
        return setDetailsCache[setId];
    }
    try {
        const response = await requestUrl({
            url: `https://api.tcgdex.net/v2/en/sets/${encodeURIComponent(setId)}`,
            method: 'GET',
        });
        const data = response.json;
        if (data && data.id) {
            setDetailsCache[setId] = data;
        }
        return data;
    } catch (e) {
        console.error(`Failed to fetch TCGdex set ${setId}:`, e);
        return null;
    }
}

export function wildcardMatch(text: string, pattern: string): boolean {
    const cleanPattern = pattern.trim();
    if (!cleanPattern || cleanPattern === '*') return true;
    if (!cleanPattern.includes('*')) {
        return text.toLowerCase().includes(cleanPattern.toLowerCase());
    }
    const escaped = cleanPattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    const regex = new RegExp(`^${escaped}$`, 'i');
    const partialRegex = new RegExp(escaped, 'i');
    return regex.test(text) || partialRegex.test(text);
}

export async function searchPokemonCards(query: string, setId?: string): Promise<ShelfAny[]> {
    const trimmed = query.trim();
    if (setId) {
        // When a collectionSet is configured, pull the set details and filter its cards directly
        // This guarantees fast limiting to the exact set and supports wildcard (*) or number searches
        const setDetails: ShelfAny = await getPokemonSetDetails(setId);
        if (setDetails && Array.isArray(setDetails.cards)) {
            const setReleaseDate = setDetails.releaseDate || '';
            const totalCardsInSet = setDetails.cardCount?.total || setDetails.cardCount?.official;
            const officialCardsInSet = setDetails.cardCount?.official || setDetails.cardCount?.total;
            const filtered = setDetails.cards.filter((c: ShelfAny) => {
                if (!trimmed || trimmed === '*') return true;
                const nameMatch = wildcardMatch(String(c.name || ''), trimmed);
                const idMatch = wildcardMatch(String(c.localId || ''), trimmed) || wildcardMatch(String(c.id || ''), trimmed);
                return nameMatch || idMatch;
            });
            return filtered.map((c: ShelfAny) => ({
                id: c.id,
                localId: c.localId,
                name: c.name,
                image: formatTcgdexImageUrl(c.image, 'high', 'webp'),
                releaseDate: setReleaseDate,
                setId: setDetails.id,
                setName: setDetails.name,
                totalCardsInSet,
                officialCardsInSet,
                raw: c
            }));
        }
    }

    // General database search across all sets
    const cleanQuery = trimmed.replace(/\*/g, '').trim();
    const url = cleanQuery
        ? `https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(cleanQuery)}`
        : `https://api.tcgdex.net/v2/en/cards`;

    const response = await requestUrl({
        url,
        method: 'GET',
    });
    const list = Array.isArray(response.json) ? response.json : [];
    const filteredList = trimmed.includes('*')
        ? list.filter((c: ShelfAny) => wildcardMatch(String(c.name || ''), trimmed))
        : list;

    return filteredList.slice(0, 100).map((c: ShelfAny) => ({
        id: c.id,
        localId: c.localId,
        name: c.name,
        image: formatTcgdexImageUrl(c.image, 'high', 'webp'),
        releaseDate: '',
        setId: c.id ? String(c.id).split('-')[0] : '',
        raw: c
    }));
}

export function extractUsdPrice(card: ShelfAny): number | null {
    const tcgp = card?.pricing?.tcgplayer;
    if (!tcgp || typeof tcgp !== 'object') return null;

    // Check nested prices object if present, or top-level variant keys on tcgplayer
    const container = tcgp.prices && typeof tcgp.prices === 'object' ? tcgp.prices : tcgp;
    const priorityKeys = [
        'normal',
        'holofoil',
        'reverse-holofoil',
        'reverseHolofoil',
        '1st-edition-holofoil',
        '1st-edition',
        'unlimited-holofoil',
        'unlimited'
    ];

    for (const key of priorityKeys) {
        const v = container[key];
        if (v && typeof v === 'object') {
            const price = v.marketPrice ?? v.market ?? v.midPrice ?? v.mid ?? v.lowPrice ?? v.low;
            if (typeof price === 'number' && !isNaN(price)) {
                return Number(price.toFixed(2));
            }
        }
    }

    // Fallback: inspect any other variant object key
    for (const [k, v] of Object.entries(container)) {
        if (k === 'unit' || k === 'updated' || k === 'url' || !v || typeof v !== 'object') continue;
        const variantObj = v as ShelfAny;
        const price = variantObj.marketPrice ?? variantObj.market ?? variantObj.midPrice ?? variantObj.mid ?? variantObj.lowPrice ?? variantObj.low;
        if (typeof price === 'number' && !isNaN(price)) {
            return Number(price.toFixed(2));
        }
    }

    return null;
}

export const VARIANT_KEY_ORDER = [
    'variantNormal',
    'variantHolo',
    'variantReverse',
    'variantPokeball',
    'variantMasterball',
    'variantFirstEdition',
    'variantWPromo',
];

export function toVariantPropertyName(tcgdexVariantKey: string): string {
    if (!tcgdexVariantKey) return '';
    return `variant${tcgdexVariantKey.charAt(0).toUpperCase()}${tcgdexVariantKey.slice(1)}`;
}

export function formatVariantLabel(propName: string): string {
    switch (propName) {
        case 'variantNormal': return 'Normal';
        case 'variantHolo': return 'Holo';
        case 'variantReverse': return 'Reverse';
        case 'variantPokeball': return 'Poké Ball';
        case 'variantMasterball': return 'Master Ball';
        case 'variantFirstEdition': return '1st Edition';
        case 'variantWPromo': return 'W Promo';
        default: {
            const raw = propName.replace(/^variant/, '');
            return raw.replace(/([A-Z])/g, ' $1').trim() || propName;
        }
    }
}

export function extractApplicableVariants(card: ShelfAny): Record<string, number> {
    const result: Record<string, number> = {};
    const variantsObj = card?.variants;
    if (variantsObj && typeof variantsObj === 'object') {
        const orderedRawKeys = ['normal', 'holo', 'reverse', 'firstEdition', 'wPromo'];
        for (const k of orderedRawKeys) {
            if (variantsObj[k] === true) {
                result[toVariantPropertyName(k)] = 0;
            }
        }
        for (const [k, v] of Object.entries(variantsObj)) {
            if (v === true) {
                const prop = toVariantPropertyName(k);
                if (!(prop in result)) {
                    result[prop] = 0;
                }
            }
        }
    }

    const detailed: ShelfAny[] = Array.isArray(card?.variants_detailed) ? card.variants_detailed : [];
    for (const d of detailed) {
        if (d?.foil === 'pokeball') {
            result['variantPokeball'] = 0;
        } else if (d?.foil === 'masterball') {
            result['variantMasterball'] = 0;
        }
    }

    return result;
}

function extractPriceFromEntry(entry: ShelfAny): number | null {
    if (!entry || typeof entry !== 'object') return null;
    const price = entry.marketPrice ?? entry.market ?? entry.midPrice ?? entry.mid ?? entry.lowPrice ?? entry.low;
    if (typeof price === 'number' && !isNaN(price)) {
        return Number(price.toFixed(2));
    }
    return null;
}

export function extractVariantValues(card: ShelfAny, applicableVariants?: Record<string, number>): Record<string, number> {
    const vars = applicableVariants || extractApplicableVariants(card);
    const values: Record<string, number> = {};
    const tcgpRaw = card?.pricing?.tcgplayer;
    const tcgp = tcgpRaw && typeof tcgpRaw === 'object'
        ? (tcgpRaw.prices && typeof tcgpRaw.prices === 'object' ? tcgpRaw.prices : tcgpRaw)
        : {};
    const cm = card?.pricing?.cardmarket && typeof card.pricing.cardmarket === 'object'
        ? card.pricing.cardmarket
        : {};
    const detailed: ShelfAny[] = Array.isArray(card?.variants_detailed) ? card.variants_detailed : [];

    for (const vKey of Object.keys(vars)) {
        const valueProp = `${vKey}Value`;
        let val: number | null = null;

        if (vKey === 'variantNormal') {
            val = extractPriceFromEntry(tcgp['normal']) ?? extractPriceFromEntry(tcgp['unlimited']);
            if (val === null) {
                for (const d of detailed) {
                    if (d?.type === 'normal' && !(Array.isArray(d?.stamp) && d.stamp.includes('1st-edition'))) {
                        const dTcgp = d?.pricing?.tcgplayer;
                        val = extractPriceFromEntry(dTcgp?.normal) ?? extractPriceFromEntry(dTcgp?.unlimited);
                        if (val !== null) break;
                    }
                }
            }
            if (val === null) {
                const cmVal = cm.trend ?? cm.avg;
                if (typeof cmVal === 'number' && !isNaN(cmVal)) val = Number(cmVal.toFixed(2));
            }
        } else if (vKey === 'variantHolo') {
            val = extractPriceFromEntry(tcgp['holofoil']) ?? extractPriceFromEntry(tcgp['unlimited-holofoil']);
            if (val === null) {
                for (const d of detailed) {
                    if (d?.type === 'holo' && d?.size !== 'jumbo' && !(Array.isArray(d?.stamp) && d.stamp.includes('1st-edition'))) {
                        const dTcgp = d?.pricing?.tcgplayer;
                        val = extractPriceFromEntry(dTcgp?.holofoil) ?? extractPriceFromEntry(dTcgp?.['unlimited-holofoil']);
                        if (val !== null) break;
                    }
                }
            }
            if (val === null) {
                for (const d of detailed) {
                    if (d?.type === 'holo' && d?.size !== 'jumbo' && !(Array.isArray(d?.stamp) && d.stamp.includes('1st-edition'))) {
                        const dCm = d?.pricing?.cardmarket;
                        const cmVal = dCm?.trend ?? dCm?.avg;
                        if (typeof cmVal === 'number' && !isNaN(cmVal)) {
                            val = Number(cmVal.toFixed(2));
                            break;
                        }
                    }
                }
            }
            if (val === null) {
                const cmVal = cm['trend-holo'] ?? cm['avg-holo'] ?? cm.trend ?? cm.avg;
                if (typeof cmVal === 'number' && !isNaN(cmVal)) val = Number(cmVal.toFixed(2));
            }
        } else if (vKey === 'variantReverse') {
            val = extractPriceFromEntry(tcgp['reverse-holofoil']) ?? extractPriceFromEntry(tcgp['reverseHolofoil']);
            if (val === null) {
                for (const d of detailed) {
                    if (d?.type === 'reverse' && !d?.foil) {
                        const dTcgp = d?.pricing?.tcgplayer;
                        val = extractPriceFromEntry(dTcgp?.['reverse-holofoil']) ?? extractPriceFromEntry(dTcgp?.reverseHolofoil);
                        if (val !== null) break;
                    }
                }
            }
            if (val === null) {
                const cmVal = cm['trend-holo'] ?? cm['avg-holo'];
                if (typeof cmVal === 'number' && !isNaN(cmVal)) val = Number(cmVal.toFixed(2));
            }
        } else if (vKey === 'variantPokeball' || vKey === 'variantMasterball') {
            const targetFoil = vKey === 'variantPokeball' ? 'pokeball' : 'masterball';
            for (const d of detailed) {
                if (d?.foil === targetFoil) {
                    const dTcgp = d?.pricing?.tcgplayer;
                    val =
                        extractPriceFromEntry(dTcgp?.holofoil) ??
                        extractPriceFromEntry(dTcgp?.['reverse-holofoil']) ??
                        extractPriceFromEntry(dTcgp?.reverseHolofoil) ??
                        extractPriceFromEntry(dTcgp?.normal);
                    if (val === null) {
                        const dCm = d?.pricing?.cardmarket;
                        const cmVal = dCm?.['trend-holo'] ?? dCm?.['avg-holo'] ?? dCm?.trend ?? dCm?.avg;
                        if (typeof cmVal === 'number' && !isNaN(cmVal)) {
                            val = Number(cmVal.toFixed(2));
                        }
                    }
                    if (val !== null) break;
                }
            }
        } else if (vKey === 'variantFirstEdition') {
            val =
                extractPriceFromEntry(tcgp['1st-edition-holofoil']) ??
                extractPriceFromEntry(tcgp['1st-edition']) ??
                extractPriceFromEntry(tcgp['1stEditionHolofoil']) ??
                extractPriceFromEntry(tcgp['1stEdition']);
            if (val === null) {
                for (const d of detailed) {
                    if (Array.isArray(d?.stamp) && d.stamp.includes('1st-edition')) {
                        const dTcgp = d?.pricing?.tcgplayer;
                        val =
                            extractPriceFromEntry(dTcgp?.['1st-edition-holofoil']) ??
                            extractPriceFromEntry(dTcgp?.['1st-edition']);
                        if (val === null) {
                            const dCm = d?.pricing?.cardmarket;
                            const cmVal = dCm?.trend ?? dCm?.avg;
                            if (typeof cmVal === 'number' && !isNaN(cmVal)) val = Number(cmVal.toFixed(2));
                        }
                        if (val !== null) break;
                    }
                }
            }
        } else {
            val = extractUsdPrice(card);
        }

        values[valueProp] = val !== null ? val : 0;
    }

    return values;
}

export function calculateFrontmatterVariantsValue(fm: Record<string, ShelfAny>): number {
    if (!fm || typeof fm !== 'object') return 0;
    let sum = 0;
    for (const [k, v] of Object.entries(fm)) {
        if (k.startsWith('variant') && !k.endsWith('Value') && k.length > 7) {
            const count = typeof v === 'number' ? v : parseInt(String(v), 10);
            const qty = isNaN(count) ? 0 : Math.max(0, count);
            const rawUnit = fm[`${k}Value`];
            const unitVal = typeof rawUnit === 'number' ? rawUnit : parseFloat(String(rawUnit ?? '0'));
            if (qty > 0 && !isNaN(unitVal)) {
                sum += qty * unitVal;
            }
        }
    }
    return Number(sum.toFixed(2));
}

export function calculateFrontmatterTotalVariantCount(fm: Record<string, ShelfAny>): number {
    if (!fm || typeof fm !== 'object') return 0;
    let totalCount = 0;
    for (const [k, v] of Object.entries(fm)) {
        if (k.startsWith('variant') && !k.endsWith('Value') && k.length > 7) {
            const count = typeof v === 'number' ? v : parseInt(String(v), 10);
            const qty = isNaN(count) ? 0 : Math.max(0, count);
            totalCount += qty;
        }
    }
    return totalCount;
}

export async function getPokemonCardDetails(cardId: string): Promise<{
    card: ShelfAny;
    releaseDate: string;
    releaseState: 'Released' | 'Upcoming';
    coverUrl: string;
    currentValue: number | null;
    variants: Record<string, number>;
    variantValues: Record<string, number>;
    markdownBody: string;
} | null> {
    if (!cardId) return null;
    const response = await requestUrl({
        url: `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(cardId)}`,
        method: 'GET',
    });
    const card: ShelfAny = response.json;
    if (!card || !card.id) return null;

    let releaseDate = card.set?.releaseDate || '';
    if (!releaseDate && card.set?.id) {
        const setInfo = await getPokemonSetDetails(card.set.id);
        if (setInfo && setInfo.releaseDate) {
            releaseDate = setInfo.releaseDate;
        }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    // Calculate if release >= Today (Upcoming if strictly in the future, or Released)
    const releaseState: 'Released' | 'Upcoming' = (releaseDate && releaseDate > todayStr) ? 'Upcoming' : 'Released';
    const coverUrl = formatTcgdexImageUrl(card.image, 'high', 'webp');
    const variants = extractApplicableVariants(card);
    const variantValues = extractVariantValues(card, variants);
    const currentValue = 0;
    const markdownBody = buildPokemonCardMarkdownBody(card, releaseDate, coverUrl, variants, variantValues);

    return {
        card,
        releaseDate,
        releaseState,
        coverUrl,
        currentValue,
        variants,
        variantValues,
        markdownBody
    };
}

export function buildPokemonCardMarkdownBody(
    card: ShelfAny,
    releaseDate: string,
    coverUrl: string,
    variants?: Record<string, number>,
    variantValues?: Record<string, number>
): string {
    const lines: string[] = [];

    if (coverUrl) {
        lines.push(`![${card.name || 'Card Image'}|300](${coverUrl})`);
        lines.push('');
    }

    lines.push('## Card Data Sheet');
    lines.push('');
    lines.push('| Field | Value |');
    lines.push('| :--- | :--- |');
    lines.push(`| **Name** | ${card.name || 'Unknown'} |`);
    lines.push(`| **Card ID** | \`${card.id || ''}\` |`);
    if (card.localId) {
        const total = card.set?.cardCount?.official || card.set?.cardCount?.total;
        lines.push(`| **Card Number** | ${card.localId}${total ? ` / ${total}` : ''} |`);
    }
    if (card.set?.name) {
        lines.push(`| **Set** | ${card.set.name} (\`${card.set.id || ''}\`) |`);
    }
    if (releaseDate) {
        lines.push(`| **Release Date** | ${releaseDate} |`);
    }
    if (card.category) {
        lines.push(`| **Category** | ${card.category} |`);
    }
    if (card.rarity) {
        lines.push(`| **Rarity** | ${card.rarity} |`);
    }
    if (card.illustrator) {
        lines.push(`| **Illustrator** | ${card.illustrator} |`);
    }
    if (card.hp !== undefined) {
        lines.push(`| **HP** | ${card.hp} |`);
    }
    if (Array.isArray(card.types) && card.types.length > 0) {
        lines.push(`| **Types** | ${card.types.join(', ')} |`);
    }
    if (card.stage) {
        lines.push(`| **Stage** | ${card.stage} |`);
    }
    if (card.evolveFrom) {
        lines.push(`| **Evolves From** | ${card.evolveFrom} |`);
    }
    if (card.retreat !== undefined) {
        lines.push(`| **Retreat Cost** | ${card.retreat} |`);
    }
    if (card.regulationMark) {
        lines.push(`| **Regulation Mark** | ${card.regulationMark} |`);
    }
    if (variants && variantValues) {
        for (const vKey of Object.keys(variants)) {
            const unitVal = variantValues[`${vKey}Value`];
            if (typeof unitVal === 'number') {
                lines.push(`| **${formatVariantLabel(vKey)} Value** | $${unitVal.toFixed(2)} |`);
            }
        }
    }

    if (card.description) {
        lines.push('');
        lines.push(`> ${card.description}`);
    }

    if (Array.isArray(card.abilities) && card.abilities.length > 0) {
        lines.push('');
        lines.push('### Abilities');
        for (const ab of card.abilities) {
            lines.push(`- **${ab.name || 'Ability'}** (${ab.type || 'Ability'}): ${ab.effect || ''}`);
        }
    }

    if (Array.isArray(card.attacks) && card.attacks.length > 0) {
        lines.push('');
        lines.push('### Attacks');
        lines.push('| Cost | Attack | Damage | Effect |');
        lines.push('| :--- | :--- | :--- | :--- |');
        for (const atk of card.attacks) {
            const costStr = Array.isArray(atk.cost) ? atk.cost.join(', ') : 'None';
            const dmgStr = atk.damage !== undefined ? String(atk.damage) : '-';
            const effectStr = atk.effect ? String(atk.effect).replace(/\n/g, ' ') : '-';
            lines.push(`| ${costStr} | **${atk.name || ''}** | ${dmgStr} | ${effectStr} |`);
        }
    }

    if ((Array.isArray(card.weaknesses) && card.weaknesses.length > 0) || (Array.isArray(card.resistances) && card.resistances.length > 0)) {
        lines.push('');
        lines.push('### Weaknesses & Resistances');
        if (Array.isArray(card.weaknesses)) {
            for (const w of card.weaknesses) {
                lines.push(`- **Weakness**: ${w.type} (${w.value || ''})`);
            }
        }
        if (Array.isArray(card.resistances)) {
            for (const r of card.resistances) {
                lines.push(`- **Resistance**: ${r.type} (${r.value || ''})`);
            }
        }
    }

    return lines.join('\n') + '\n';
}
