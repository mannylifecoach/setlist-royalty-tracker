// Google Places (New) API client — Text Search + addressComponents parser.
// API docs: https://developers.google.com/maps/documentation/places/web-service/text-search
//
// Requires GOOGLE_PLACES_API_KEY env var. Free tier: ~10k Text Search/month.

const PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

interface AddressComponent {
  longText: string;
  shortText: string;
  types: string[];
}

interface Place {
  displayName?: { text: string };
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
  types?: string[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
}

export interface VenueEnrichment {
  found: boolean;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  venueTypeCode?: string;
  venueTypeLabel?: string;
  googleTypes?: string[];
}

// BMI Live "Create a new venue" modal Type dropdown options (captured 2026-04-24)
const BMI_VENUE_TYPES: Record<string, string> = {
  '1': 'Club / Bar / Restaurant',
  '2': 'Theatre / Symphony Hall',
  '3': 'Arena / Stadium',
  '4': 'Hotel / Casino',
  '5': 'Festival Grounds',
  '6': 'City Park',
  '7': 'Coffee Shop',
  '8': 'Amusement Park',
  '9': 'Aquarium / Zoo',
  '10': 'College / University / School',
  '11': 'Convention Center / Exhibit Hall',
  '12': 'Museum / Art Galleries',
  '13': 'Shopping Center / Malls',
  '14': 'Retail Store / Department Stores',
  '15': 'Church',
  '17': 'TV Station',
  '18': 'Radio Station',
  '19': 'State or County Fair',
  '20': 'Private House Concert',
};

// Map Google Places "types" array to BMI venue type code. First match wins.
// Defaults to '1' (Club / Bar / Restaurant) for unrecognized music venues.
const GOOGLE_TO_BMI: Record<string, string> = {
  // Performance halls
  concert_hall: '2',
  performing_arts_theater: '2',
  opera_house: '2',
  music_venue: '2',
  // Stadiums / arenas
  stadium: '3',
  arena: '3',
  sports_complex: '3',
  // Bars / restaurants / clubs
  night_club: '1',
  bar: '1',
  restaurant: '1',
  cafe: '1',
  pub: '1',
  // Hotels / casinos
  lodging: '4',
  hotel: '4',
  casino: '4',
  resort_hotel: '4',
  // Convention
  convention_center: '11',
  // Parks
  park: '6',
  national_park: '6',
  // Coffee
  coffee_shop: '7',
  // Schools
  university: '10',
  college: '10',
  school: '10',
  primary_school: '10',
  secondary_school: '10',
  // Amusement
  amusement_park: '8',
  // Zoo / aquarium
  zoo: '9',
  aquarium: '9',
  // Museums
  museum: '12',
  art_gallery: '12',
  // Shopping
  shopping_mall: '13',
  // Retail
  store: '14',
  department_store: '14',
  // Religious
  church: '15',
  place_of_worship: '15',
  hindu_temple: '15',
  mosque: '15',
  synagogue: '15',
};

function mapGoogleTypeToBmi(types: string[] | undefined): { code: string; label: string } {
  if (!types) return { code: '1', label: BMI_VENUE_TYPES['1'] };
  for (const t of types) {
    const code = GOOGLE_TO_BMI[t];
    if (code) return { code, label: BMI_VENUE_TYPES[code] };
  }
  return { code: '1', label: BMI_VENUE_TYPES['1'] };
}

function getComponent(components: AddressComponent[] | undefined, type: string, useShort = false): string | undefined {
  if (!components) return undefined;
  const c = components.find((x) => x.types?.includes(type));
  if (!c) return undefined;
  return useShort ? c.shortText : c.longText;
}

function buildStreetAddress(components: AddressComponent[] | undefined): string | undefined {
  if (!components) return undefined;
  const num = getComponent(components, 'street_number');
  const route = getComponent(components, 'route');
  if (num && route) return `${num} ${route}`;
  return route;
}

export async function lookupVenue(
  name: string,
  state?: string | null,
  city?: string | null
): Promise<VenueEnrichment> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return { found: false };
  }

  // Build text query from name + city + state for best disambiguation.
  // Google's Text Search handles this natural form well.
  const query = [name, city, state].filter(Boolean).join(', ');

  const res = await fetch(PLACES_TEXT_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.displayName,places.formattedAddress,places.addressComponents,places.types,places.nationalPhoneNumber,places.internationalPhoneNumber',
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });

  if (!res.ok) {
    return { found: false };
  }

  const data = (await res.json()) as { places?: Place[] };
  const place = data.places?.[0];
  if (!place) return { found: false };

  const components = place.addressComponents;
  const { code, label } = mapGoogleTypeToBmi(place.types);

  return {
    found: true,
    address: buildStreetAddress(components),
    city: getComponent(components, 'locality'),
    state: getComponent(components, 'administrative_area_level_1', true),
    zip: getComponent(components, 'postal_code'),
    phone: place.nationalPhoneNumber,
    venueTypeCode: code,
    venueTypeLabel: label,
    googleTypes: place.types,
  };
}
