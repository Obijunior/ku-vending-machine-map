import { describe, expect, it, vi } from 'vitest'
import {
  getBuildingById,
  getMachineById,
  getMachinesForBuilding,
  getRouteToBuilding,
} from './queries'
import type { Coordinates } from './types'

// A two-node stand-in for the real campus graph, so these tests don't depend on
// how much of campus has actually been digitized yet.
vi.mock('./campusGraph', () => ({
  nodes: [
    { id: 'n-quad', coordinates: [-95.2480, 38.9570] },
    { id: 'n-wescoe-door', coordinates: [-95.2478, 38.9573] },
  ],
  edges: [{ from: 'n-quad', to: 'n-wescoe-door' }],
  buildingEntrances: { wescoe: 'n-wescoe-door' },
}))

describe('getBuildingById', () => {
  it('returns the building for a known id', () => {
    expect(getBuildingById('wescoe')?.name).toBe('Wescoe Hall')
  })

  it('returns undefined for an unknown id', () => {
    expect(getBuildingById('nope')).toBeUndefined()
  })
})

describe('getMachineById', () => {
  it('returns the machine for a known id', () => {
    expect(getMachineById('wescoe-2-snack')?.type).toBe('snack')
  })

  it('returns undefined for an unknown id', () => {
    expect(getMachineById('nope')).toBeUndefined()
  })
})

describe('getMachinesForBuilding', () => {
  it('returns all machines in a building', () => {
    const ids = getMachinesForBuilding('wescoe').map((m) => m.id)
    expect(ids).toEqual(['wescoe-2-snack', 'wescoe-2-drink'])
  })

  it('returns an empty array for an unknown building', () => {
    expect(getMachinesForBuilding('nope')).toEqual([])
  })
})

describe('getRouteToBuilding', () => {
  const nearQuad: Coordinates = [-95.24801, 38.95701]

  it('routes from the nearest node to the building entrance', () => {
    const route = getRouteToBuilding(nearQuad, 'wescoe')
    expect(route).not.toBeNull()
    expect(route!.path).toEqual([
      [-95.248, 38.957],
      [-95.2478, 38.9573],
    ])
    expect(route!.distanceMeters).toBeGreaterThan(0)
  })

  it('returns null for a building with no entrance on the graph', () => {
    expect(getRouteToBuilding(nearQuad, 'budig')).toBeNull()
  })

  it('returns null for an unknown building', () => {
    expect(getRouteToBuilding(nearQuad, 'nope')).toBeNull()
  })
})
