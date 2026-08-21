import { describe, expect, it } from 'vitest'
import { formatPrice, formatSlotCodes, groupSlots, itemLabel, machineLabel } from './format'
import type { Slot, VendingMachine } from '../data/types'

describe('formatPrice', () => {
  it('formats cents as dollars', () => {
    expect(formatPrice(175)).toBe('$1.75')
  })

  it('pads whole-dollar amounts', () => {
    expect(formatPrice(200)).toBe('$2.00')
  })

  it('handles amounts over ten dollars', () => {
    expect(formatPrice(1050)).toBe('$10.50')
  })

  it('shows a dash for an unresolved price', () => {
    expect(formatPrice(null)).toBe('—')
  })
})

function machineWith(overrides: Partial<VendingMachine>): VendingMachine {
  return {
    id: 'test',
    buildingId: 'test',
    type: 'snack',
    floor: 1,
    locationNote: '',
    lastUpdated: '2026-06-11',
    slots: [],
    ...overrides,
  }
}

describe('machineLabel', () => {
  it('labels a snack machine', () => {
    expect(machineLabel(machineWith({ type: 'snack' }))).toBe('Snack machine')
  })

  it('labels a combo machine', () => {
    expect(machineLabel(machineWith({ type: 'combo' }))).toBe('Snack & drink machine')
  })
})

describe('groupSlots', () => {
  const slots: Slot[] = [
    { code: 'A1', item: 'Grape Propel', priceCents: 0 },
    { code: 'A2', item: 'Grape Propel', priceCents: 0 },
    { code: 'A3', item: 'Grape Propel', priceCents: 0 },
    { code: 'B1', item: 'Muscle Milk', priceCents: 0 },
  ]

  it('collapses slots with the same item into one group', () => {
    const groups = groupSlots(slots)
    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({ item: 'Grape Propel', codes: ['A1', 'A2', 'A3'] })
    expect(groups[1]).toMatchObject({ item: 'Muscle Milk', codes: ['B1'] })
  })

  it('tracks the min and max price within a group', () => {
    const mixedPriceSlots: Slot[] = [
      { code: 'A1', item: 'Pretzels', priceCents: 125 },
      { code: 'A2', item: 'Pretzels', priceCents: 150 },
    ]
    const [group] = groupSlots(mixedPriceSlots)
    expect(group.minPriceCents).toBe(125)
    expect(group.maxPriceCents).toBe(150)
  })

  it('resolves price to null when a slot has no override and no global default', () => {
    const unpricedSlots: Slot[] = [{ code: 'A1', item: 'Some Unpriced Snack' }]
    const [group] = groupSlots(unpricedSlots)
    expect(group.minPriceCents).toBeNull()
    expect(group.maxPriceCents).toBeNull()
  })

  it('keeps different flavors of the same item as separate groups', () => {
    const flavoredSlots: Slot[] = [
      { code: 'A4', item: 'Celsius', flavor: 'Sparkling Orange', priceCents: 350 },
      { code: 'A5', item: 'Celsius', flavor: 'Sparkling Orange', priceCents: 350 },
      { code: 'A6', item: 'Celsius', flavor: 'Kiwi Guava', priceCents: 350 },
    ]
    const groups = groupSlots(flavoredSlots)
    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({ item: 'Celsius', flavor: 'Sparkling Orange', codes: ['A4', 'A5'] })
    expect(groups[1]).toMatchObject({ item: 'Celsius', flavor: 'Kiwi Guava', codes: ['A6'] })
  })
})

describe('itemLabel', () => {
  it('returns just the item name when there is no flavor', () => {
    expect(itemLabel({ item: 'Celsius' })).toBe('Celsius')
  })

  it('appends the flavor when set', () => {
    expect(itemLabel({ item: 'Celsius', flavor: 'Sparkling Orange' })).toBe('Celsius · Sparkling Orange')
  })
})

describe('formatSlotCodes', () => {
  it('collapses consecutive codes into a range', () => {
    expect(formatSlotCodes(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'])).toBe('C1–C7')
  })

  it('collapses multiple runs separately', () => {
    expect(formatSlotCodes(['C1', 'C2', 'C3', 'D1', 'D2', 'D3'])).toBe('C1–C3, D1–D3')
  })

  it('leaves a single code as-is', () => {
    expect(formatSlotCodes(['B1'])).toBe('B1')
  })

  it('does not merge non-consecutive codes', () => {
    expect(formatSlotCodes(['A1', 'A3'])).toBe('A1, A3')
  })

  it('does not merge codes with different prefixes even if adjacent', () => {
    expect(formatSlotCodes(['A9', 'B1'])).toBe('A9, B1')
  })

  it('leaves codes without a numeric suffix as-is', () => {
    expect(formatSlotCodes(['A1', 'Bonus'])).toBe('A1, Bonus')
  })
})
