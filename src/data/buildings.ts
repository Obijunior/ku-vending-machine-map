import type { Building } from './types'

// Coordinates are [longitude, latitude] — careful: Google Maps shows "lat, lng",
// so flip the pair when pasting. (For KU: longitude is the negative ~-95 number.)
export const buildings: Building[] = [
  { id: 'wescoe', name: 'Wescoe Hall', coordinates: [-95.24786613062646, 38.95733354317885] },
  { id: 'budig', name: 'Budig Hall', coordinates: [-95.2456, 38.9577] },
  { id: 'anschutz', name: 'Anschutz Library', coordinates: [-95.2453, 38.9566] },
  { id: 'kansas-union', name: 'Kansas Union', coordinates: [-95.2445, 38.9598] },
]
