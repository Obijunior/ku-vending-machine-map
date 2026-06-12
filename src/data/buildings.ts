import type { Building } from './types'

// Coordinates are [longitude, latitude] — careful: Google Maps shows "lat, lng",
// so flip the pair when pasting. (For KU: longitude is the negative ~-95 number.)
// floors are placeholder counts until verified on-site.
export const buildings: Building[] = [
  { id: 'wescoe', name: 'Wescoe Hall', coordinates: [-95.24786613062646, 38.95733354317885], floors: [1, 2] },
  { id: 'budig', name: 'Budig Hall', coordinates: [-95.24929921731922, 38.957850286251706], floors: [1] },
  { id: 'anschutz', name: 'Anschutz Library', coordinates: [-95.24971408022004, 38.95734348402004], floors: [1, 2, 3] },
  { id: 'kansas-union', name: 'Kansas Union', coordinates: [-95.24343779719167, 38.959518862700925], floors: [1] },
  { id: 'leep2', name: 'LEEP 2', coordinates: [-95.25404363428248, 38.95766529681259], floors: [1] },
  { id: 'learned', name: 'Learned Hall', coordinates: [-95.25413434652411, 38.95820161019933], floors: [1] },
  { id: 'eaton', name: 'Eaton Hall', coordinates: [-95.25268923988038, 38.95760113414408], floors: [1] },
  { id: 'slawson', name: 'Slawson Hall', coordinates: [-95.25178839472429, 38.95756440933736], floors: [1] },
  { id: 'burge-union', name: 'Burge Union', coordinates: [-95.254879089599, 38.95516935200369], floors: [1] },
  { id: 'gray-little', name: 'Gray-Little Hall', coordinates: [-95.25548715495076, 38.95558500179917], floors: [1] },
]
