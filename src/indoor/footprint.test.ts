import { describe, expect, it } from 'vitest'
import { buildingFootprint } from './footprint'
import { getBuildingById } from '../data/queries'
import type { Building } from '../data/types'

describe('buildingFootprint', () => {
  it('projects a real footprint around its centroid with a sane radius', () => {
    const result = buildingFootprint(getBuildingById('wescoe')!)
    expect(result.points.length).toBeGreaterThanOrEqual(3)
    // centered: average of points should be ~[0, 0]
    const avgX = result.points.reduce((s, [x]) => s + x, 0) / result.points.length
    const avgY = result.points.reduce((s, [, y]) => s + y, 0) / result.points.length
    expect(avgX).toBeCloseTo(0, 0)
    expect(avgY).toBeCloseTo(0, 0)
    // Wescoe is a large building: radius well above the floor, below absurd
    expect(result.radius).toBeGreaterThan(20)
    expect(result.radius).toBeLessThan(200)
  })

  it('falls back to a rectangle for buildings without footprints', () => {
    const fake: Building = {
      id: 'not-a-real-building',
      name: 'Fake',
      coordinates: [-95.25, 38.957],
      floors: [1],
    }
    const result = buildingFootprint(fake)
    expect(result.points).toHaveLength(4)
    expect(result.radius).toBe(15) // 24x16m rectangle corner is ~14.4m, floored to MIN_RADIUS
  })
})
