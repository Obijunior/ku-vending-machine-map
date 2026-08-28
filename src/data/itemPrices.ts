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
  'Rockstar': 275,
  'Alani': 375,
  'Mountain Dew Kickstart': 300,
  'Doubleshot Energy': 350,
  'Starbucks Frappuccino': 350,
  'Starbucks Cold Brew': 375,
  'Gatorade': 250,
  'Gatorade Zero': 250,
  'Pure Leaf': 250,
  'Aquafina': 200,
  'Life Wtr': 275,
  'Propel': 275,
  'Juice': 250,
  'Bottled Pepsi': 200,
  'Bottled Dr. Pepper': 200,
  'Bottled Mountain Dew': 200,
  'Bottled Dole Lemonade': 200,
  'Bottled Starry': 200,
  'Bottled Crush': 200,
}

/**
 * Same idea as `itemPrices`, but for Canteen/Revision snack machines.
 * Merged into `itemPrices` as `resolveSlotPrice`'s default lookup, so a
 * snack slot can omit `priceCents` just like a drink slot can.
 */
export const itemPrices_snacks: Record<string, number> = { // chips/candy are $2.50 unless noted
  'Cheetos': 250,
  'Doritos': 250,
  "Lay's": 250,
  'Sun Chips': 250,
  'Fritos': 250,
  'Ruffles': 250,
  "Snyder's of Hanover": 250,
  'Munchies': 250,
  "T.G.I. Friday's Potato Skins": 275,
  'Chex Mix Muddy Buddies': 275,
  'Cheez-It': 275,
  "Gardetto's": 275,
  'Ritz Toasted Chips': 275,
  'Veggie Toasted Chips': 275,
  'Rice Krispies Treats': 275,
  'Pop-Tarts': 275,
  "Grandma's": 275,
  "Jack Link's Beef Tender Bites": 300,
  'Claim Jumper': 300,
  "Mrs. Freshley's Grand Iced Honey Bun": 300,
  "Mrs. Freshley's Mini Donuts": 300,
  'Haribo Goldbears': 300,
  "Reese's": 250,
  "Reese's Sticks": 250,
  "Reese's Outrageous": 250,
  'Butterfinger': 250,
  'Kit Kat': 250,
  'Snickers': 250,
  'PayDay': 250,
  'Kinder Bueno': 250,
  "M&M's": 250,
  'Nature Valley Crunchy': 250,
  'Chips Ahoy': 250,
}

export function normalizeItemName(item: string): string {
  return item.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

const defaultPrices: Record<string, number> = { ...itemPrices, ...itemPrices_snacks }

/**
 * A slot's own `priceCents` wins when set; otherwise falls back to the
 * campus-wide default for its item, checking `itemPrices` and
 * `itemPrices_snacks` together. Returns null when neither is known.
 * `prices` defaults to the real combined store and is only overridden in tests.
 */
export function resolveSlotPrice(slot: Slot, prices: Record<string, number> = defaultPrices): number | null {
  if (slot.priceCents !== undefined) return slot.priceCents
  const target = normalizeItemName(slot.item)
  for (const [item, priceCents] of Object.entries(prices)) {
    if (normalizeItemName(item) === target) return priceCents
  }
  return null
}
