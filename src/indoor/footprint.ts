import { footprints } from '../data/footprints'
import { centroid, fallbackRectangle, lngLatToLocal, type LngLat } from './projection'
import type { Building } from '../data/types'

const MIN_RADIUS = 15

export type BuildingFootprint = {
  /** Footprint vertices in local meters [east, north], centered on origin */
  points: [number, number][]
  /** lng/lat the local frame is centered on */
  origin: LngLat
  /** Distance from origin to the farthest vertex, floored at MIN_RADIUS — drives camera framing */
  radius: number
}

export function buildingFootprint(building: Building): BuildingFootprint {
  const polygon = footprints[building.id] ?? fallbackRectangle(building.coordinates)
  const origin = centroid(polygon)
  const points = polygon.map((p) => lngLatToLocal(p, origin))
  const radius = Math.max(MIN_RADIUS, ...points.map(([x, y]) => Math.hypot(x, y)))
  return { points, origin, radius }
}
