import type { AppErrorKind } from '../types/errors';

export const LANGUAGES = ['en', 'fi'] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', fi: 'Suomi' };

type ErrorKey = `error_${AppErrorKind}`;

// `satisfies` makes the compiler reject a missing error message for any AppErrorKind.
const en = {
  appName: 'Pharmacy Finder',
  appTagline: 'Find the nearest pharmacy',
  languageLabel: 'Language',

  locationYourLocation: 'Your location',
  locationSearchArea: 'Search area',
  locationNotSet: 'Location not set',
  locationNotSetHint: 'Use your location or search for an address',
  locationLocating: 'Determining your location…',
  locationResolving: 'Looking up the address…',
  locationAccuracy: 'Accuracy ±{meters} m',

  actionUseMyLocation: 'Use my location',
  actionUpdateLocation: 'Update location',
  actionRefreshResults: 'Refresh results',
  actionRetry: 'Try again',
  actionShowOnMap: 'Show on map',
  actionDirectionsVia: 'Directions to {name} in {provider}',

  searchLabel: 'Address or city',
  searchPlaceholder: 'Search by address or city',
  searchSubmit: 'Search',

  resultsTitle: 'Nearby pharmacies',
  resultsCount_one: '{count} pharmacy within {radius}',
  resultsCount_other: '{count} pharmacies within {radius}',
  resultsUpdated: 'Updated {time}',
  resultsSearching: 'Searching for pharmacies…',

  welcomeTitle: 'Find a pharmacy near you',
  welcomeBody: 'Allow location access to see the nearest pharmacies, or search by address or city.',
  emptyTitle: 'No pharmacies found',
  emptyBody: 'OpenStreetMap has no pharmacies within {radius} of this point. Try another address.',
  offlineBanner: "You're offline. Results can't be updated until the connection is restored.",

  pharmacyUnnamed: 'Unnamed pharmacy',
  pharmacyNoAddress: 'Address not available',
  pharmacyAddress: 'Address',
  pharmacyCoordinates: 'Coordinates',
  pharmacyOpeningHours: 'Opening hours',
  pharmacyPhone: 'Phone',
  pharmacyDistance: 'Distance',

  mapLabel: 'Map of nearby pharmacies',
  mapYouAreHere: 'You are here',
  mapSearchPoint: 'Search point',
  dataAttribution: 'Pharmacy and map data © OpenStreetMap contributors',

  errorTitle: 'Something went wrong',
  errorFatalBody: 'The app ran into an unexpected problem. Reload the page to continue.',
  errorReload: 'Reload',

  'error_geolocation-unsupported':
    "Your browser doesn't support geolocation. Search by address or city instead.",
  'error_permission-denied':
    'Location access is blocked. Allow it in your browser settings or search by address.',
  'error_position-unavailable':
    "Your location couldn't be determined. Try again or search by address.",
  'error_location-timeout': 'Determining your location took too long. Please try again.',
  error_offline: 'No internet connection. Check your connection and try again.',
  error_network: "Couldn't reach the server. Check your connection and try again.",
  error_timeout: 'The pharmacy service is responding slowly. Try again in a moment.',
  'error_rate-limited': 'Too many requests to the map service. Wait a moment and try again.',
  error_server: 'The map service is temporarily unavailable. Please try again later.',
  'error_invalid-response': 'The map service returned unexpected data. Please try again later.',
  'error_address-not-found': "We couldn't find that place. Check the spelling or try a city name.",
  error_unknown: 'Something unexpected happened. Please try again.',
} satisfies Record<ErrorKey, string> & Record<string, string>;

export type TranslationKey = keyof typeof en;
export type Translations = Record<TranslationKey, string>;

