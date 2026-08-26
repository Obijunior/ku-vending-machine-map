import { describe, expect, it } from 'vitest'
import { slotRange, snackRow } from './slotRange'

describe('slotRange', () => {
  it('expands a code range into individual slots sharing the same details', () => {
    const slots = slotRange('B1', 'B9', { item: 'Pepsi', category: 'soda' })
    expect(slots).toHaveLength(9)
    expect(slots.map((s) => s.code)).toEqual(['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'])
    for (const slot of slots) {
      expect(slot.item).toBe('Pepsi')
      expect(slot.category).toBe('soda')
    }
  })

  it('produces a single slot when from and to are the same code', () => {
    expect(slotRange('C1', 'C1', { item: 'Water' })).toEqual([{ code: 'C1', item: 'Water' }])
  })

  it('supports codes with no letter prefix', () => {
    const slots = slotRange('1', '3', { item: 'Gum' })
    expect(slots.map((s) => s.code)).toEqual(['1', '2', '3'])
  })

  it('throws when the codes have different prefixes', () => {
    expect(() => slotRange('B1', 'C9', { item: 'Pepsi' })).toThrow(/must share a letter prefix/)
  })

  it('throws when the range runs backwards', () => {
    expect(() => slotRange('B9', 'B1', { item: 'Pepsi' })).toThrow(/comes before/)
  })
})

describe('snackRow', () => {
  it('numbers a left-to-right item list with ascending step-2 column digits by default', () => {
    const slots = snackRow(11, [
      { item: 'Cheetos', category: 'chips' },
      { item: 'Doritos', category: 'chips' },
      { item: "Lay's", category: 'chips' },
      { item: 'Ruffles', category: 'chips' },
      { item: 'Sun Chips', category: 'chips' },
    ])
    expect(slots.map((s) => s.code)).toEqual(['110', '112', '114', '116', '118'])
    expect(slots.map((s) => s.item)).toEqual(['Cheetos', 'Doritos', "Lay's", 'Ruffles', 'Sun Chips'])
  })

  it('supports step 1 for the narrow candy-bar shelf', () => {
    const slots = snackRow(15, [{ item: "Reese's" }, { item: 'Kit Kat' }, { item: 'Snickers' }], 1)
    expect(slots.map((s) => s.code)).toEqual(['150', '151', '152'])
  })

  it('skips null entries for empty or jammed slots without shifting other codes', () => {
    const slots = snackRow(12, [
      { item: 'Munchos', category: 'chips' },
      null,
      { item: 'Ritz', category: 'chips' },
    ])
    expect(slots.map((s) => s.code)).toEqual(['120', '124'])
  })

  it('carries per-slot fields like flavor and priceCents through', () => {
    const slots = snackRow(14, [{ item: 'Nutter Butter', category: 'candy', priceCents: 350 }])
    expect(slots).toEqual([{ code: '140', item: 'Nutter Butter', category: 'candy', priceCents: 350 }])
  })
})
