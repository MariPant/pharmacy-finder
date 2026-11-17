import { divIcon } from 'leaflet';

// Teardrop pin, 34×42 viewBox, tip at (17, 41).
const PIN_PATH = 'M17 41S3 28.4 3 17.5a14 14 0 0 1 28 0C31 28.4 17 41 17 41z';
const CROSS_PATH = 'M14.5 10.5h5v5h5v5h-5v5h-5v-5h-5v-5h5z';

function pinSvg(width: number, height: number, bodyClass: string, inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 34 42"><path class="${bodyClass}" d="${PIN_PATH}"/>${inner}</svg>`;
}

function pharmacyPin(width: number, height: number, selected: boolean) {
  return divIcon({
    className: selected ? 'pharmacy-pin pharmacy-pin--selected' : 'pharmacy-pin',
    html: pinSvg(width, height, 'pharmacy-pin__body', `<path d="${CROSS_PATH}" fill="#fff"/>`),
    iconSize: [width, height],
    iconAnchor: [width / 2, height - 1],
    popupAnchor: [0, -height + 6],
  });
}

export const pharmacyIcon = pharmacyPin(32, 40, false);
export const selectedPharmacyIcon = pharmacyPin(42, 52, true);

export const searchPointIcon = divIcon({
  className: 'search-point-pin',
  html: pinSvg(30, 37, 'search-point-pin__body', '<circle cx="17" cy="17.5" r="5" fill="#fff"/>'),
  iconSize: [30, 37],
  iconAnchor: [15, 36],
  popupAnchor: [0, -32],
});
