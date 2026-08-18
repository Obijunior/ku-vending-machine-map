// Shortlists candidate door nodes for each building, to be confirmed by hand
// into src/data/campusGraph.ts. Run with: bun run suggest-entrances
//
// OpenStreetMap gives us the path network but not which junction counts as a
// given building's entrance, so that judgement stays human. This narrows it
// from ~1,400 nodes to a handful per building.
//
// Candidates are ranked by distance to the building FOOTPRINT rather than to
// its pin: the pin sits at the centroid, so on a large building every node
// looks equally far from it, while distance-to-wall actually tracks "is this
// node at a door".
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildings } from '../src/data/buildings'
import { footprints } from '../src/data/footprints'
import { buildingEntrances } from '../src/data/campusGraph'

type LngLat = [number, number]

const PATHS = join('public', 'data', 'campus-paths.json')
const CANDIDATES_PER_BUILDING = 4
/** Beyond this, a node is a passer-by rather than a door. */
const MAX_CANDIDATE_METRES = 70

const METERS_PER_DEG_LAT = 111_320
function metres(a: LngLat, b: LngLat): number {
  const mLng = METERS_PER_DEG_LAT * Math.cos((a[1] * Math.PI) / 180)
  return Math.hypot((a[0] - b[0]) * mLng, (a[1] - b[1]) * METERS_PER_DEG_LAT)
}

/** Distance from a point to the nearest edge of a polygon, not just a vertex. */
function metresToPolygon(p: LngLat, polygon: LngLat[]): number {
  let best = Infinity
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    // Project p onto segment ab in local metres.
    const mLng = METERS_PER_DEG_LAT * Math.cos((p[1] * Math.PI) / 180)
    const ax = (a[0] - p[0]) * mLng
    const ay = (a[1] - p[1]) * METERS_PER_DEG_LAT
    const bx = (b[0] - p[0]) * mLng
    const by = (b[1] - p[1]) * METERS_PER_DEG_LAT
    const dx = bx - ax
    const dy = by - ay
    const lenSq = dx * dx + dy * dy
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq))
    const cx = ax + t * dx
    const cy = ay + t * dy
    best = Math.min(best, Math.hypot(cx, cy))
  }
  return best
}

/** Rough compass bearing from the building centre to a node, for labelling. */
function side(from: LngLat, to: LngLat): string {
  const mLng = METERS_PER_DEG_LAT * Math.cos((from[1] * Math.PI) / 180)
  const east = (to[0] - from[0]) * mLng
  const north = (to[1] - from[1]) * METERS_PER_DEG_LAT
  const angle = (Math.atan2(east, north) * 180) / Math.PI
  const names = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest']
  return names[Math.round(((angle + 360) % 360) / 45) % 8]
}

const raw = JSON.parse(readFileSync(PATHS, 'utf-8')) as {
  nodes: Record<string, LngLat>
  edges: unknown[]
}
const nodeEntries = Object.entries(raw.nodes)

console.log(`Network: ${nodeEntries.length} nodes.\n`)
console.log('Candidate door nodes per building, nearest wall first.')
console.log('Confirm the real doors, then add them to buildingEntrances.\n')

// Adjacent buildings can both have a node right on the shared boundary.
// Assigning one node as the door for two buildings makes the route between
// them zero metres, so these need a deliberate choice rather than a default.
const claimedBy = new Map<string, string[]>()

for (const building of buildings) {
  const polygon = footprints[building.id] as LngLat[] | undefined
  const already = buildingEntrances[building.id]
  const marker = already?.length ? `  [already mapped: ${already.join(', ')}]` : ''
  console.log(`${building.name} (${building.id})${marker}`)

  const ranked = nodeEntries
    .map(([id, coordinates]) => ({
      id,
      coordinates,
      wall: polygon
        ? metresToPolygon(coordinates, polygon)
        : metres(coordinates, building.coordinates),
    }))
    .filter((c) => c.wall <= MAX_CANDIDATE_METRES)
    .sort((a, b) => a.wall - b.wall)
    .slice(0, CANDIDATES_PER_BUILDING)

  if (ranked.length === 0) {
    console.log(`  (nothing within ${MAX_CANDIDATE_METRES}m — check coverage for this building)\n`)
    continue
  }

  for (const c of ranked) {
    claimedBy.set(c.id, [...(claimedBy.get(c.id) ?? []), building.id])
    console.log(
      `  '${c.id}'`.padEnd(16) +
        `${String(Math.round(c.wall)).padStart(3)}m from wall, ` +
        `${side(building.coordinates, c.coordinates).padEnd(9)} side`,
    )
  }
  console.log(
    `  -> ${building.id}: [${ranked.map((c) => `'${c.id}'`).join(', ')}],\n`,
  )
}

const shared = [...claimedBy.entries()].filter(([, ids]) => ids.length > 1)
if (shared.length > 0) {
  console.log('Shared candidates — give each of these to ONE building only:')
  for (const [nodeId, ids] of shared) {
    console.log(`  '${nodeId}' is a candidate for ${ids.join(' and ')}`)
  }
  console.log(
    '  Assigning the same node to two buildings makes the walk between them 0m.\n',
  )
}

console.log('Paste the lines you want into buildingEntrances in src/data/campusGraph.ts.')
console.log('Drop any candidate that is not really a door — a node passing by a wall is not an entrance.')
