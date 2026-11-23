import type { City } from '../../types';

/**
 * Singapore: 38 places from Tuas to Changi and Sentosa to Sembawang. Marina Bay is the hub (id BOB).
 * Real coordinates through the fisheye in ./projection; `nudge` (map units) spaces out the few that still
 * crowd. `special` = the island's best-known sights.
 */
export const CITIES: City[] = [
  { id: 'BOB', name: 'Marina Bay', lon: 103.8605, lat: 1.283, label: 'b', hub: true, banner: [44, 70] },
  { id: 'GBB', name: 'Gardens by the Bay', lon: 103.871, lat: 1.287, label: 'r', special: true, nudge: [22, 8] },
  { id: 'CTN', name: 'Chinatown', lon: 103.844, lat: 1.283, label: 'l', special: true },
  { id: 'LIN', name: 'Little India', lon: 103.851, lat: 1.307, label: 'tl', special: true },
  { id: 'ORC', name: 'Orchard Road', lon: 103.832, lat: 1.3045, label: 'b' },
  { id: 'BTG', name: 'Botanic Gardens', lon: 103.8155, lat: 1.315, label: 't', special: true, nudge: [-6, -28] },
  { id: 'KAL', name: 'National Stadium', lon: 103.8745, lat: 1.304, label: 'b' },
  { id: 'GEY', name: 'Geylang', lon: 103.898, lat: 1.318, label: 'l' },
  { id: 'ECP', name: 'East Coast Park', lon: 103.915, lat: 1.301, label: 'r' },
  { id: 'BDK', name: 'Bedok', lon: 103.9295, lat: 1.3245, label: 'tl', nudge: [15, 5] },
  { id: 'TAM', name: 'Tampines', lon: 103.945, lat: 1.353, label: 'tl' },
  { id: 'PSR', name: 'Pasir Ris', lon: 103.952, lat: 1.381, label: 'bl' },
  { id: 'CHG', name: 'Changi Airport', lon: 103.989, lat: 1.356, label: 'r', special: true },
  { id: 'CVL', name: 'Changi Village', lon: 103.988, lat: 1.39, label: 'r' },
  { id: 'UBN', name: 'Pulau Ubin', lon: 103.96, lat: 1.41, label: 't', special: true },
  { id: 'PGL', name: 'Punggol', lon: 103.904, lat: 1.412, label: 't' },
  { id: 'SKG', name: 'Sengkang', lon: 103.894, lat: 1.389, label: 'l' },
  { id: 'SLT', name: 'Seletar', lon: 103.866, lat: 1.414, label: 'l' },
  { id: 'AMK', name: 'Ang Mo Kio', lon: 103.846, lat: 1.37, label: 'l', nudge: [-5, -15] },
  { id: 'SRG', name: 'Serangoon', lon: 103.873, lat: 1.35, label: 'b' },
  { id: 'TPY', name: 'Toa Payoh', lon: 103.848, lat: 1.334, label: 'bl' },
  { id: 'MCR', name: 'MacRitchie', lon: 103.818, lat: 1.35, label: 'tl' },
  { id: 'BTM', name: 'Bukit Timah', lon: 103.776, lat: 1.354, label: 'bl' },
  { id: 'MND', name: 'Singapore Zoo', lon: 103.792, lat: 1.404, label: 'tl', special: true },
  { id: 'SBW', name: 'Sembawang', lon: 103.825, lat: 1.455, label: 't' },
  { id: 'WDL', name: 'Woodlands', lon: 103.786, lat: 1.437, label: 'bl' },
  { id: 'SBL', name: 'Sungei Buloh', lon: 103.728, lat: 1.446, label: 't' },
  { id: 'LCK', name: 'Lim Chu Kang', lon: 103.705, lat: 1.418, label: 'l' },
  { id: 'CCK', name: 'Choa Chu Kang', lon: 103.745, lat: 1.385, label: 'l' },
  { id: 'JLG', name: 'Jurong Lake Gardens', lon: 103.729, lat: 1.339, label: 'bl', special: true },
  { id: 'NTU', name: 'Boon Lay', lon: 103.683, lat: 1.346, label: 'tl' },
  { id: 'TUA', name: 'Tuas', lon: 103.64, lat: 1.325, label: 'l' },
  { id: 'JIS', name: 'Jurong Island', lon: 103.712, lat: 1.282, label: 'b' },
  { id: 'CLM', name: 'Clementi', lon: 103.765, lat: 1.315, label: 'l', nudge: [-15, 5] },
  { id: 'HLV', name: 'Holland Village', lon: 103.796, lat: 1.311, label: 'bl', nudge: [-15, 10] },
  { id: 'HPV', name: 'Haw Par Villa', lon: 103.782, lat: 1.283, label: 'r', special: true },
  { id: 'HBF', name: 'HarbourFront', lon: 103.822, lat: 1.265, label: 'l', nudge: [-10, -5] },
  { id: 'SEN', name: 'Sentosa', lon: 103.827, lat: 1.249, label: 'b', special: true, nudge: [0, 10] },
];
