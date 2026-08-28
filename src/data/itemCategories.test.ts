import { describe, expect, it } from 'vitest'
import { itemCategories, itemCategories_snacks, resolveSlotCategory } from './itemCategories'
import type { Slot, SlotCategory } from './types'

describe('resolveSlotCategory', () => {
  const categories: Record<string, SlotCategory> = { Celsius: 'energy-drink' }

  it('uses the slot category when explicitly set, ignoring the global default', () => {
    const slot: Slot = { code: 'A1', item: 'Celsius', category: 'other' }
    expect(resolveSlotCategory(slot, categories)).toBe('other')
  })

  it('falls back to the global default when category is omitted', () => {
    const slot: Slot = { code: 'A1', item: 'Celsius' }
    expect(resolveSlotCategory(slot, categories)).toBe('energy-drink')
  })

  it('matches the global default case- and punctuation-insensitively', () => {
    const slot: Slot = { code: 'A1', item: 'celsius!' }
    expect(resolveSlotCategory(slot, categories)).toBe('energy-drink')
  })

  it('returns null when there is no override and no matching default', () => {
    const slot: Slot = { code: 'A1', item: 'Unknown Snack' }
    expect(resolveSlotCategory(slot, categories)).toBeNull()
  })

  it('checks both itemCategories and itemCategories_snacks by default', () => {
    expect(resolveSlotCategory({ code: 'A1', item: 'Gatorade' })).toBe(itemCategories['Gatorade'])
    expect(resolveSlotCategory({ code: 'A1', item: 'Cheetos' })).toBe(itemCategories_snacks['Cheetos'])
  })
})
