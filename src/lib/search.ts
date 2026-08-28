import { resolveSlotCategory } from '../data/itemCategories'
import type { Building, Slot, VendingMachine } from '../data/types'
import { CATEGORY_LABELS, groupSlots, type SlotGroup } from './format'

export type ItemHit = {
  slot: Slot
  machine: VendingMachine
  building: Building
}

export type ItemHitGroup = {
  machine: VendingMachine
  building: Building
  slotGroups: SlotGroup[]
}

/** Collapses hits from the same machine that stock the same item into one row. */
export function groupItemHits(hits: ItemHit[]): ItemHitGroup[] {
  const order: string[] = []
  const byMachine = new Map<string, { machine: VendingMachine; building: Building; slots: Slot[] }>()
  for (const hit of hits) {
    let bucket = byMachine.get(hit.machine.id)
    if (!bucket) {
      bucket = { machine: hit.machine, building: hit.building, slots: [] }
      byMachine.set(hit.machine.id, bucket)
      order.push(hit.machine.id)
    }
    bucket.slots.push(hit.slot)
  }
  return order.map((id) => {
    const bucket = byMachine.get(id)!
    return { machine: bucket.machine, building: bucket.building, slotGroups: groupSlots(bucket.slots) }
  })
}

export type SearchResults = {
  buildings: Building[]
  items: ItemHit[]
}

export function search(
  query: string,
  allBuildings: Building[],
  allMachines: VendingMachine[],
): SearchResults {
  const q = query.trim().toLowerCase()
  if (q === '') return { buildings: allBuildings, items: [] }

  const buildingsById = new Map(allBuildings.map((b) => [b.id, b]))
  const matchedBuildings = allBuildings.filter((b) => b.name.toLowerCase().includes(q))

  const items: ItemHit[] = []
  for (const machine of allMachines) {
    const building = buildingsById.get(machine.buildingId)
    if (!building) continue
    for (const slot of machine.slots) {
      const category = resolveSlotCategory(slot)
      const categoryMatch = category ? CATEGORY_LABELS[category].toLowerCase().includes(q) : false
      const flavorMatch = slot.flavor ? slot.flavor.toLowerCase().includes(q) : false
      if (slot.item.toLowerCase().includes(q) || categoryMatch || flavorMatch) {
        items.push({ slot, machine, building })
      }
    }
  }

  return { buildings: matchedBuildings, items }
}
