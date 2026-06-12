import { describe, expect, it } from 'vitest'
import { buildings } from './buildings'
import { machines } from './machines'

describe('buildings', () => {
  it('have unique ids', () => {
    const ids = buildings.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('exist', () => {
    expect(buildings.length).toBeGreaterThan(0)
  })
})

describe('machines', () => {
  it('have unique ids', () => {
    const ids = machines.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('reference existing buildings', () => {
    const buildingIds = new Set(buildings.map((b) => b.id))
    for (const machine of machines) {
      expect(
        buildingIds.has(machine.buildingId),
        `machine ${machine.id} references missing building ${machine.buildingId}`,
      ).toBe(true)
    }
  })

  it('have unique slot codes within each machine', () => {
    for (const machine of machines) {
      const codes = machine.slots.map((s) => s.code)
      expect(new Set(codes).size, `duplicate slot code in ${machine.id}`).toBe(codes.length)
    }
  })

  it('have positive integer prices', () => {
    for (const machine of machines) {
      for (const slot of machine.slots) {
        expect(
          Number.isInteger(slot.priceCents) && slot.priceCents > 0,
          `bad price for ${machine.id} slot ${slot.code}: ${slot.priceCents}`,
        ).toBe(true)
      }
    }
  })

  it('have parseable lastUpdated dates', () => {
    for (const machine of machines) {
      expect(
        Number.isNaN(Date.parse(machine.lastUpdated)),
        `unparseable lastUpdated on ${machine.id}: ${machine.lastUpdated}`,
      ).toBe(false)
      expect(
        machine.lastUpdated,
        `lastUpdated not YYYY-MM-DD on ${machine.id}: ${machine.lastUpdated}`,
      ).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('have non-empty slot codes and items', () => {
    for (const machine of machines) {
      for (const slot of machine.slots) {
        expect(
          slot.code.trim() !== '',
          `empty slot code in ${machine.id}`,
        ).toBe(true)
        expect(
          slot.item.trim() !== '',
          `empty slot item in ${machine.id} slot ${slot.code}`,
        ).toBe(true)
      }
    }
  })
})
