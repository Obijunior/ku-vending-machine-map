import { describe, expect, it } from 'vitest'
import { groupItemHits, search } from './search'
import type { Building, VendingMachine } from '../data/types'

// Fixtures, not the real data files: this suite tests matching logic, and
// must not break every time a machine is actually surveyed.
const testBuildings: Building[] = [
  { id: 'wescoe', name: 'Wescoe Hall', coordinates: [-95.2478, 38.9573], floors: [1, 2] },
  { id: 'kansas-union', name: 'Kansas Union', coordinates: [-95.2434, 38.9595], floors: [1] },
]

const testMachines: VendingMachine[] = [
  {
    id: 'wescoe-2-snack',
    buildingId: 'wescoe',
    type: 'snack',
    floor: 2,
    locationNote: '',
    lastUpdated: '2026-06-11',
    slots: [{ code: 'B2', item: 'Hot Cheetos', priceCents: 175 }],
  },
  {
    id: 'wescoe-2-drink',
    buildingId: 'wescoe',
    type: 'drink',
    floor: 2,
    locationNote: '',
    lastUpdated: '2026-06-11',
    slots: [{ code: '1', item: 'Pepsi', priceCents: 200 }],
  },
  {
    id: 'kansas-union-1-drink',
    buildingId: 'kansas-union',
    type: 'drink',
    floor: 1,
    locationNote: '',
    lastUpdated: '2026-06-11',
    slots: [{ code: '1', item: 'Pepsi', priceCents: 225 }],
  },
]

describe('search', () => {
  it('returns all buildings and no items for an empty query', () => {
    const results = search('', testBuildings, testMachines)
    expect(results.buildings).toEqual(testBuildings)
    expect(results.items).toEqual([])
  })

  it('treats whitespace-only queries as empty', () => {
    const results = search('   ', testBuildings, testMachines)
    expect(results.buildings).toEqual(testBuildings)
    expect(results.items).toEqual([])
  })

  it('matches building names case-insensitively', () => {
    const results = search('WESCOE', testBuildings, testMachines)
    expect(results.buildings.map((b) => b.id)).toEqual(['wescoe'])
  })

  it('matches slot items with full context', () => {
    const results = search('hot cheetos', testBuildings, testMachines)
    expect(results.buildings).toEqual([])
    expect(results.items).toHaveLength(1)
    const hit = results.items[0]
    expect(hit.slot.code).toBe('B2')
    expect(hit.machine.id).toBe('wescoe-2-snack')
    expect(hit.building.id).toBe('wescoe')
  })

  it('finds an item across multiple machines', () => {
    const results = search('pepsi', testBuildings, testMachines)
    const machineIds = results.items.map((hit) => hit.machine.id)
    expect(machineIds).toContain('wescoe-2-drink')
    expect(machineIds).toContain('kansas-union-1-drink')
  })

  it('matches slot items by category label', () => {
    const machinesWithCategory: VendingMachine[] = [
      {
        id: 'ambler-rec-1-drink',
        buildingId: 'wescoe',
        type: 'drink',
        floor: 1,
        locationNote: '',
        lastUpdated: '2026-08-21',
        slots: [{ code: 'B1', item: 'Muscle Milk', category: 'protein-shake', priceCents: 0 }],
      },
    ]
    const results = search('protein shake', testBuildings, machinesWithCategory)
    expect(results.items).toHaveLength(1)
    expect(results.items[0].slot.item).toBe('Muscle Milk')
  })

  it('matches slot items by flavor', () => {
    const machinesWithFlavor: VendingMachine[] = [
      {
        id: 'ambler-rec-1-drink',
        buildingId: 'wescoe',
        type: 'drink',
        floor: 1,
        locationNote: '',
        lastUpdated: '2026-08-21',
        slots: [{ code: 'A4', item: 'Celsius', flavor: 'Sparkling Orange', priceCents: 350 }],
      },
    ]
    const results = search('sparkling orange', testBuildings, machinesWithFlavor)
    expect(results.items).toHaveLength(1)
    expect(results.items[0].slot.item).toBe('Celsius')
  })

  it('returns nothing for a query with no matches', () => {
    const results = search('zzzz', testBuildings, testMachines)
    expect(results.buildings).toEqual([])
    expect(results.items).toEqual([])
  })
})

describe('groupItemHits', () => {
  it('collapses hits from the same machine that stock the same item', () => {
    const results = search('pepsi', testBuildings, testMachines)
    const groups = groupItemHits(results.items)
    expect(groups).toHaveLength(2)
    expect(groups.map((g) => g.machine.id)).toEqual(['wescoe-2-drink', 'kansas-union-1-drink'])
    expect(groups[0].slotGroups).toHaveLength(1)
    expect(groups[0].slotGroups[0]).toMatchObject({ item: 'Pepsi', codes: ['1'] })
  })

  it('collapses duplicate slots of the same item within one machine into one group', () => {
    const propelMachine: VendingMachine = {
      id: 'ambler-rec-1-drink',
      buildingId: 'wescoe',
      type: 'drink',
      floor: 1,
      locationNote: '',
      lastUpdated: '2026-08-21',
      slots: [
        { code: 'A1', item: 'Grape Propel', priceCents: 250 },
        { code: 'A2', item: 'Grape Propel', priceCents: 250 },
        { code: 'A3', item: 'Grape Propel', priceCents: 250 },
      ],
    }
    const results = search('propel', testBuildings, [propelMachine])
    const groups = groupItemHits(results.items)
    expect(groups).toHaveLength(1)
    expect(groups[0].slotGroups).toHaveLength(1)
    expect(groups[0].slotGroups[0].codes).toEqual(['A1', 'A2', 'A3'])
  })
})
