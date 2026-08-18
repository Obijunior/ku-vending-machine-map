import { describe, expect, it, vi } from 'vitest'
import {
  getBuildingById,
  getMachineById,
  getMachinesForBuilding,
  getRouteToBuilding,
} from './queries'
import type { PathGraph } from './campusPaths'
import type { Coordinates } from './types'

// Only the entrance map is mocked. The network itself is passed in as an
// argument now, which keeps these tests independent of the generated asset.
//
// Budig deliberately has two doors at different distances from the quad, and
// the FAR one is listed first — so a naive implementation that took the first
// entrance would fail the "closest door" test rather than pass it by luck.
vi.mock('./campusGraph', () => ({
  buildingEntrances: {
    wescoe: ['n-wescoe-door'],
    budig: ['n-budig-far', 'n-budig-near'],
  },
}))

const graph: PathGraph = {
  nodes: new Map(
    (
      [
        ['n-quad', [-95.248, 38.957]],
        ['n-wescoe-door', [-95.2478, 38.9573]],
        ['n-budig-near', [-95.2482, 38.957]],
        ['n-budig-far', [-95.249, 38.957]],
      ] as [string, Coordinates][]
    ).map(([id, coordinates]) => [id, { id, coordinates }]),
  ),
  edges: [
    { from: 'n-quad', to: 'n-wescoe-door', between: [] },
    { from: 'n-quad', to: 'n-budig-near', between: [] },
    { from: 'n-budig-near', to: 'n-budig-far', between: [] },
  ],
}

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
    const route = getRouteToBuilding(graph, nearQuad, 'wescoe')
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
    const route = getRouteToBuilding(graph, onNode, 'wescoe')
    expect(route).not.toBeNull()
    expect(route!.path).toEqual([
      [-95.248, 38.957],
      [-95.2478, 38.9573],
    ])
  })

  it('routes to the closest door when a building has several', () => {
    const onQuad: Coordinates = [-95.248, 38.957]
    const route = getRouteToBuilding(graph, onQuad, 'budig')
    expect(route).not.toBeNull()
    // n-budig-near, not the n-budig-far listed ahead of it.
    expect(route!.path.at(-1)).toEqual([-95.2482, 38.957])
    // ~17m to the near door vs ~87m to the far one, so this cannot pass by luck.
    expect(route!.distanceMeters).toBeLessThan(40)
  })

  it('returns null for a building with no entrance on the graph', () => {
    expect(getRouteToBuilding(graph, nearQuad, 'anschutz')).toBeNull()
  })

  it('returns null for an unknown building', () => {
    expect(getRouteToBuilding(graph, nearQuad, 'nope')).toBeNull()
  })

  it('returns null while the network is still loading', () => {
    // The asset is fetched on demand, so null is a normal early state — the
    // caller keeps showing straight-line distance until it arrives.
    expect(getRouteToBuilding(null, nearQuad, 'wescoe')).toBeNull()
  })
})
