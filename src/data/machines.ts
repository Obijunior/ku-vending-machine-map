import type { VendingMachine } from './types'

// Inventory is placeholder data until each machine is surveyed in person.
export const machines: VendingMachine[] = [
  {
    id: 'wescoe-2-snack',
    buildingId: 'wescoe',
    type: 'snack',
    floor: 2,
    locationNote: '',
    lastUpdated: '2026-06-11',
    slots: [
      { code: '0', item: 'None', priceCents: 0 },
    ],
  },
  {
    id: 'wescoe-2-drink',
    buildingId: 'wescoe',
    type: 'drink',
    floor: 2,
    locationNote: '',
    lastUpdated: '2026-06-11',
    slots: [
      { code: '0', item: 'None', priceCents: 0 },
    ],
  },
  {
    id: 'budig-1-combo',
    buildingId: 'budig',
    type: 'combo',
    floor: 1,
    locationNote: '',
    lastUpdated: '2026-06-11',
    slots: [
      { code: '0', item: 'None', priceCents: 0 },
    ],
  },
  {
    id: 'anschutz-1-drink',
    buildingId: 'anschutz',
    type: 'drink',
    floor: 1,
    locationNote: 'Entry level, near the study commons',
    lastUpdated: '2026-06-11',
    slots: [
      { code: '0', item: 'None', priceCents: 0 },
    ],
  },
  {
    id: 'anschutz-3-snack',
    buildingId: 'anschutz',
    type: 'snack',
    floor: 3,
    locationNote: 'Third floor, near the east windows, by the FitDesks and study room 305', // sourced: lib.ku.edu/locations/anschutz
    lastUpdated: '2026-07-22',
    slots: [], 
  },
  {
    id: 'kansas-union-1-drink',
    buildingId: 'kansas-union',
    type: 'drink',
    floor: 1,
    locationNote: '',
    lastUpdated: '2026-06-11',
    slots: [
      { code: '0', item: 'None', priceCents: 0 },
    ],
  },
  {
    id: 'leep2-1-snack',
    buildingId: 'leep2',
    type: 'snack',
    floor: 1,
    locationNote: 'Area by Burns-Mac lounge',
    lastUpdated: '2026-06-11',
    slots: [], 
  },
  {
    id: 'leep2-2-drink',
    buildingId: 'leep2',
    type: 'drink',
    floor: 1,
    locationNote: 'Area by Burns-Mac lounge',
    lastUpdated: '2026-06-11',
    slots: [], 
  },
  {
    id: 'leep2-3-snack',
    buildingId: 'leep2',
    type: 'snack',
    floor: 1,
    locationNote: 'Area by Burns-Mac lounge',
    lastUpdated: '2026-06-11',
    slots: [], 
  },
  {
    id: 'ambler-rec-1-combo',
    buildingId: 'ambler-rec',
    type: 'combo',
    floor: 1,
    locationNote: '',
    lastUpdated: '2026-07-22',
    slots: [], 
  },
]
