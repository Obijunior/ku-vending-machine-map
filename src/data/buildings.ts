import type { Building } from './types'

// Coordinates are [longitude, latitude] — careful: Google Maps shows "lat, lng",
// so flip the pair when pasting. (For KU: longitude is the negative ~-95 number.)
// Floor placeholders are replaced by official KU GIS levels when the indoor view loads.
export const buildings: Building[] = [
  { id: 'wescoe', name: 'Wescoe Hall', coordinates: [-95.24786613062646, 38.95733354317885], gisLocationId: '132', floors: [1, 2] },
  { id: 'budig', name: 'Budig Hall', coordinates: [-95.24929921731922, 38.957850286251706], gisLocationId: '039', floors: [1] },
  { id: 'anschutz', name: 'Anschutz Library', coordinates: [-95.24971408022004, 38.95734348402004], gisLocationId: '179', floors: [1, 2, 3, 4] },
  { id: 'kansas-union', name: 'Kansas Union', coordinates: [-95.24343779719167, 38.959518862700925], gisLocationId: '002', floors: [1] },
  // KU publishes this connected complex as one M2SEC/LEEP2/SPAHR floor-plan record.
  { id: 'leep2', name: 'LEEP 2', coordinates: [-95.25404363428248, 38.95766529681259], gisLocationId: '228', floors: [1] },
  { id: 'learned', name: 'Learned Hall', coordinates: [-95.25413434652411, 38.95820161019933], gisLocationId: '088', floors: [1] },
  { id: 'eaton', name: 'Eaton Hall', coordinates: [-95.25268923988038, 38.95760113414408], gisLocationId: '204', floors: [1] },
  { id: 'slawson', name: 'Slawson Hall', coordinates: [-95.25178839472429, 38.95756440933736], gisLocationId: '244', floors: [1] },
  { id: 'burge-union', name: 'Burge Union', coordinates: [-95.254879089599, 38.95516935200369], gisLocationId: '250A', floors: [1] },
  { id: 'gray-little', name: 'Gray-Little Hall', coordinates: [-95.25548715495076, 38.95558500179917], gisLocationId: '250', floors: [1] },
  { id: 'ambler-rec', name: 'Ambler Student Recreation Fitness Center', coordinates: [-95.2479293, 38.9525116], gisLocationId: '205', floors: [1] },
  { id: 'cap-fed', name: 'Capitol Federal Hall', coordinates: [-95.24999, 38.953835], gisLocationId: '234', floors: [1, 2, 3, 4] },
  // Added for campus walking routes. Coordinates are area-weighted centroids of
  // the KU GIS layer-1 building polygons; floors are the numeric levels present
  // in KU GIS layer 4 (the actual floor-plan polygons), which include basements
  // and half-floor tiers that layer 1's FLOORS count omits.
  { id: 'strong', name: 'Strong Hall', coordinates: [-95.24766582391422, 38.95849928371121], gisLocationId: '037', floors: [-2, -1, 1, 2, 3, 4] },
  { id: 'watson', name: 'Watson Library', coordinates: [-95.2446860263515, 38.95655738075595], gisLocationId: '022', floors: [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] },
  { id: 'fraser', name: 'Fraser Hall', coordinates: [-95.2434096036477, 38.957085530513005], gisLocationId: '097', floors: [-1, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
  { id: 'snow', name: 'Snow Hall', coordinates: [-95.24939021618306, 38.958955818989054], gisLocationId: '040', floors: [-1, 1, 2, 3, 4, 5, 6, 7] },
  { id: 'green', name: 'Green Hall', coordinates: [-95.25410951699165, 38.95648117518576], gisLocationId: '150', floors: [-1, 1, 2, 3, 4, 5, 6] },
  { id: 'debruce', name: 'DeBruce Center', coordinates: [-95.25211736948692, 38.95509550856511], gisLocationId: '240', floors: [1, 2, 3, 4] },
]
