import { describe, expect, it, vi } from 'vitest'
import {
  getBuildingById,
  getMachineById,
  getMachinesForBuilding,
  getRouteToBuilding,
} from './queries'
import type { Coordinates } from './types'

// A small stand-in for the real campus graph, so these tests don't depend on
// how much of campus has actually been digitized yet.
//
// Budig deliberately has two doors at different distances from the quad, and
// the FAR one is listed first — so a naive implementation that took the first
// entrance would fail the "closest door" test rather than pass it by luck.
vi.mock('./campusGraph', () => ({
  nodes: [
    { id: 'n-quad', coordinates: [-95.2480, 38.9570] },
    { id: 'n-wescoe-door', coordinates: [-95.2478, 38.9573] },
    { id: 'n-budig-near', coordinates: [-95.2482, 38.9570] },
    { id: 'n-budig-far', coordinates: [-95.2490, 38.9570] },
  ],
  edges: [
    { from: 'n-quad', to: 'n-wescoe-door' },
    { from: 'n-quad', to: 'n-budig-near' },
    { from: 'n-budig-near', to: 'n-budig-far' },
  ],
  buildingEntrances: {
    wescoe: ['n-wescoe-door'],
    budig: ['n-budig-far', 'n-budig-near'],
  },
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

  it('routes from the origin, through the nearest node, to the building entrance', () => {
    const route = getRouteToBuilding(nearQuad, 'wescoe')
    expect(route).not.toBeNull()
    expect(route!.path).toEqual([
      nearQuad,
      [-95.248, 38.957],
      [-95.2478, 38.9573],
    ])
    expect(route!.distanceMeters).toBeGreaterThan(0)
  })

  it('does not duplicate the vertex when the origin sits exactly on a node', () => {
    const onNode: Coordinates = [-95.248, 38.957]
    const route = getRouteToBuilding(onNode, 'wescoe')
    expect(route).not.toBeNull()
    expect(route!.path).toEqual([
      [-95.248, 38.957],
      [-95.2478, 38.9573],
    ])
  })

  it('routes to the closest door when a building has several', () => {
    const onQuad: Coordinates = [-95.248, 38.957]
    const route = getRouteToBuilding(onQuad, 'budig')
    expect(route).not.toBeNull()
    // n-budig-near, not the n-budig-far listed ahead of it.
    expect(route!.path.at(-1)).toEqual([-95.2482, 38.957])
    // ~17m to the near door vs ~87m to the far one, so this cannot pass by luck.
    expect(route!.distanceMeters).toBeLessThan(40)
  })

  it('returns null for a building with no entrance on the graph', () => {
    expect(getRouteToBuilding(nearQuad, 'anschutz')).toBeNull()
  })

  it('returns null for an unknown building', () => {
    expect(getRouteToBuilding(nearQuad, 'nope')).toBeNull()
  })
})
