import { env } from '../config/env';

export interface Suggestion {
  label: string;
  latitude: number;
  longitude: number;
  source: 'google' | 'nominatim';
}

interface GoogleResult {
  formatted_address: string;
  geometry?: { location?: { lat?: number; lng?: number } };
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

const mapGoogleResult = (item: GoogleResult): Suggestion | null => {
  const lat = item.geometry?.location?.lat;
  const lng = item.geometry?.location?.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === undefined || lng === undefined) {
    return null;
  }
  return { label: item.formatted_address, latitude: lat, longitude: lng, source: 'google' };
};

const mapNominatimResult = (item: NominatimResult): Suggestion | null => {
  const lat = Number(item.lat);
  const lon = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { label: item.display_name, latitude: lat, longitude: lon, source: 'nominatim' };
};

const buildQueryVariants = (query: string): string[] => {
  const base = String(query || '').trim();
  if (!base) return [];

  const withoutHouseNumber = base.replace(/^\s*\d+[a-zA-Z-]*\s+/, '').trim();
  const alajoVariant = base.replace(/aladjo/gi, 'alajo');

  const variants = [
    base,
    withoutHouseNumber,
    alajoVariant,
    `${base}, Accra, Ghana`,
    `${withoutHouseNumber || base}, Accra, Ghana`,
    `${alajoVariant}, Accra, Ghana`,
    `${base}, Ghana`,
  ];

  return [...new Set(variants.filter(Boolean))];
};

const fetchGoogleSuggestions = async (query: string, limit: number): Promise<Suggestion[]> => {
  if (!env.GOOGLE_API_KEY) return [];

  for (const variant of buildQueryVariants(query)) {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?address=${encodeURIComponent(variant)}&components=country:GH&key=${env.GOOGLE_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) continue;

    const data = (await response.json()) as { results?: GoogleResult[] };
    if (!Array.isArray(data.results)) continue;

    const mapped = data.results
      .slice(0, limit)
      .map(mapGoogleResult)
      .filter((r): r is Suggestion => r !== null);

    if (mapped.length) return mapped;
  }

  return [];
};

const fetchNominatimSuggestions = async (query: string, limit: number): Promise<Suggestion[]> => {
  const urls = buildQueryVariants(query).flatMap((variant) => [
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(variant)}&limit=${limit}&addressdetails=1&countrycodes=gh`,
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(variant)}&limit=${limit}&addressdetails=1`,
  ]);

  for (const url of urls) {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'emergency-response-system/2.0' },
    });
    if (!response.ok) continue;

    const data = (await response.json()) as NominatimResult[];
    if (!Array.isArray(data)) continue;

    const mapped = data
      .map(mapNominatimResult)
      .filter((r): r is Suggestion => r !== null);

    if (mapped.length) return mapped;
  }

  return [];
};

export async function suggestAddresses(query: string, limit = 5): Promise<Suggestion[]> {
  if (query.trim().length < 3) return [];

  let suggestions: Suggestion[] = [];
  if (env.GOOGLE_API_KEY) {
    suggestions = await fetchGoogleSuggestions(query, limit);
  }
  if (!suggestions.length) {
    suggestions = await fetchNominatimSuggestions(query, limit);
  }

  return suggestions;
}

export async function resolveAddress(query: string): Promise<Suggestion | null> {
  if (query.trim().length < 3) return null;

  let suggestions = await suggestAddresses(query, 1);
  return suggestions[0] ?? null;
}