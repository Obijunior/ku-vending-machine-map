import { describe, expect, it } from 'vitest'
import {
  FLOOR_GAP,
  FLOOR_HEIGHT,
  centroid,
  fallbackRectangle,
  floorElevation,
  lngLatToLocal,
} from './projection'

describe('centroid', () => {
  it('returns the average of the points', () => {
    const result = centroid([
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ])
    expect(result[0]).toBeCloseTo(1)
    expect(result[1]).toBeCloseTo(1)
  })
})

describe('lngLatToLocal', () => {
  it('maps the origin to [0, 0]', () => {
    const origin: [number, number] = [-95.2478, 38.9573]
    expect(lngLatToLocal(origin, origin)).toEqual([0, 0])
  })

  it('converts latitude offsets to ~111.32 m per 0.001 degree', () => {
    const origin: [number, number] = [-95.2478, 38.9573]
    const [, north] = lngLatToLocal([-95.2478, 38.9583], origin)
    expect(north).toBeCloseTo(111.32, 1)
  })

  it('converts longitude offsets scaled by cos(latitude)', () => {
    const origin: [number, number] = [-95.2478, 38.9573]
    const [east] = lngLatToLocal([-95.2468, 38.9573], origin)
    // 111320 * cos(38.9573°) * 0.001 ≈ 86.6 m
    expect(east).toBeCloseTo(86.6, 0)
  })

  it('gives negative offsets west and south of the origin', () => {
    const origin: [number, number] = [-95.2478, 38.9573]
    const [east, north] = lngLatToLocal([-95.2488, 38.9563], origin)
    expect(east).toBeLessThan(0)
    expect(north).toBeLessThan(0)
  })
})

describe('floorElevation', () => {
  it('stacks floors in ascending order', () => {
    const floors = [1, 2, 3]
    expect(floorElevation(1, floors)).toBe(0)
    expect(floorElevation(2, floors)).toBeCloseTo(FLOOR_HEIGHT + FLOOR_GAP)
    expect(floorElevation(3, floors)).toBeCloseTo(2 * (FLOOR_HEIGHT + FLOOR_GAP))
  })

  it('handles basements (floor 0 at the bottom)', () => {
    expect(floorElevation(0, [0, 1, 2])).toBe(0)
    expect(floorElevation(1, [0, 1, 2])).toBeCloseTo(FLOOR_HEIGHT + FLOOR_GAP)
  })

  it('tolerates unsorted floors input', () => {
    expect(floorElevation(2, [3, 1, 2])).toBeCloseTo(FLOOR_HEIGHT + FLOOR_GAP)
  })
})

describe('fallbackRectangle', () => {
  it('returns 4 corners centered on the given point', () => {
    const center: [number, number] = [-95.2478, 38.9573]
    const rect = fallbackRectangle(center)
    expect(rect).toHaveLength(4)
    const mid = centroid(rect)
    expect(mid[0]).toBeCloseTo(center[0], 6)
    expect(mid[1]).toBeCloseTo(center[1], 6)
  })

  it('projects to roughly 24 m x 16 m', () => {
    const center: [number, number] = [-95.2478, 38.9573]
    const rect = fallbackRectangle(center).map((p) => lngLatToLocal(p, center))
    const xs = rect.map(([x]) => x)
    const ys = rect.map(([, y]) => y)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(24, 1)
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(16, 1)
  })
})
