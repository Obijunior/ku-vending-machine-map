import type { Building } from './types'

// Coordinates are [longitude, latitude] — careful: Google Maps shows "lat, lng",
// so flip the pair when pasting. (For KU: longitude is the negative ~-95 number.)
export const buildings: Building[] = [
  { id: 'wescoe', name: 'Wescoe Hall', coordinates: [-95.24786613062646, 38.95733354317885] },
  { id: 'budig', name: 'Budig Hall', coordinates: [-95.24929921731922, 38.957850286251706] },
  { id: 'anschutz', name: 'Anschutz Library', coordinates: [-95.24971408022004, 38.95734348402004] },
  { id: 'kansas-union', name: 'Kansas Union', coordinates: [-95.24343779719167, 38.959518862700925] },
  { id: 'leep2', name: 'LEEP 2', coordinates: [-95.25404363428248, 38.95766529681259] },
  { id: 'learned', name: 'Learned Hall', coordinates: [-95.25413434652411, 38.95820161019933] },
  { id: 'eaton', name: 'Eaton Hall', coordinates: [-95.25268923988038, 38.95760113414408] },
  { id: 'slawson', name: 'Slawson Hall', coordinates: [-95.25178839472429, 38.95756440933736] },
  { id: 'burge-union', name: 'Burge Union', coordinates: [-95.254879089599, 38.95516935200369] },
  { id: 'gray-little', name: 'Gray-Little Hall', coordinates: [-95.25548715495076, 38.95558500179917] },
]
