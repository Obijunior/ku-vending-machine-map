// Builds the campus walking-path network from OpenStreetMap and writes
// public/data/campus-paths.json. Regenerate with: bun run fetch-paths
//
// Why OSM rather than hand-tracing: KU's campus is mapped in detail — footways,
// sidewalks, steps and crossings — so the network is already there. Hand-tracing
// it would be hours of work with more mistakes.
//
// Three things this does that matter:
//
//   1. Node identity comes from OSM node ids, not position. Junctions are where
//      ways genuinely share a node, so there is no proximity guessing — and the
//      ids are stable across regeneration, which is what lets the hand-authored
//      buildingEntrances map keep working after a re-run.
//
//   2. Degree-2 vertices are contracted away. ~78% of OSM vertices are just
//      bends in a path, not decisions; collapsing each run into one edge that
//      carries its polyline takes the graph from ~6,900 nodes to ~1,500 without
//      changing a single route.
//
//   3. Output is a fetched JSON asset, not a TypeScript module. At a few hundred
//      KB it has no business in the JS bundle, and the app already loads
//      district and floor data this way.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildings } from '../src/data/buildings'

type LngLat = [number, number]

const OUTPUT = join('public', 'data', 'campus-paths.json')
const DISTRICTS = join('public', 'data', 'ku-districts.geojson')

// Primary mirror first; fall through on rate limits.
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

/** Campus bounding box (south,west,north,east) — trimmed further by district clip. */
const BBOX = '38.9500,-95.2620,38.9600,-95.2400'

/**
 * Tags that represent somewhere a person can walk. `service` and `cycleway` are
 * left out: service roads are mostly driveways and parking aisles, and routing
 * a pedestrian down them produces confident but wrong directions.
 */
const WALKABLE_HIGHWAY = '^(footway|path|pedestrian|steps|corridor|living_street)$'

/** Coordinate precision. 6dp is ~0.1m — well past what a walking route needs. */
const DP = 6
const round = (n: number) => Number(n.toFixed(DP))

const METERS_PER_DEG_LAT = 111_320

function distanceMeters(a: LngLat, b: LngLat): number {
  const mLng = METERS_PER_DEG_LAT * Math.cos((a[1] * Math.PI) / 180)
  return Math.hypot((a[0] - b[0]) * mLng, (a[1] - b[1]) * METERS_PER_DEG_LAT)
}

type OsmElement = {
  type: string
  id: number
  lat?: number
  lon?: number
  nodes?: number[]
  tags?: Record<string, string>
}

async function fetchOverpass(query: string): Promise<{ elements: OsmElement[] }> {
  for (const mirror of MIRRORS) {
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
    const text = await res.text()
    if (!text.trimStart().startsWith('{')) {
      console.warn(`Mirror ${mirror} returned non-JSON — trying next`)
      continue
    }
    return JSON.parse(text)
  }
  throw new Error('All Overpass mirrors failed')
}

/** Point-in-polygon against any KU district ring. */
function makeDistrictTest(): (p: LngLat) => boolean {
  const geo = JSON.parse(readFileSync(DISTRICTS, 'utf-8')) as {
    features: { geometry: { coordinates: LngLat[][] } }[]
  }
  const rings = geo.features.map((f) => f.geometry.coordinates[0])
  return ([lng, lat]: LngLat) => {
    for (const ring of rings) {
      let inside = false
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]
        const [xj, yj] = ring[j]
        if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
          inside = !inside
        }
      }
      if (inside) return true
    }
    return false
  }
}

