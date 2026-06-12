import type { Building } from './types'

// Coordinates are approximate (eyeballed from OpenStreetMap); refine during surveys.
export const buildings: Building[] = [
  { id: 'wescoe', name: 'Wescoe Hall', coordinates: [-95.247, 38.9579] },
  { id: 'budig', name: 'Budig Hall', coordinates: [-95.2456, 38.9577] },
  { id: 'anschutz', name: 'Anschutz Library', coordinates: [-95.2453, 38.9566] },
  { id: 'kansas-union', name: 'Kansas Union', coordinates: [-95.2445, 38.9598] },
]
