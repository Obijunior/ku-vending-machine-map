// Writes src/data/footprints.ts, the outline polygon per building.
// Run once per new building: bun run fetch-footprints
//
// Two sources, in order of preference:
//   1. The committed KU GIS floor snapshot (public/data/ku-floors/<id>.geojson),
//      when the building has one. This is KU's own data and is authoritative.
//   2. OpenStreetMap via the Overpass API, for anything KU doesn't cover.
//
// KU comes first because OSM matching is positional: it picks the building
// polygon nearest the pin, which silently grabs the wrong structure when a
// building is mapped as a multipolygon relation (this script only reads ways)
// or simply isn't mapped. That produced a 9 m outline for Eaton Hall — some
// small neighbouring structure — and an Anschutz outline 71 m off its own pin.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildings } from '../src/data/buildings'

type LngLat = [number, number]

const KU_FLOORS_DIR = join('public', 'data', 'ku-floors')
const KU_FLOOR_LEVEL_FIELD = 'SDE.FloorAll.FLOORLOCATION'

type GeoJsonFeature = {
  properties?: Record<string, unknown>
  geometry?: { type?: string; coordinates?: unknown }
}

/** Every outer ring in a Polygon / MultiPolygon geometry. */
function outerRings(geometry: GeoJsonFeature['geometry']): LngLat[][] {
  if (!geometry || !Array.isArray(geometry.coordinates)) return []
  if (geometry.type === 'Polygon') {
    const ring = (geometry.coordinates as LngLat[][])[0]
    return Array.isArray(ring) ? [ring] : []
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as LngLat[][][])
      .map((polygon) => polygon[0])
      .filter((ring): ring is LngLat[] => Array.isArray(ring))
  }
  return []
}

/**
 * Building outline taken from the committed KU floor snapshot: the largest
 * outer ring across every numeric level. Largest (rather than floor 1) so the
 * outline contains every floor of the stack — it drives the indoor view's
 * camera framing and projection origin, where too big is harmless and too
 * small clips the building. Non-numeric levels such as ROOF are skipped, the
 * same rule src/indoor/kuFloors.ts applies at runtime.
 */
function kuFloorOutline(buildingId: string): LngLat[] | null {
  const path = join(KU_FLOORS_DIR, `${buildingId}.geojson`)
  if (!existsSync(path)) return null

  let collection: { features?: GeoJsonFeature[] }
  try {
    collection = JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    console.warn(`${buildingId}: KU floor snapshot is unreadable; falling back to OSM`)
    return null
  }
  if (!Array.isArray(collection.features)) return null

  let best: LngLat[] | null = null
  for (const feature of collection.features) {
    const level = feature.properties?.[KU_FLOOR_LEVEL_FIELD]
    if (typeof level !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(level.trim())) continue
    for (const ring of outerRings(feature.geometry)) {
      if (ring.length < 4) continue
      if (!best || ringExtentMeters(ring) > ringExtentMeters(best)) best = ring
    }
  }
  return best
}

/** Distance from a ring's centroid to its farthest vertex. */
function ringExtentMeters(ring: LngLat[]): number {
  const c = centroidOf(ring)
  return Math.max(...ring.map((p) => distanceMeters(c, p)))
}

// Primary mirror first; if it returns 4xx/5xx, fall through to the backups.
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
const SEARCH_RADIUS_M = 60

type OverpassWay = {
  type: string
  id: number
  geometry?: { lat: number; lon: number }[]
}

function buildQuery(targets: typeof buildings): string {
  const clauses = targets
    .map(
      (b) =>
        `way(around:${SEARCH_RADIUS_M},${b.coordinates[1]},${b.coordinates[0]})["building"];`,
    )
    .join('\n')
  return `[out:json][timeout:60];(\n${clauses}\n);out geom;`
}

