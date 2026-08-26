import { describe, expect, it } from 'vitest'
import { itemPrices, itemPrices_snacks, normalizeItemName, resolveSlotPrice } from './itemPrices'
import type { Slot } from './types'

describe('normalizeItemName', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeItemName('Celsius Sparkling Orange!')).toBe('celsius sparkling orange')
  })

  it('collapses repeated whitespace and punctuation into single spaces', () => {
    expect(normalizeItemName('Celsius -- Sparkling   Orange')).toBe('celsius sparkling orange')
  })
})

describe('resolveSlotPrice', () => {
  const prices = { 'Celsius Sparkling Orange': 350 }

  it('uses the slot price when explicitly set, ignoring the global default', () => {
    const slot: Slot = { code: 'A1', item: 'Celsius Sparkling Orange', priceCents: 300 }
    expect(resolveSlotPrice(slot, prices)).toBe(300)
  })

  it('falls back to the global default when priceCents is omitted', () => {
    const slot: Slot = { code: 'A1', item: 'Celsius Sparkling Orange' }
    expect(resolveSlotPrice(slot, prices)).toBe(350)
  })

  it('matches the global default case- and punctuation-insensitively', () => {
    const slot: Slot = { code: 'A1', item: 'celsius sparkling orange!' }
    expect(resolveSlotPrice(slot, prices)).toBe(350)
  })

  it('returns null when there is no override and no matching default', () => {
    const slot: Slot = { code: 'A1', item: 'Unknown Snack' }
    expect(resolveSlotPrice(slot, prices)).toBeNull()
  })

  it('checks both itemPrices and itemPrices_snacks by default', () => {
    expect(resolveSlotPrice({ code: 'A1', item: 'Gatorade' })).toBe(itemPrices['Gatorade'])
    expect(resolveSlotPrice({ code: 'A1', item: 'Cheetos' })).toBe(itemPrices_snacks['Cheetos'])
  })
})
