export type Building = {
  /** URL-safe unique id, e.g. "wescoe" */
  id: string
  name: string
  /** [longitude, latitude] — map marker + camera target */
  coordinates: [number, number]
}

export type MachineType = 'drink' | 'snack' | 'combo'

export type Slot = {
  /** Slot code as printed on the machine, e.g. "A1" */
  code: string
  item: string
  /** Integer cents, e.g. 175 = $1.75 */
  priceCents: number
}

export type VendingMachine = {
  /** Unique id, e.g. "wescoe-2-snack" */
  id: string
  buildingId: string
  type: MachineType
  brand?: string
  floor: number
  locationNote: string
  /** ISO date (YYYY-MM-DD) the data was last verified */
  lastUpdated: string
  /** Empty array = machine exists but inventory not surveyed yet */
  slots: Slot[]
  /** Phase 2: position on the floor plan for the 3D view */
  position?: { x: number; y: number }
}