function pointInPolygon([lng, lat]: LngLat, polygon: LngLat[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const intersects =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function centroidOf(points: LngLat[]): LngLat {
  let lng = 0
  let lat = 0
  for (const [x, y] of points) {
    lng += x
    lat += y
  }
  return [lng / points.length, lat / points.length]
}

const METERS_PER_DEG_LAT = 111_320

function distanceMeters(a: LngLat, b: LngLat): number {
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos((a[1] * Math.PI) / 180)
  const dx = (a[0] - b[0]) * metersPerDegLng
  const dy = (a[1] - b[1]) * METERS_PER_DEG_LAT
  return Math.hypot(dx, dy)
}

async function fetchOverpass(query: string): Promise<{ elements: OverpassWay[] }> {
  for (const mirror of OVERPASS_MIRRORS) {
    let res: Response
    try {
      res = await fetch(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      })
    } catch (e) {
      console.warn(`Mirror ${mirror} threw: ${(e as Error).message} — trying next`)
      continue
    }
    if (!res.ok) {
      console.warn(`Mirror ${mirror} returned ${res.status} ${res.statusText} — trying next`)
      continue
    }
    return (await res.json()) as { elements: OverpassWay[] }
  }
  throw new Error('All Overpass mirrors failed')
}

async function main() {
  const footprints: Record<string, LngLat[]> = {}
  const missing: string[] = []

  // Source 1: KU's own floor snapshots, for every building that has one.
  const needsOsm: typeof buildings = []
  for (const building of buildings) {
    const outline = kuFloorOutline(building.id)
    if (outline) {
      const dist = Math.round(distanceMeters(centroidOf(outline), building.coordinates))
      console.log(
        `${building.id}: ${outline.length} vertices from KU floor snapshot, ` +
          `centroid ${dist}m from pin`,
      )
      footprints[building.id] = outline
    } else {
      needsOsm.push(building)
    }
  }

  if (needsOsm.length === 0) {
    console.log('\nEvery building had a KU floor snapshot; skipped the Overpass query.')
    writeFootprints(footprints, missing)
    return
  }

  // Source 2: OpenStreetMap, only for what KU didn't cover.
  console.log(`\nQuerying Overpass for ${needsOsm.length} building(s) without a KU snapshot...`)
  const json = await fetchOverpass(buildQuery(needsOsm))
  const polygons = json.elements
    .filter((e) => e.type === 'way' && (e.geometry?.length ?? 0) >= 4)
    .map((w) => w.geometry!.map((g): LngLat => [g.lon, g.lat]))

  const FALLBACK_RADIUS_M = 100

  for (const building of needsOsm) {
    const containing = polygons.filter((p) => pointInPolygon(building.coordinates, p))
    const candidates =
      containing.length > 0
        ? containing
        : polygons.filter(
            (p) => distanceMeters(centroidOf(p), building.coordinates) <= FALLBACK_RADIUS_M,
          )
    if (candidates.length === 0) {
      missing.push(building.id)
      continue
    }
    const best = candidates.reduce((a, b) =>
      distanceMeters(centroidOf(a), building.coordinates) <=
      distanceMeters(centroidOf(b), building.coordinates)
        ? a
        : b,
    )
    const bestCentroid = centroidOf(best)
    const dist = Math.round(distanceMeters(bestCentroid, building.coordinates))
    const isFallback = containing.length === 0
    const fallbackNote = isFallback
      ? ' (FALLBACK MATCH — pin is outside the polygon; consider moving the pin inside the building and re-running)'
      : ''
    console.log(`${building.id}: ${best.length} vertices, centroid ${dist}m from pin${fallbackNote}`)
    footprints[building.id] = best
  }

  writeFootprints(footprints, missing)
}

function writeFootprints(footprints: Record<string, LngLat[]>, missing: string[]) {
  for (const building of Object.keys(footprints)) {
    if (!/^[a-z0-9-]+$/.test(building)) {
      throw new Error(`building id not kebab-case-safe for codegen: ${building}`)
    }
  }

  // Stable key order so a regeneration with unchanged data is a no-op diff.
  const ordered = Object.keys(footprints).sort()

  const lines = [
    '// GENERATED by scripts/fetch-footprints.ts — do not edit by hand.',
    '// Regenerate with: bun run fetch-footprints',
    'export const footprints: Record<string, [number, number][]> = {',
    ...ordered.map(
      (id) =>
        `  '${id}': [${footprints[id].map(([lng, lat]) => `[${lng}, ${lat}]`).join(', ')}],`,
    ),
    '}',
    '',
  ]
  writeFileSync('src/data/footprints.ts', lines.join('\n'))

  console.log(`\nWrote footprints for ${ordered.length}/${buildings.length} buildings.`)
  if (missing.length > 0) {
    console.log(`No footprint found (fallback rectangle will render): ${missing.join(', ')}`)
  }
}

await main()
