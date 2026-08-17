import { describe, expect, it } from 'vitest'
import { buildings } from './buildings'
import { buildingEntrances, edges, nodes } from './campusGraph'
import { footprints } from './footprints'
import { machines } from './machines'
import { findRoute } from '../lib/routing'
import { distanceMeters } from '../lib/location'

// Bounding box for the Lawrence area — catches lat/lng swaps and stray pastes.
const LNG_MIN = -95.35
const LNG_MAX = -95.15
const LAT_MIN = 38.9
const LAT_MAX = 39.0

describe('buildings', () => {
  it('have unique ids', () => {
    const ids = buildings.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('exist', () => {
    expect(buildings.length).toBeGreaterThan(0)
  })

  it('have [longitude, latitude] coordinates within the Lawrence area', () => {
    // Coordinates are [lng, lat] (GeoJSON order). Google Maps shows "lat, lng",
    // so a pasted-in-the-wrong-order pair lands far outside this bounding box.
    for (const building of buildings) {
      const [lng, lat] = building.coordinates
      expect(
        lng >= LNG_MIN && lng <= LNG_MAX,
        `longitude out of range for ${building.id}: ${lng} (did you paste "lat, lng" from Google Maps? This file uses [lng, lat])`,
      ).toBe(true)
      expect(
        lat >= LAT_MIN && lat <= LAT_MAX,
        `latitude out of range for ${building.id}: ${lat} (did you paste "lat, lng" from Google Maps? This file uses [lng, lat])`,
      ).toBe(true)
    }
  })

  it('have non-empty, strictly ascending floors', () => {
    for (const building of buildings) {
      expect(building.floors.length, `no floors for ${building.id}`).toBeGreaterThan(0)
      for (let i = 1; i < building.floors.length; i++) {
        expect(
          building.floors[i] > building.floors[i - 1],
          `floors not strictly ascending for ${building.id}`,
        ).toBe(true)
      }
    }
  })
})

describe('machines', () => {
  it('have unique ids', () => {
    const ids = machines.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('reference existing buildings', () => {
    const buildingIds = new Set(buildings.map((b) => b.id))
    for (const machine of machines) {
      expect(
        buildingIds.has(machine.buildingId),
        `machine ${machine.id} references missing building ${machine.buildingId}`,
      ).toBe(true)
    }
  })

  it('have unique slot codes within each machine', () => {
    for (const machine of machines) {
      const codes = machine.slots.map((s) => s.code)
      expect(new Set(codes).size, `duplicate slot code in ${machine.id}`).toBe(codes.length)
    }
  })

  it('have positive integer prices', () => {
    for (const machine of machines) {
      for (const slot of machine.slots) {
        expect(
          Number.isInteger(slot.priceCents) && slot.priceCents > 0,
          `bad price for ${machine.id} slot ${slot.code}: ${slot.priceCents}`,
        ).toBe(true)
      }
    }
  })

  it('have parseable lastUpdated dates', () => {
    for (const machine of machines) {
      expect(
        Number.isNaN(Date.parse(machine.lastUpdated)),
        `unparseable lastUpdated on ${machine.id}: ${machine.lastUpdated}`,
      ).toBe(false)
      expect(
        machine.lastUpdated,
        `lastUpdated not YYYY-MM-DD on ${machine.id}: ${machine.lastUpdated}`,
      ).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('have non-empty slot codes and items', () => {
    for (const machine of machines) {
      for (const slot of machine.slots) {
        expect(
          slot.code.trim() !== '',
          `empty slot code in ${machine.id}`,
        ).toBe(true)
        expect(
          slot.item.trim() !== '',
          `empty slot item in ${machine.id} slot ${slot.code}`,
        ).toBe(true)
      }
    }
  })

  it('are on floors their building actually has', () => {
    const byId = new Map(buildings.map((b) => [b.id, b]))
    for (const machine of machines) {
      const building = byId.get(machine.buildingId)
      expect(
        building !== undefined && building.floors.includes(machine.floor),
        `machine ${machine.id} is on floor ${machine.floor}, not in ${machine.buildingId}'s floors`,
      ).toBe(true)
    }
  })

  it('have positions inside the Lawrence area when present', () => {
    for (const machine of machines) {
      if (!machine.position) continue
      const [lng, lat] = machine.position
      expect(
        lng >= LNG_MIN && lng <= LNG_MAX,
        `position longitude out of range for ${machine.id}: ${lng} (did you paste "lat, lng" from Google Maps? This file uses [lng, lat])`,
      ).toBe(true)
      expect(
        lat >= LAT_MIN && lat <= LAT_MAX,
        `position latitude out of range for ${machine.id}: ${lat} (did you paste "lat, lng" from Google Maps? This file uses [lng, lat])`,
      ).toBe(true)
    }
  })
})

describe('footprints', () => {
  it('reference existing buildings', () => {
    const buildingIds = new Set(buildings.map((b) => b.id))
    for (const id of Object.keys(footprints)) {
      expect(buildingIds.has(id), `footprint for unknown building: ${id}`).toBe(true)
    }
  })

  it('have at least 3 vertices, all inside the Lawrence area', () => {
    for (const [id, polygon] of Object.entries(footprints)) {
      expect(polygon.length, `degenerate footprint for ${id}`).toBeGreaterThanOrEqual(3)
      for (const [lng, lat] of polygon) {
        expect(
          lng >= LNG_MIN && lng <= LNG_MAX && lat >= LAT_MIN && lat <= LAT_MAX,
          `footprint vertex out of range for ${id}: [${lng}, ${lat}]`,
        ).toBe(true)
      }
    }
  })

  it('lie near their building (centroid within 150 m of the pin)', () => {
    const byId = new Map(buildings.map((b) => [b.id, b]))
    for (const [id, polygon] of Object.entries(footprints)) {
      const building = byId.get(id)!
      let lngSum = 0
      let latSum = 0
      for (const [lng, lat] of polygon) {
        lngSum += lng
        latSum += lat
      }
      const centroid: [number, number] = [lngSum / polygon.length, latSum / polygon.length]
      const metersPerDegLng = 111_320 * Math.cos((centroid[1] * Math.PI) / 180)
      const dx = (centroid[0] - building.coordinates[0]) * metersPerDegLng
      const dy = (centroid[1] - building.coordinates[1]) * 111_320
      const distance = Math.hypot(dx, dy)
      expect(
        distance <= 150,
        `footprint centroid for ${id} is ${Math.round(distance)}m from its building pin — wrong polygon?`,
      ).toBe(true)
    }
  })
})

describe('campus graph', () => {
  it('has unique node ids', () => {
    const ids = nodes.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has node coordinates inside the Lawrence area', () => {
    for (const node of nodes) {
      const [lng, lat] = node.coordinates
      expect(
        lng >= LNG_MIN && lng <= LNG_MAX,
        `node longitude out of range for ${node.id}: ${lng} (did you paste "lat, lng"? This file uses [lng, lat])`,
      ).toBe(true)
      expect(
        lat >= LAT_MIN && lat <= LAT_MAX,
        `node latitude out of range for ${node.id}: ${lat} (did you paste "lat, lng"? This file uses [lng, lat])`,
      ).toBe(true)
    }
  })

  it('has edges that reference real nodes', () => {
    const nodeIds = new Set(nodes.map((n) => n.id))
    for (const edge of edges) {
      expect(nodeIds.has(edge.from), `edge references missing node: ${edge.from}`).toBe(true)
      expect(nodeIds.has(edge.to), `edge references missing node: ${edge.to}`).toBe(true)
    }
  })

  it('has no self-loop or duplicate edges', () => {
    const seen = new Set<string>()
    for (const edge of edges) {
      expect(edge.from !== edge.to, `self-loop edge on ${edge.from}`).toBe(true)
      // Edges are undirected, so a-b and b-a are the same edge.
      const key = [edge.from, edge.to].sort().join('::')
      expect(seen.has(key), `duplicate edge between ${edge.from} and ${edge.to}`).toBe(false)
      seen.add(key)
    }
  })

  it('maps building entrances to real buildings and real nodes', () => {
    const buildingIds = new Set(buildings.map((b) => b.id))
    const nodeIds = new Set(nodes.map((n) => n.id))
    for (const [buildingId, entranceIds] of Object.entries(buildingEntrances)) {
      expect(
        buildingIds.has(buildingId),
        `entrance mapped for unknown building: ${buildingId}`,
      ).toBe(true)
      // An empty array would silently disable routing to this building rather
      // than failing loudly — treat it as an authoring mistake.
      expect(
        entranceIds.length > 0,
        `${buildingId} has an empty entrance list; remove the key or add a door node`,
      ).toBe(true)
      expect(
        new Set(entranceIds).size === entranceIds.length,
        `${buildingId} lists the same entrance node more than once`,
      ).toBe(true)
      for (const nodeId of entranceIds) {
        expect(
          nodeIds.has(nodeId),
          `entrance for ${buildingId} references missing node: ${nodeId}`,
        ).toBe(true)
      }
    }
  })

  // A campus path graph is small: a mistyped coordinate digit (e.g.
  // -95.2478 -> -95.2578) moves a node ~870m and would otherwise pass every
  // check above while silently adding a huge detour to every route through
  // it. These two checks are vacuous on the empty graph and become
  // protective the moment real nodes are hand-typed in.

  it('has edges shorter than 400m (catches a coordinate typo, not a style rule)', () => {
    const nodeById = new Map(nodes.map((n) => [n.id, n]))
    for (const edge of edges) {
      const from = nodeById.get(edge.from)
      const to = nodeById.get(edge.to)
      if (!from || !to) continue // missing-node case is covered above
      const length = distanceMeters(from.coordinates, to.coordinates)
      expect(
        length < 400,
        `edge ${edge.from} <-> ${edge.to} is ${Math.round(length)}m long — a real campus path segment can run a couple hundred metres, but this is long enough to smell like a coordinate typo`,
      ).toBe(true)
    }
  })

  it('has every node within 500m of at least one building', () => {
    for (const node of nodes) {
      let nearest = Infinity
      for (const building of buildings) {
        const distance = distanceMeters(node.coordinates, building.coordinates)
        if (distance < nearest) nearest = distance
      }
      expect(
        nearest <= 500,
        `node ${node.id} is ${Math.round(nearest)}m from the nearest building — path nodes exist to connect buildings, so this is likely a coordinate typo`,
      ).toBe(true)
    }
  })

  // Deliberately NOT tested: full connectivity. Digitizing happens cluster by
  // cluster, so disconnected islands are an expected intermediate state —
  // routing between them returns null and the UI falls back to a straight line.

  // Both ends must be digitized before this can mean anything. Using skipIf
  // (rather than an early return) keeps an undigitized graph VISIBLE as a skip
  // in the test output instead of a passing test that asserted nothing.
  const wescoeEntrances = buildingEntrances['wescoe'] ?? []
  const budigEntrances = buildingEntrances['budig'] ?? []

  it.skipIf(!wescoeEntrances.length || !budigEntrances.length)(
    'routes between two buildings that should be connected',
    () => {
      // Any door to any door: the buildings are on the same network if some
      // pair connects. Keep the shortest so the distance band below is checked
      // against the route a visitor would actually walk.
      let route: ReturnType<typeof findRoute> = null
      for (const from of wescoeEntrances) {
        for (const to of budigEntrances) {
          const candidate = findRoute({ nodes, edges }, from, to)
          if (candidate && (!route || candidate.distanceMeters < route.distanceMeters)) {
            route = candidate
          }
        }
      }
      expect(route, 'wescoe and budig are both mapped but no path connects them').not.toBeNull()
      // Sanity band: far enough apart to be a real walk, close enough that a
      // wildly wrong path (e.g. routing through another district) fails here.
      expect(route!.distanceMeters).toBeGreaterThan(50)
      expect(route!.distanceMeters).toBeLessThan(1000)
    },
  )
})
