import type { Slot, SlotCategory, VendingMachine } from '../data/types'

export const CATEGORY_LABELS: Record<SlotCategory, string> = {
  soda: 'Soda',
  'energy-drink': 'Energy Drink',
  'electrolyte-drink': 'Electrolyte Drink',
  'protein-shake': 'Protein Shake',
  water: 'Water',
  gum: 'Gum',
  candy: 'Candy',
  chips: 'Chips',
  other: 'Other',
}

export function formatPrice(priceCents: number): string {
  return `$${(priceCents / 100).toFixed(2)}`
}

export function machineLabel(machine: VendingMachine): string {
  const base =
    machine.type === 'combo'
      ? 'Snack & drink machine'
      : machine.type === 'drink'
        ? 'Drink machine'
        : 'Snack machine'
  return base
}

export type SlotGroup = {
  item: string
  codes: string[]
  minPriceCents: number
  maxPriceCents: number
}

/** Collapses slots stocking the same item (e.g. three rows of "Grape Propel") into one. */
export function groupSlots(slots: Slot[]): SlotGroup[] {
  const groups: SlotGroup[] = []
  const byItem = new Map<string, SlotGroup>()
  for (const slot of slots) {
    let group = byItem.get(slot.item)
    if (!group) {
      group = { item: slot.item, codes: [], minPriceCents: slot.priceCents, maxPriceCents: slot.priceCents }
      byItem.set(slot.item, group)
      groups.push(group)
    }
    group.codes.push(slot.code)
    group.minPriceCents = Math.min(group.minPriceCents, slot.priceCents)
    group.maxPriceCents = Math.max(group.maxPriceCents, slot.priceCents)
  }
  return groups
}
