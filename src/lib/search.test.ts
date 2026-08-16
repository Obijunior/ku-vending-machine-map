import { describe, expect, it } from 'vitest'
import { search } from './search'
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

  it('returns nothing for a query with no matches', () => {
    const results = search('zzzz', testBuildings, testMachines)
    expect(results.buildings).toEqual([])
    expect(results.items).toEqual([])
  })
})
