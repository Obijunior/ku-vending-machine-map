import { describe, expect, it } from 'vitest'
import { buildings } from './buildings'
import { footprints } from './footprints'
import { machines } from './machines'

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
