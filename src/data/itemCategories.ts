import { normalizeItemName } from './itemPrices'
import type { Slot, SlotCategory } from './types'

/**
 * Campus-wide default category by item name. Applied to any slot that omits
 * `category`; a slot that sets `category` explicitly overrides this.
 *
 * Matching is case- and punctuation-insensitive, but word order still has to
 * match — same rule as `itemPrices`.
 */
export const itemCategories: Record<string, SlotCategory> = {
  'Celsius': 'energy-drink',
  'Rockstar': 'energy-drink',
  'Mountain Dew Kickstart': 'energy-drink',
  'Alani': 'energy-drink',
  'Doubleshot Energy': 'coffee',
  'Starbucks Doubleshot Energy': 'coffee',
  'Starbucks Cold Brew': 'coffee',
  'Starbucks Frappuccino': 'coffee',
  'Gatorade': 'electrolyte-drink',
  'Gatorade Zero': 'electrolyte-drink',
  'Gatorlyte': 'electrolyte-drink',
  'Pure Leaf': 'tea',
  'Aquafina': 'water',
  'Life Wtr': 'water',
  'Propel': 'electrolyte-drink',
  'Bottled Pepsi': 'soda',
  'Bottled Dr. Pepper': 'soda',
  'Bottled Mountain Dew': 'soda',
  'Bottled Dole Lemonade': 'juice',
  'Bottled Starry': 'soda',
  'Bottled Crush': 'soda',
  'Juice': 'juice',
  'Muscle Milk': 'protein-shake',
}

/**
 * Same idea as `itemCategories`, but for Canteen/Revision snack machines.
 * Merged into `itemCategories` as `resolveSlotCategory`'s default lookup, so
 * a snack slot can omit `category` just like a drink slot can.
 */
export const itemCategories_snacks: Record<string, SlotCategory> = {
  'Cheetos': 'chips',
  'Doritos': 'chips',
  "Lay's": 'chips',
  'Sun Chips': 'chips',
  'Fritos': 'chips',
  'Ruffles': 'chips',
  "Snyder's of Hanover": 'chips',
  'Munchies': 'chips',
  "T.G.I. Friday's Potato Skins": 'chips',
  'Chex Mix Muddy Buddies': 'other',
  'Cheez-It': 'chips',
  "Gardetto's": 'chips',
  'Ritz Toasted Chips': 'chips',
  'Veggie Toasted Chips': 'chips',
  'Rice Krispies Treats': 'other',
  'Pop-Tarts': 'other',
  "Grandma's": 'other',
  "Jack Link's Beef Tender Bites": 'other',
  'Claim Jumper': 'other',
  "Mrs. Freshley's Grand Iced Honey Bun": 'other',
  "Mrs. Freshley's Mini Donuts": 'other',
  'Haribo Goldbears': 'candy',
  "Reese's": 'candy',
  "Reese's Sticks": 'candy',
  "Reese's Outrageous": 'candy',
  'Butterfinger': 'candy',
  'Kit Kat': 'candy',
  'Snickers': 'candy',
  'PayDay': 'candy',
  'Kinder Bueno': 'candy',
  "M&M's": 'candy',
  'Nature Valley Crunchy': 'other',
  'Chips Ahoy': 'candy',
}

const defaultCategories: Record<string, SlotCategory> = { ...itemCategories, ...itemCategories_snacks }

/**
 * A slot's own `category` wins when set; otherwise falls back to the
 * campus-wide default for its item, checking `itemCategories` and
 * `itemCategories_snacks` together. Returns null when neither is known.
 * `categories` defaults to the real combined store and is only overridden in tests.
 */
export function resolveSlotCategory(
  slot: Slot,
  categories: Record<string, SlotCategory> = defaultCategories,
): SlotCategory | null {
  if (slot.category !== undefined) return slot.category
  const target = normalizeItemName(slot.item)
  for (const [item, category] of Object.entries(categories)) {
    if (normalizeItemName(item) === target) return category
  }
  return null
}
