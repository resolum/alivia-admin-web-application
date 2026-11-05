import { districtOf, mapEmbedUrl, mapSearchUrl } from './map-links';

describe('map links', () => {
  it('points Google Maps at the address in Lima and reads its district', () => {
    expect(mapEmbedUrl('Jr. Huiracocha 2050')).toContain('q=Jr.%20Huiracocha%202050%2C%20Lima%2C%20Per%C3%BA&z=16&output=embed');
    expect(mapSearchUrl('Calle Los Pinos 218, Miraflores, Lima')).toContain('query=Calle%20Los%20Pinos%20218%2C%20Miraflores%2C%20Lima%2C%20Per%C3%BA');
    expect(districtOf('Jr. Las Begonias 1325, San Borja, Lima')).toBe('San Borja');
    expect(districtOf('Av. Primavera 1450, Surco')).toBe('Surco');
    expect(districtOf('Av. Primavera 1450')).toBeNull();
    expect(districtOf(null)).toBeNull();
  });
});
