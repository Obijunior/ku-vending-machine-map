import type { Building, Slot, VendingMachine } from '../data/types'

export type ItemHit = {
  slot: Slot
  machine: VendingMachine
  building: Building
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
      if (slot.item.toLowerCase().includes(q)) {
        items.push({ slot, machine, building })
      }
    }
  }

  return { buildings: matchedBuildings, items }
}