const fi: Translations = {
  appName: 'Apteekkihaku',
  appTagline: 'Löydä lähin apteekki',
  languageLabel: 'Kieli',

  locationYourLocation: 'Sijaintisi',
  locationSearchArea: 'Hakualue',
  locationNotSet: 'Sijaintia ei ole asetettu',
  locationNotSetHint: 'Käytä sijaintiasi tai hae osoitteella',
  locationLocating: 'Määritetään sijaintiasi…',
  locationResolving: 'Haetaan osoitetta…',
  locationAccuracy: 'Tarkkuus ±{meters} m',

  actionUseMyLocation: 'Käytä sijaintiani',
  actionUpdateLocation: 'Päivitä sijainti',
  actionRefreshResults: 'Päivitä tulokset',
  actionRetry: 'Yritä uudelleen',
  actionShowOnMap: 'Näytä kartalla',
  actionDirectionsVia: 'Reittiohjeet kohteeseen {name}: {provider}',

  searchLabel: 'Osoite tai kaupunki',
  searchPlaceholder: 'Hae osoitteella tai kaupungilla',
  searchSubmit: 'Hae',

  resultsTitle: 'Lähimmät apteekit',
  resultsCount_one: '{count} apteekki {radius} säteellä',
  resultsCount_other: '{count} apteekkia {radius} säteellä',
  resultsUpdated: 'Päivitetty {time}',
  resultsSearching: 'Haetaan apteekkeja…',

  welcomeTitle: 'Löydä apteekki läheltäsi',
  welcomeBody:
    'Salli sijainnin käyttö nähdäksesi lähimmät apteekit tai hae osoitteella tai kaupungilla.',
  emptyTitle: 'Apteekkeja ei löytynyt',
  emptyBody:
    'OpenStreetMapissa ei ole apteekkeja {radius} säteellä tästä pisteestä. Kokeile toista osoitetta.',
  offlineBanner: 'Ei verkkoyhteyttä. Tuloksia ei voi päivittää ennen kuin yhteys palautuu.',

  pharmacyUnnamed: 'Nimetön apteekki',
  pharmacyNoAddress: 'Osoite ei saatavilla',
  pharmacyAddress: 'Osoite',
  pharmacyCoordinates: 'Koordinaatit',
  pharmacyOpeningHours: 'Aukioloajat',
  pharmacyPhone: 'Puhelin',
  pharmacyDistance: 'Etäisyys',

  mapLabel: 'Kartta lähimmistä apteekeista',
  mapYouAreHere: 'Olet tässä',
  mapSearchPoint: 'Hakupiste',
  dataAttribution: 'Apteekki- ja karttatiedot © OpenStreetMapin tekijät',

  errorTitle: 'Jokin meni vikaan',
  errorFatalBody: 'Sovelluksessa tapahtui odottamaton virhe. Lataa sivu uudelleen jatkaaksesi.',
  errorReload: 'Lataa uudelleen',

  'error_geolocation-unsupported': 'Selaimesi ei tue paikannusta. Hae osoitteella tai kaupungilla.',
  'error_permission-denied':
    'Sijainnin käyttö on estetty. Salli se selaimen asetuksista tai hae osoitteella.',
  'error_position-unavailable':
    'Sijaintiasi ei voitu määrittää. Yritä uudelleen tai hae osoitteella.',
  'error_location-timeout': 'Sijainnin määrittäminen kesti liian kauan. Yritä uudelleen.',
  error_offline: 'Ei internetyhteyttä. Tarkista yhteys ja yritä uudelleen.',
  error_network: 'Palvelimeen ei saatu yhteyttä. Tarkista yhteys ja yritä uudelleen.',
  error_timeout: 'Apteekkipalvelu vastaa hitaasti. Yritä hetken kuluttua uudelleen.',
  'error_rate-limited': 'Liikaa pyyntöjä karttapalveluun. Odota hetki ja yritä uudelleen.',
  error_server: 'Karttapalvelu ei ole tilapäisesti käytettävissä. Yritä myöhemmin uudelleen.',
  'error_invalid-response':
    'Karttapalvelu palautti odottamatonta dataa. Yritä myöhemmin uudelleen.',
  'error_address-not-found':
    'Paikkaa ei löytynyt. Tarkista kirjoitusasu tai kokeile kaupungin nimeä.',
  error_unknown: 'Tapahtui odottamaton virhe. Yritä uudelleen.',
};

export const translations: Record<Language, Translations> = { en, fi };

export const PLURAL_KEYS = {
  resultsCount: { one: 'resultsCount_one', other: 'resultsCount_other' },
} as const satisfies Record<string, { one: TranslationKey; other: TranslationKey }>;

export type PluralKey = keyof typeof PLURAL_KEYS;

export function errorKey(kind: AppErrorKind): ErrorKey {
  return `error_${kind}`;
}

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function detectLanguage(candidates: readonly string[]): Language {
  for (const candidate of candidates) {
    const base = candidate.toLowerCase().split('-')[0];
    const match = LANGUAGES.find((language) => language === base);
    if (match) return match;
  }
  return 'en';
}
