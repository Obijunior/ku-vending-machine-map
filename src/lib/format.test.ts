import { describe, expect, it } from 'vitest'
import { formatPrice, formatSlotCodes, groupSlots, machineLabel } from './format'
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
