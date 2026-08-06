import type { Coordinates } from '../data/types'

const FLOOR_FIELD = 'SDE.FloorAll.FLOORLOCATION'

type GeoJsonFeature = {
  properties?: Record<string, unknown>
  geometry?: unknown
}

type GeoJsonFeatureCollection = {
  type?: string
  features?: GeoJsonFeature[]
}

export type KuFloorPolygon = {
  points: Coordinates[]
  holes: Coordinates[][]
}

export type KuFloorPlan = {
  floor: number
  polygons: KuFloorPolygon[]
}

function parseFloor(value: unknown): number | null {
  if (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value.trim())) return null
  const floor = Number(value)
  return Number.isFinite(floor) ? floor : null
}

function normalizeRing(value: unknown): Coordinates[] | null {
  if (!Array.isArray(value)) return null
  const points: Coordinates[] = []
  for (const position of value) {
    if (
      !Array.isArray(position) ||
      position.length < 2 ||
      typeof position[0] !== 'number' ||
      typeof position[1] !== 'number'
    ) {
      return null
    }
    points.push([position[0], position[1]])
  }
  return points.length >= 4 ? points : null
}

function normalizePolygon(value: unknown): KuFloorPolygon | null {
  if (!Array.isArray(value)) return null
  const rings = value.map(normalizeRing).filter((ring): ring is Coordinates[] => ring !== null)
  if (rings.length === 0) return null
  return { points: rings[0], holes: rings.slice(1) }
}

function normalizeGeometry(value: unknown): KuFloorPolygon[] {
  if (typeof value !== 'object' || value === null) return []
  const geometry = value as { type?: unknown; coordinates?: unknown }
  if (!Array.isArray(geometry.coordinates)) return []

  const polygons =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates
        : []

  return polygons
    .map(normalizePolygon)
    .filter((polygon): polygon is KuFloorPolygon => polygon !== null)
}

export async function fetchKuFloorPlans(
  buildingId: string,
  signal?: AbortSignal,
): Promise<KuFloorPlan[]> {
  if (!/^[a-z0-9-]+$/.test(buildingId)) {
    throw new Error(`Invalid building id: ${buildingId}`)
  }

  const dataUrl = `${import.meta.env.BASE_URL}data/ku-floors/${buildingId}.geojson`
  const response = await fetch(dataUrl, { signal })
  if (!response.ok) throw new Error(`Local KU floor snapshot returned ${response.status}`)

  const collection = (await response.json()) as GeoJsonFeatureCollection
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
    throw new Error('KU floor service returned invalid GeoJSON')
  }

  const byFloor = new Map<number, KuFloorPolygon[]>()
  for (const feature of collection.features) {
    const floor = parseFloor(feature.properties?.[FLOOR_FIELD])
    if (floor === null) continue // Skip non-navigable levels such as ROOF.
    const polygons = normalizeGeometry(feature.geometry)
    if (polygons.length === 0) continue
    byFloor.set(floor, [...(byFloor.get(floor) ?? []), ...polygons])
  }

  return [...byFloor.entries()]
    .sort(([a], [b]) => a - b)
    .map(([floor, polygons]) => ({ floor, polygons }))
}
