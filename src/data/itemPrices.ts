import type { Slot } from './types'

/**
 * Campus-wide default prices by item name. Applied to any slot that omits
 * `priceCents`; a slot that sets `priceCents` explicitly overrides this.
 *
 * Matching is case- and punctuation-insensitive, but word order still has to
 * match — "Celsius Sparkling Orange" will not match "Orange Celsius Sparkling".
 */
export const itemPrices: Record<string, number> = { // bottled stuff is $2
  'Celsius': 350,
  'Gatorade': 250,
  'Gatorade Zero': 250,
  'Rockstar': 275,
}

export function normalizeItemName(item: string): string {
  return item.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * A slot's own `priceCents` wins when set; otherwise falls back to the
 * campus-wide default for its item. Returns null when neither is known.
 * `prices` defaults to the real store and is only overridden in tests.
 */
export function resolveSlotPrice(slot: Slot, prices: Record<string, number> = itemPrices): number | null {
  if (slot.priceCents !== undefined) return slot.priceCents
  const target = normalizeItemName(slot.item)
  for (const [item, priceCents] of Object.entries(prices)) {
    if (normalizeItemName(item) === target) return priceCents
  }
  return null
}
