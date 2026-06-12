import { describe, expect, it } from 'vitest'
import { search } from './search'
import { buildings } from '../data/buildings'
import { machines } from '../data/machines'

describe('search', () => {
  it('returns all buildings and no items for an empty query', () => {
    const results = search('', buildings, machines)
    expect(results.buildings).toEqual(buildings)
    expect(results.items).toEqual([])
  })

  it('treats whitespace-only queries as empty', () => {
    const results = search('   ', buildings, machines)
    expect(results.buildings).toEqual(buildings)
    expect(results.items).toEqual([])
  })

  it('matches building names case-insensitively', () => {
    const results = search('WESCOE', buildings, machines)
    expect(results.buildings.map((b) => b.id)).toEqual(['wescoe'])
  })

  it('matches slot items with full context', () => {
    const results = search('hot cheetos', buildings, machines)
    expect(results.buildings).toEqual([])
    expect(results.items).toHaveLength(1)
    const hit = results.items[0]
    expect(hit.slot.code).toBe('B2')
    expect(hit.machine.id).toBe('wescoe-2-snack')
    expect(hit.building.id).toBe('wescoe')
  })

  it('finds an item across multiple machines', () => {
    const results = search('pepsi', buildings, machines)
    const machineIds = results.items.map((hit) => hit.machine.id)
    expect(machineIds).toContain('wescoe-2-drink')
    expect(machineIds).toContain('kansas-union-1-drink')
  })

  it('returns nothing for a query with no matches', () => {
    const results = search('zzzz', buildings, machines)
    expect(results.buildings).toEqual([])
    expect(results.items).toEqual([])
  })
})
