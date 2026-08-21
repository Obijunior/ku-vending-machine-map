import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildings } from './buildings'
import { buildingEntrances } from './campusGraph'
import { footprints } from './footprints'
import { machines } from './machines'
import { findRoute } from '../lib/routing'
import type { PathGraph } from './campusPaths'
import type { Coordinates } from './types'

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

  it('have URL-safe kebab-case ids', () => {
    // Ids become URLs (/building/:id). An empty or punctuation-leading id
    // produces a route that silently 404s, and uniqueness alone won't catch it.
    for (const building of buildings) {
      expect(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(building.id),
        `building id is not URL-safe kebab-case: '${building.id}' (${building.name})`,
      ).toBe(true)
    }
  })

  it('have non-empty names', () => {
    for (const building of buildings) {
      expect(building.name.trim() !== '', `empty name for ${building.id}`).toBe(true)
    }
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

  it('have positive integer prices when explicitly set', () => {
    // priceCents is optional — an omitted slot falls back to the campus-wide
    // default in itemPrices.ts — but an explicit override still has to be real money.
    for (const machine of machines) {
      for (const slot of machine.slots) {
        if (slot.priceCents === undefined) continue
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


describe('campus walking network', () => {
  // The network itself is generated from OpenStreetMap, so it needs no
  // typo guards — but the hand-authored entrance map points INTO it, and a
  // stale or mistyped node id there is exactly the mistake worth catching.
  const raw = JSON.parse(
    readFileSync('public/data/campus-paths.json', 'utf-8'),
  ) as { nodes: Record<string, Coordinates>; edges: [string, string, Coordinates[]][] }

  const graph: PathGraph = {
    nodes: new Map(
      Object.entries(raw.nodes).map(([id, coordinates]) => [id, { id, coordinates }]),
    ),
    edges: raw.edges.map(([from, to, between]) => ({ from, to, between })),
  }

  it('ships a network with nodes and edges', () => {
    expect(graph.nodes.size).toBeGreaterThan(100)
    expect(graph.edges.length).toBeGreaterThan(100)
  })

  it('has edges that reference real nodes', () => {
    for (const edge of graph.edges) {
      expect(graph.nodes.has(edge.from), `edge references missing node: ${edge.from}`).toBe(true)
      expect(graph.nodes.has(edge.to), `edge references missing node: ${edge.to}`).toBe(true)
    }
  })

  it('is one connected component, so any door can reach any other', () => {
    const neighbours = new Map<string, string[]>()
    for (const e of graph.edges) {
      neighbours.set(e.from, [...(neighbours.get(e.from) ?? []), e.to])
      neighbours.set(e.to, [...(neighbours.get(e.to) ?? []), e.from])
    }
    const first = graph.nodes.keys().next().value!
    const seen = new Set([first])
    const stack = [first]
    while (stack.length) {
      const cur = stack.pop()!
      for (const n of neighbours.get(cur) ?? []) {
        if (!seen.has(n)) {
          seen.add(n)
          stack.push(n)
        }
      }
    }
    expect(
      seen.size,
      `the network splits into islands — ${graph.nodes.size - seen.size} node(s) unreachable from the rest`,
    ).toBe(graph.nodes.size)
  })

  it('maps building entrances to real buildings and real network nodes', () => {
    const buildingIds = new Set(buildings.map((b) => b.id))
    for (const [buildingId, entranceIds] of Object.entries(buildingEntrances)) {
      expect(
        buildingIds.has(buildingId),
        `entrance mapped for unknown building: ${buildingId}`,
      ).toBe(true)
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
          graph.nodes.has(nodeId),
          `entrance for ${buildingId} references node ${nodeId}, which is not in campus-paths.json — re-run bun run fetch-paths, or fix the id`,
        ).toBe(true)
      }
    }
  })

  it('puts every mapped entrance close to its own building', () => {
    // A door node on the far side of campus means the id was copied from the
    // wrong place — cheap to do, invisible until someone routes there.
    const byId = new Map(buildings.map((b) => [b.id, b]))
    for (const [buildingId, entranceIds] of Object.entries(buildingEntrances)) {
      const building = byId.get(buildingId)
      if (!building) continue
      for (const nodeId of entranceIds) {
        const node = graph.nodes.get(nodeId)
        if (!node) continue
        const metres = Math.hypot(
          (node.coordinates[0] - building.coordinates[0]) *
            111_320 *
            Math.cos((building.coordinates[1] * Math.PI) / 180),
          (node.coordinates[1] - building.coordinates[1]) * 111_320,
        )
        expect(
          metres <= 200,
          `entrance ${nodeId} for ${buildingId} is ${Math.round(metres)}m from the building — wrong node?`,
        ).toBe(true)
      }
    }
  })

  const mapped = Object.entries(buildingEntrances)

  it.skipIf(mapped.length < 2)('routes between the first two mapped buildings', () => {
    const [[aId, aDoors], [bId, bDoors]] = mapped
    let route: ReturnType<typeof findRoute> = null
    for (const from of aDoors) {
      for (const to of bDoors) {
        const candidate = findRoute(graph, from, to)
        if (candidate && (!route || candidate.distanceMeters < route.distanceMeters)) {
          route = candidate
        }
      }
    }
    expect(route, `${aId} and ${bId} are both mapped but no path connects them`).not.toBeNull()
    expect(route!.distanceMeters).toBeGreaterThan(0)
  })
})
