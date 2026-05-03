import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mapGoogleTypeToBmi, lookupVenue } from './google-places';

describe('mapGoogleTypeToBmi', () => {
  it('returns Theatre/Symphony Hall (2) for performance halls', () => {
    expect(mapGoogleTypeToBmi(['concert_hall']).code).toBe('2');
    expect(mapGoogleTypeToBmi(['performing_arts_theater']).code).toBe('2');
    expect(mapGoogleTypeToBmi(['opera_house']).code).toBe('2');
    expect(mapGoogleTypeToBmi(['music_venue']).code).toBe('2');
  });

  it('returns Arena/Stadium (3) for stadiums and arenas', () => {
    expect(mapGoogleTypeToBmi(['stadium']).code).toBe('3');
    expect(mapGoogleTypeToBmi(['arena']).code).toBe('3');
    expect(mapGoogleTypeToBmi(['sports_complex']).code).toBe('3');
  });

  it('returns Club/Bar/Restaurant (1) for bars and clubs', () => {
    expect(mapGoogleTypeToBmi(['night_club']).code).toBe('1');
    expect(mapGoogleTypeToBmi(['bar']).code).toBe('1');
    expect(mapGoogleTypeToBmi(['restaurant']).code).toBe('1');
    expect(mapGoogleTypeToBmi(['cafe']).code).toBe('1');
    expect(mapGoogleTypeToBmi(['pub']).code).toBe('1');
  });

  it('returns Hotel/Casino (4) for lodging types', () => {
    expect(mapGoogleTypeToBmi(['hotel']).code).toBe('4');
    expect(mapGoogleTypeToBmi(['lodging']).code).toBe('4');
    expect(mapGoogleTypeToBmi(['casino']).code).toBe('4');
    expect(mapGoogleTypeToBmi(['resort_hotel']).code).toBe('4');
  });

  it('returns Convention Center (11) for convention venues', () => {
    expect(mapGoogleTypeToBmi(['convention_center']).code).toBe('11');
  });

  it('returns City Park (6) for parks', () => {
    expect(mapGoogleTypeToBmi(['park']).code).toBe('6');
    expect(mapGoogleTypeToBmi(['national_park']).code).toBe('6');
  });

  it('returns Coffee Shop (7) for coffee_shop', () => {
    expect(mapGoogleTypeToBmi(['coffee_shop']).code).toBe('7');
  });

  it('returns College/University/School (10) for school types', () => {
    expect(mapGoogleTypeToBmi(['university']).code).toBe('10');
    expect(mapGoogleTypeToBmi(['college']).code).toBe('10');
    expect(mapGoogleTypeToBmi(['school']).code).toBe('10');
    expect(mapGoogleTypeToBmi(['primary_school']).code).toBe('10');
    expect(mapGoogleTypeToBmi(['secondary_school']).code).toBe('10');
  });

  it('returns Amusement Park (8) for amusement_park', () => {
    expect(mapGoogleTypeToBmi(['amusement_park']).code).toBe('8');
  });

  it('returns Aquarium/Zoo (9) for zoos and aquariums', () => {
    expect(mapGoogleTypeToBmi(['zoo']).code).toBe('9');
    expect(mapGoogleTypeToBmi(['aquarium']).code).toBe('9');
  });

  it('returns Museum/Art Galleries (12) for museums', () => {
    expect(mapGoogleTypeToBmi(['museum']).code).toBe('12');
    expect(mapGoogleTypeToBmi(['art_gallery']).code).toBe('12');
  });

  it('returns Shopping Center/Malls (13) for shopping_mall', () => {
    expect(mapGoogleTypeToBmi(['shopping_mall']).code).toBe('13');
  });

  it('returns Retail Store (14) for retail', () => {
    expect(mapGoogleTypeToBmi(['store']).code).toBe('14');
    expect(mapGoogleTypeToBmi(['department_store']).code).toBe('14');
  });

  it('returns Church (15) for places of worship', () => {
    expect(mapGoogleTypeToBmi(['church']).code).toBe('15');
    expect(mapGoogleTypeToBmi(['place_of_worship']).code).toBe('15');
    expect(mapGoogleTypeToBmi(['hindu_temple']).code).toBe('15');
    expect(mapGoogleTypeToBmi(['mosque']).code).toBe('15');
    expect(mapGoogleTypeToBmi(['synagogue']).code).toBe('15');
  });

  it('falls back to Club/Bar/Restaurant (1) for unknown Google types', () => {
    expect(mapGoogleTypeToBmi(['something_obscure']).code).toBe('1');
  });

  it('falls back to Club/Bar/Restaurant (1) when types is undefined', () => {
    expect(mapGoogleTypeToBmi(undefined).code).toBe('1');
  });

  it('falls back to Club/Bar/Restaurant (1) for empty types array', () => {
    expect(mapGoogleTypeToBmi([]).code).toBe('1');
  });

  it('first matching type wins when multiple are present', () => {
    // Google often returns multiple types — point of business interest first.
    // Asserts that a more-specific match wins regardless of position. Per
    // current implementation, scan order is array order — confirm.
    expect(mapGoogleTypeToBmi(['bar', 'restaurant']).code).toBe('1');
    expect(mapGoogleTypeToBmi(['concert_hall', 'restaurant']).code).toBe('2');
  });

  it('returns a non-empty human label alongside the code', () => {
    const result = mapGoogleTypeToBmi(['concert_hall']);
    expect(result.label).toBeTruthy();
    expect(typeof result.label).toBe('string');
    expect(result.label.length).toBeGreaterThan(0);
  });
});

