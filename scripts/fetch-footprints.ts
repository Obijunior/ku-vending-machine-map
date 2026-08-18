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

// KU's floor data is not uniformly clean: the stadium's basement, for one,
// carries rings plotted around [-102.58, 38.25] — roughly 650km west, in
// Colorado. Picking the largest ring would hand that one the win every time,
// so anything outside Lawrence is discarded before choosing.
const LAWRENCE_BOUNDS = { lngMin: -95.35, lngMax: -95.15, latMin: 38.9, latMax: 39.0 }

function isInLawrence(ring: LngLat[]): boolean {
  return ring.every(
    ([lng, lat]) =>
      lng >= LAWRENCE_BOUNDS.lngMin &&
      lng <= LAWRENCE_BOUNDS.lngMax &&
      lat >= LAWRENCE_BOUNDS.latMin &&
      lat <= LAWRENCE_BOUNDS.latMax,
  )
}

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
 * Building outline taken from the committed KU floor snapshot.
 *
 * A footprint is where the building meets the ground, so this uses the GROUND
 * FLOOR rather than whichever storey happens to be biggest. Floors genuinely
 * differ in shape — upper storeys are set back, basements sprawl under plazas,
 * and some levels are stored as a crude four-corner box (Wescoe's floor 4 is
 * five points covering more area than its real 138-point ground floor). Taking
 * the largest ring across all levels therefore returns a shape that does not
 * match the building anyone sees.
 *
 * Ranking is by AREA, not by distance to the farthest vertex, which a long
 * narrow wing would otherwise win.
 */
function kuFloorOutline(buildingId: string, pin: LngLat): LngLat[] | null {
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

  // Collect every usable ring, tagged with its level.
  const rings: { level: number; ring: LngLat[]; area: number }[] = []
  for (const feature of collection.features) {
    const raw = feature.properties?.[KU_FLOOR_LEVEL_FIELD]
    if (typeof raw !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(raw.trim())) continue
    const level = Number(raw)
    for (const ring of outerRings(feature.geometry)) {
      if (ring.length < 4) continue
      if (!isInLawrence(ring)) {
        console.warn(`${buildingId}: skipped a floor ring plotted outside Lawrence (bad KU data)`)
        continue
      }
      rings.push({ level, ring, area: ringAreaSqMetres(ring) })
    }
  }
  if (rings.length === 0) return null

  // Ground floor if it exists, else the lowest above-ground level, else
  // anything (a building mapped only as a basement still needs an outline).
  const aboveGround = rings.filter((r) => r.level >= 1)
  const pool = aboveGround.length > 0 ? aboveGround : rings
  const groundLevel = Math.min(...pool.map((r) => r.level))
  const onGround = pool.filter((r) => r.level === groundLevel)

  // KU groups some neighbours under one location id — the scholarship halls
  // share theirs — so a floor can hold several buildings' outlines. Picking by
  // area alone then returns whichever neighbour is biggest. The building we
  // want is the one the pin sits in, exactly as the OSM matcher below decides.
  const containing = onGround.filter((r) => pointInPolygon(pin, r.ring))
  if (containing.length > 0) {
    return containing.reduce((best, r) => (r.area > best.area ? r : best)).ring
  }

  // Pin outside every ring (a centroid can fall outside a concave outline):
  // fall back to the nearest outline rather than the largest.
  const nearest = onGround.reduce((best, r) =>
    distanceMeters(centroidOf(r.ring), pin) < distanceMeters(centroidOf(best.ring), pin) ? r : best,
  )

  // Last check: is this plausibly the same building? A gisLocationId is
  // assigned from GIS layer 1, but layer 4's floor plans do not always use the
  // same numbering — several small halls came back with the floor plan of some
  // structure a hundred metres away. Trusting the id alone puts a 7m outline
  // under a building the visitor is standing in front of, so reject an outline
  // that sits too far from the pin to be the same building and let OSM answer.
  const offset = distanceMeters(centroidOf(nearest.ring), pin)
  const extent = Math.max(...nearest.ring.map((p) => distanceMeters(centroidOf(nearest.ring), p)))
  // Scaled to the building: a sprawling complex legitimately has its centroid
  // well off the pin, while a 20m hall 77m away is simply not that hall.
  const tolerance = Math.max(60, extent * 2)
  if (offset > tolerance) {
    console.warn(
      `${buildingId}: KU floor plan sits ${Math.round(offset)}m from the pin ` +
        `(outline is only ~${Math.round(extent)}m across) — looks like another building, using OSM instead`,
    )
    return null
  }

  return nearest.ring
}

/** Shoelace area in square metres, for ranking rings by actual size. */
function ringAreaSqMetres(ring: LngLat[]): number {
  let sum = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
  }
  const metresPerDegLng = METERS_PER_DEG_LAT * Math.cos((ring[0][1] * Math.PI) / 180)
  return Math.abs(sum / 2) * metresPerDegLng * METERS_PER_DEG_LAT
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
    const outline = kuFloorOutline(building.id, building.coordinates)
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
