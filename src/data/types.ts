export type Coordinates = [longitude: number, latitude: number]

export type UserOrigin = {
  coordinates: Coordinates
  source: 'device' | 'pin'
}

export type Building = {
  /** URL-safe unique id, e.g. "wescoe" */
  id: string
  name: string
  /** [longitude, latitude] — map marker + camera target */
  coordinates: Coordinates
  /** KU GIS building-location id used to query official floor polygons when available. */
  gisLocationId?: string
  /** Actual floor numbers, ascending, e.g. [1, 2, 3]; basements like [0, 1] work too */
  floors: number[]
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
  floor: number
  locationNote: string
  /** ISO date (YYYY-MM-DD) the data was last verified */
  lastUpdated: string
  /** Empty array = machine exists but inventory not surveyed yet */
  slots: Slot[]
  /** [longitude, latitude] of the machine inside the building — same order as Building.coordinates */
  position?: Coordinates
}

/** A point on the campus walking-path network. */
export type GraphNode = {
  /** Unique, stable id, e.g. "n-wescoe-door" */
  id: string
  coordinates: Coordinates
}

/**
 * A walkable segment between two nodes. Undirected — a path walks both ways.
 * There is no weight field on purpose: distance is derived from the two nodes'
 * coordinates at load time so it can never drift from the geometry.
 */
export type GraphEdge = {
  from: string
  to: string
}
