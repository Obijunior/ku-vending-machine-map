import { describe, expect, it } from 'vitest'
import { CAMPUS_PADDING_DEG, campusBounds } from './bounds'
import { buildings } from '../data/buildings'

describe('campusBounds', () => {
  it('contains every building', () => {
    const [[west, south], [east, north]] = campusBounds(buildings.map((b) => b.coordinates))
    for (const [lng, lat] of buildings.map((b) => b.coordinates)) {
      expect(lng).toBeGreaterThan(west)
      expect(lng).toBeLessThan(east)
      expect(lat).toBeGreaterThan(south)
      expect(lat).toBeLessThan(north)
    }
  })

  // Downtown Lawrence is inside the box on purpose — it's a walk from the Union.
  // What the fence is for is stopping a stray drag from loading half of Kansas.
  it('excludes other towns', () => {
    const [[west, south], [east, north]] = campusBounds(buildings.map((b) => b.coordinates))
    const kansasCity: [number, number] = [-94.5786, 39.0997]
    const topeka: [number, number] = [-95.6752, 39.0473]
    for (const [lng, lat] of [kansasCity, topeka]) {
      expect(lng > west && lng < east && lat > south && lat < north).toBe(false)
    }
  })

  it('pads a single point by the campus padding on all sides', () => {
    const p = CAMPUS_PADDING_DEG
    expect(campusBounds([[-95, 39]])).toEqual([
      [-95 - p, 39 - p],
      [-95 + p, 39 + p],
    ])
  })
})