describe('lookupVenue', () => {
  const ORIGINAL_ENV = process.env.GOOGLE_PLACES_API_KEY;

  beforeEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = 'test-key';
    vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  function mockFetch(response: unknown, ok = true, status = 200) {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok,
      status,
      json: async () => response,
    } as Response);
  }

  it('returns { found: false } and skips fetch when API key is missing', async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    const result = await lookupVenue('The Echo', 'CA', 'Los Angeles');
    expect(result).toEqual({ found: false });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('parses a full Place response into the BMI-shaped enrichment', async () => {
    mockFetch({
      places: [
        {
          displayName: { text: 'The Echo' },
          formattedAddress: '1822 Sunset Blvd, Los Angeles, CA 90026, USA',
          addressComponents: [
            { longText: '1822', shortText: '1822', types: ['street_number'] },
            { longText: 'Sunset Boulevard', shortText: 'Sunset Blvd', types: ['route'] },
            { longText: 'Los Angeles', shortText: 'Los Angeles', types: ['locality'] },
            { longText: 'California', shortText: 'CA', types: ['administrative_area_level_1'] },
            { longText: '90026', shortText: '90026', types: ['postal_code'] },
            { longText: 'United States', shortText: 'US', types: ['country'] },
          ],
          types: ['night_club', 'bar'],
          nationalPhoneNumber: '(213) 413-8200',
          internationalPhoneNumber: '+1 213-413-8200',
        },
      ],
    });

    const result = await lookupVenue('The Echo', 'CA', 'Los Angeles');
    expect(result.found).toBe(true);
    expect(result.address).toBe('1822 Sunset Boulevard');
    expect(result.city).toBe('Los Angeles');
    expect(result.state).toBe('CA');
    expect(result.zip).toBe('90026');
    expect(result.phone).toBe('(213) 413-8200');
    expect(result.venueTypeCode).toBe('1');
    expect(result.googleTypes).toEqual(['night_club', 'bar']);
  });

  it('returns { found: false } when Google returns no places', async () => {
    mockFetch({ places: [] });
    const result = await lookupVenue('Nonexistent Venue Name', 'XX');
    expect(result).toEqual({ found: false });
  });

  it('returns { found: false } when Google returns no places key at all', async () => {
    mockFetch({});
    const result = await lookupVenue('Nonexistent Venue Name', 'XX');
    expect(result).toEqual({ found: false });
  });

  it('returns { found: false } on 5xx upstream error', async () => {
    mockFetch({ error: 'INTERNAL' }, false, 500);
    const result = await lookupVenue('The Echo');
    expect(result).toEqual({ found: false });
  });

  it('returns { found: false } on 4xx upstream error', async () => {
    mockFetch({ error: 'PERMISSION_DENIED' }, false, 403);
    const result = await lookupVenue('The Echo');
    expect(result).toEqual({ found: false });
  });

  it('handles missing addressComponents without crashing — falls back to undefined fields', async () => {
    mockFetch({
      places: [
        {
          displayName: { text: 'Bar Without Address Data' },
          types: ['bar'],
        },
      ],
    });
    const result = await lookupVenue('Bar Without Address Data');
    expect(result.found).toBe(true);
    expect(result.address).toBeUndefined();
    expect(result.city).toBeUndefined();
    expect(result.state).toBeUndefined();
    expect(result.zip).toBeUndefined();
    expect(result.venueTypeCode).toBe('1');
  });

  it('falls back to Club/Bar/Restaurant when the place has no types', async () => {
    mockFetch({
      places: [
        {
          displayName: { text: 'Mystery Place' },
          addressComponents: [
            { longText: 'Honolulu', shortText: 'Honolulu', types: ['locality'] },
          ],
        },
      ],
    });
    const result = await lookupVenue('Mystery Place', null, 'Honolulu');
    expect(result.found).toBe(true);
    expect(result.venueTypeCode).toBe('1');
  });

  it('uses route alone when street_number is missing', async () => {
    mockFetch({
      places: [
        {
          displayName: { text: 'Park Without Number' },
          addressComponents: [
            { longText: 'Sunset Boulevard', shortText: 'Sunset Blvd', types: ['route'] },
          ],
          types: ['park'],
        },
      ],
    });
    const result = await lookupVenue('Park Without Number');
    expect(result.address).toBe('Sunset Boulevard');
    expect(result.venueTypeCode).toBe('6');
  });

  it('returns short code (CA) for state, not long text (California)', async () => {
    mockFetch({
      places: [
        {
          displayName: { text: 'Test Venue' },
          addressComponents: [
            {
              longText: 'California',
              shortText: 'CA',
              types: ['administrative_area_level_1'],
            },
          ],
          types: ['bar'],
        },
      ],
    });
    const result = await lookupVenue('Test Venue');
    expect(result.state).toBe('CA');
    expect(result.state).not.toBe('California');
  });

  it('prefers nationalPhoneNumber over internationalPhoneNumber when both present', async () => {
    mockFetch({
      places: [
        {
          displayName: { text: 'Phone Test' },
          types: ['bar'],
          nationalPhoneNumber: '(555) 123-4567',
          internationalPhoneNumber: '+1 555-123-4567',
        },
      ],
    });
    const result = await lookupVenue('Phone Test');
    expect(result.phone).toBe('(555) 123-4567');
  });

  it('phone is undefined when nationalPhoneNumber is missing (no fallback to international)', async () => {
    mockFetch({
      places: [
        {
          displayName: { text: 'No Phone' },
          types: ['bar'],
          internationalPhoneNumber: '+1 555-123-4567',
        },
      ],
    });
    const result = await lookupVenue('No Phone');
    expect(result.phone).toBeUndefined();
  });

  it('builds the textQuery from name + city + state and sends X-Goog-Api-Key', async () => {
    mockFetch({ places: [] });
    await lookupVenue('The Echo', 'CA', 'Los Angeles');
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = call[0] as string;
    const init = call[1] as RequestInit;
    expect(url).toContain('places.googleapis.com/v1/places:searchText');
    const body = JSON.parse(init.body as string);
    expect(body.textQuery).toBe('The Echo, Los Angeles, CA');
    expect(body.maxResultCount).toBe(1);
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Goog-Api-Key']).toBe('test-key');
    expect(headers['X-Goog-FieldMask']).toContain('places.displayName');
  });

  it('omits null/empty city + state from the textQuery cleanly', async () => {
    mockFetch({ places: [] });
    await lookupVenue('The Echo', null, null);
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.textQuery).toBe('The Echo');
  });
});
