/** The address as Google Maps should find it: in Peru, and in Lima when the address does not say so. */
function mapQuery(directions: string): string {
  return encodeURIComponent(/lima/i.test(directions) ? `${directions}, Perú` : `${directions}, Lima, Perú`);
}

/** Google Maps embed of an address, without an API key. */
export const mapEmbedUrl = (directions: string) => `https://maps.google.com/maps?q=${mapQuery(directions)}&z=16&output=embed`;

/** Google Maps search of an address, to open it in a new tab. */
export const mapSearchUrl = (directions: string) => `https://www.google.com/maps/search/?api=1&query=${mapQuery(directions)}`;

/** "Jr. Las Begonias 1325, San Borja, Lima" → "San Borja": the district before the city, when the address has one. */
export function districtOf(directions: string | null): string | null {
  if (!directions) return null;
  const parts = directions.split(',').map(part => part.trim()).filter(Boolean);
  const withoutCity = parts.at(-1)?.toLowerCase() === 'lima' ? parts.slice(0, -1) : parts;
  return withoutCity.length > 1 ? withoutCity.at(-1)! : null;
}