async function main() {
  const query =
    `[out:json][timeout:120];way["highway"~"${WALKABLE_HIGHWAY}"](${BBOX});out body;>;out skel qt;`
  const raw = await fetchOverpass(query)

  const position = new Map<number, LngLat>()
  for (const e of raw.elements) {
    if (e.type === 'node' && e.lat !== undefined && e.lon !== undefined) {
      position.set(e.id, [e.lon, e.lat])
    }
  }
  const ways = raw.elements.filter((e) => e.type === 'way' && (e.nodes?.length ?? 0) >= 2)
  console.log(`Fetched ${ways.length} walkable ways, ${position.size} vertices.`)

  // Keep a way if ANY vertex is on campus, so a path leading to a door survives
  // even though most of it lies outside the district boundary.
  const onCampus = makeDistrictTest()
  const kept = ways.filter((w) => w.nodes!.some((n) => position.has(n) && onCampus(position.get(n)!)))
  console.log(`Clipped to KU districts: ${kept.length} ways.`)

  // Adjacency by OSM node id — a shared id IS a junction, no guessing.
  const adjacency = new Map<number, Set<number>>()
  const link = (a: number, b: number) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set())
    adjacency.get(a)!.add(b)
  }
  for (const w of kept) {
    const ns = w.nodes!.filter((n) => position.has(n))
    for (let i = 1; i < ns.length; i += 1) {
      if (ns[i - 1] === ns[i]) continue
      link(ns[i - 1], ns[i])
      link(ns[i], ns[i - 1])
    }
  }

  // Anything that is not exactly degree-2 is a decision point: a junction, a
  // dead end, or a fork. Everything else is geometry we can fold into an edge.
  const isJunction = (n: number) => (adjacency.get(n)?.size ?? 0) !== 2
  const junctions = [...adjacency.keys()].filter(isJunction)
  console.log(`Junctions: ${junctions.length} (from ${adjacency.size} vertices).`)

  type Edge = { from: number; to: number; between: LngLat[]; metres: number }
  const edges: Edge[] = []
  const walked = new Set<string>()

  for (const start of junctions) {
    for (const first of adjacency.get(start) ?? []) {
      if (walked.has(`${start}->${first}`)) continue
      const between: LngLat[] = []
      let prev = start
      let cur = first
      let metres = distanceMeters(position.get(start)!, position.get(first)!)
      walked.add(`${start}->${first}`)
      walked.add(`${first}->${start}`)
      while (!isJunction(cur)) {
        const next = [...(adjacency.get(cur) ?? [])].find((n) => n !== prev)
        if (next === undefined) break
        between.push(position.get(cur)!)
        metres += distanceMeters(position.get(cur)!, position.get(next)!)
        walked.add(`${cur}->${next}`)
        walked.add(`${next}->${cur}`)
        prev = cur
        cur = next
      }
      if (cur === start) continue // a loop back to itself carries no route
      edges.push({ from: start, to: cur, between, metres })
    }
  }

  // Drop everything outside the main network. The tail is stray fragments —
  // a stub of pavement clipped at the bbox edge, say — and keeping them would
  // let an origin snap onto an island it can never route out of.
  const componentOf = new Map<number, number>()
  const neighbours = new Map<number, number[]>()
  for (const e of edges) {
    neighbours.set(e.from, [...(neighbours.get(e.from) ?? []), e.to])
    neighbours.set(e.to, [...(neighbours.get(e.to) ?? []), e.from])
  }
  let componentCount = 0
  const sizes: number[] = []
  for (const j of junctions) {
    if (componentOf.has(j)) continue
    const id = componentCount++
    let size = 0
    const stack = [j]
    componentOf.set(j, id)
    while (stack.length) {
      const cur = stack.pop()!
      size += 1
      for (const n of neighbours.get(cur) ?? []) {
        if (!componentOf.has(n)) {
          componentOf.set(n, id)
          stack.push(n)
        }
      }
    }
    sizes[id] = size
  }
  const mainComponent = sizes.indexOf(Math.max(...sizes))
  const dropped = sizes.reduce((n, s, i) => (i === mainComponent ? n : n + s), 0)
  console.log(
    `Components: ${componentCount}. Keeping the largest (${sizes[mainComponent]} junctions), ` +
      `dropping ${dropped} junction(s) in ${componentCount - 1} fragment(s).`,
  )

  const keptEdges = edges.filter((e) => componentOf.get(e.from) === mainComponent)
  const keptNodes = junctions.filter((n) => componentOf.get(n) === mainComponent)

  // Sanity: is the network still reaching the buildings we care about?
  console.log('\nNearest path node to each building:')
  for (const b of buildings) {
    let best = Infinity
    for (const n of keptNodes) {
      const m = distanceMeters(b.coordinates, position.get(n)!)
      if (m < best) best = m
    }
    const flag = best > 60 ? '   <-- far; check coverage' : ''
    console.log(`  ${b.id.padEnd(14)} ${Math.round(best)}m${flag}`)
  }

  // Endpoints are stored once in `nodes`, so an edge only carries the vertices
  // BETWEEN them. That is ~40% of the geometry saved for free.
  const payload = {
    generated: 'scripts/fetch-paths.ts',
    source: 'OpenStreetMap contributors, ODbL',
    nodes: Object.fromEntries(
      keptNodes.map((n) => {
        const [lng, lat] = position.get(n)!
        return [String(n), [round(lng), round(lat)]]
      }),
    ),
    edges: keptEdges.map((e) => [
      String(e.from),
      String(e.to),
      e.between.map(([lng, lat]) => [round(lng), round(lat)]),
    ]),
  }

  mkdirSync(join('public', 'data'), { recursive: true })
  writeFileSync(OUTPUT, JSON.stringify(payload))

  const kb = (JSON.stringify(payload).length / 1024).toFixed(0)
  console.log(`\nWrote ${OUTPUT}: ${keptNodes.length} nodes, ${keptEdges.length} edges, ${kb} KB.`)
  console.log('Map building doors in src/data/campusGraph.ts using these node ids.')
}

await main()
