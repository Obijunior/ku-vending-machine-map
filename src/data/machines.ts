import type { VendingMachine } from './types'

// Inventory is placeholder data until each machine is surveyed in person.
export const machines: VendingMachine[] = [
  {
    id: 'wescoe-2-snack',
    buildingId: 'wescoe',
    type: 'snack',
    floor: 2,
    locationNote: 'Main hallway, by the elevators',
    lastUpdated: '2026-06-11',
    slots: [
      { code: 'A1', item: 'Snickers', priceCents: 175 },
      { code: 'A2', item: 'Oreos', priceCents: 150 },
      { code: 'A3', item: 'Pretzels', priceCents: 125 },
      { code: 'B1', item: "Lay's Classic", priceCents: 150 },
      { code: 'B2', item: 'Hot Cheetos', priceCents: 175 },
      { code: 'B3', item: 'Cheez-It', priceCents: 150 },
    ],
  },
  {
    id: 'wescoe-2-drink',
    buildingId: 'wescoe',
    type: 'drink',
    brand: 'Pepsi',
    floor: 2,
    locationNote: 'Main hallway, by the elevators',
    lastUpdated: '2026-06-11',
    slots: [
      { code: '1', item: 'Pepsi', priceCents: 200 },
      { code: '2', item: 'Diet Pepsi', priceCents: 200 },
      { code: '3', item: 'Mountain Dew', priceCents: 200 },
      { code: '4', item: 'Aquafina Water', priceCents: 150 },
    ],
  },
  {
    id: 'budig-1-combo',
    buildingId: 'budig',
    type: 'combo',
    floor: 1,
    locationNote: 'Lobby outside the lecture halls',
    lastUpdated: '2026-06-11',
    slots: [
      { code: 'A1', item: 'Doritos Nacho', priceCents: 150 },
      { code: 'A2', item: 'Pop-Tarts', priceCents: 175 },
      { code: 'C1', item: 'Coca-Cola', priceCents: 200 },
      { code: 'C2', item: 'Sprite', priceCents: 200 },
    ],
  },
  {
    id: 'anschutz-1-drink',
    buildingId: 'anschutz',
    type: 'drink',
    brand: 'Coca-Cola',
    floor: 1,
    locationNote: 'Entry level, near the study commons',
    lastUpdated: '2026-06-11',
    slots: [
      { code: '1', item: 'Coca-Cola', priceCents: 200 },
      { code: '2', item: 'Sprite', priceCents: 200 },
      { code: '3', item: 'Dasani Water', priceCents: 150 },
    ],
  },
  {
    id: 'anschutz-3-snack',
    buildingId: 'anschutz',
    type: 'snack',
    floor: 3,
    locationNote: 'Third floor study area',
    lastUpdated: '2026-06-11',
    slots: [], // not surveyed yet — exercises the "inventory not surveyed" UI
  },
  {
    id: 'kansas-union-1-drink',
    buildingId: 'kansas-union',
    type: 'drink',
    brand: 'Pepsi',
    floor: 1,
    locationNote: 'Ground floor, by the bowling alley',
    lastUpdated: '2026-06-11',
    slots: [
      { code: '1', item: 'Pepsi', priceCents: 225 },
      { code: '2', item: 'Gatorade Cool Blue', priceCents: 250 },
      { code: '3', item: 'Starbucks Frappuccino', priceCents: 350 },
    ],
  },
  {
    id: 'leep2-1-snack',
    buildingId: 'leep2',
    type: 'snack',
    floor: 1,
    locationNote: 'Area by Burns-Mac lounge',
    lastUpdated: '2026-06-11',
    slots: [], // not surveyed yet — exercises the "inventory not surveyed" UI
  },
  {
    id: 'leep2-2-drink',
    buildingId: 'leep2',
    type: 'drink',
    floor: 1,
    locationNote: 'Area by Burns-Mac lounge',
    lastUpdated: '2026-06-11',
    slots: [], // not surveyed yet — exercises the "inventory not surveyed" UI
  },
  {
    id: 'leep2-3-snack',
    buildingId: 'leep2',
    type: 'snack',
    floor: 1,
    locationNote: 'Area by Burns-Mac lounge',
    lastUpdated: '2026-06-11',
    slots: [], // not surveyed yet — exercises the "inventory not surveyed" UI
  },
]
