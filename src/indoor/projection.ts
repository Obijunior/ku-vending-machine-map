export type LngLat = [number, number]

export const FLOOR_HEIGHT = 3.5
export const FLOOR_GAP = 0.6

const METERS_PER_DEG_LAT = 111_320
const FALLBACK_WIDTH_M = 24
const FALLBACK_DEPTH_M = 16

export function centroid(points: LngLat[]): LngLat {
  let lng = 0
  let lat = 0
  for (const [x, y] of points) {
    lng += x
    lat += y
  }
  return [lng / points.length, lat / points.length]
}

/** Project a lng/lat point to local [east, north] meters relative to origin. */
export function lngLatToLocal(point: LngLat, origin: LngLat): [number, number] {
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos((origin[1] * Math.PI) / 180)
  return [
    (point[0] - origin[0]) * metersPerDegLng,
    (point[1] - origin[1]) * METERS_PER_DEG_LAT,
  ]
}

/** Base height of a floor's plate, stacking the building's floors in ascending order. */
export function floorElevation(floor: number, floors: number[]): number {
  const index = [...floors].sort((a, b) => a - b).indexOf(floor)
  return Math.max(index, 0) * (FLOOR_HEIGHT + FLOOR_GAP)
}

/** Rectangle footprint for buildings OSM doesn't have, centered on the building pin. */
export function fallbackRectangle([lng, lat]: LngLat): LngLat[] {
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)
  const dLng = FALLBACK_WIDTH_M / 2 / metersPerDegLng
  const dLat = FALLBACK_DEPTH_M / 2 / METERS_PER_DEG_LAT
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
  ]
}
