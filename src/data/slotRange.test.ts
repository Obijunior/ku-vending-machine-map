import { describe, expect, it } from 'vitest'
import { slotRange } from './slotRange'

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
