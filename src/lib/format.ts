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

type ParsedCode = { raw: string; prefix: string; num: number } | { raw: string; prefix: null; num: null }

function parseCode(raw: string): ParsedCode {
  const match = /^([A-Za-z]*)(\d+)$/.exec(raw)
  if (!match) return { raw, prefix: null, num: null }
  return { raw, prefix: match[1], num: Number(match[2]) }
}

/** Formats slot codes as ranges, e.g. ["C1".."C7", "D1".."D7"] -> "C1–C7, D1–D7". */
export function formatSlotCodes(codes: string[]): string {
  const parsed = codes.map(parseCode)
  const parts: string[] = []
  let i = 0
  while (i < parsed.length) {
    const start = parsed[i]
    let j = i
    while (
      j + 1 < parsed.length &&
      start.prefix !== null &&
      parsed[j + 1].prefix === start.prefix &&
      parsed[j + 1].num === parsed[j].num! + 1
    ) {
      j++
    }
    parts.push(j > i ? `${start.raw}–${parsed[j].raw}` : start.raw)
    i = j + 1
  }
  return parts.join(', ')
}
