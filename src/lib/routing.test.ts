import { describe, expect, it } from 'vitest'
import { findRoute, nearestNode, type Graph } from './routing'
import { distanceMeters } from './location'
import type { Coordinates } from '../data/types'

// A synthetic 4-node graph. Laid out west-to-east along one latitude so the
// expected distances are easy to reason about:
//
//   a ---- b ---- c        (a-b-c is the direct chain)
//    \____ d ____/         (a-d-c is a detour that is strictly longer)
//
const A: Coordinates = [-95.25, 38.957]
const B: Coordinates = [-95.249, 38.957]
const C: Coordinates = [-95.248, 38.957]
const D: Coordinates = [-95.249, 38.956]

const graph: Graph = {
  nodes: [
    { id: 'a', coordinates: A },
    { id: 'b', coordinates: B },
    { id: 'c', coordinates: C },
    { id: 'd', coordinates: D },
  ],
  edges: [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
    { from: 'a', to: 'd' },
    { from: 'd', to: 'c' },
  ],
}

const disconnected: Graph = {
  nodes: [
    { id: 'island-1', coordinates: A },
    { id: 'island-2', coordinates: C },
  ],
  edges: [],
}

describe('nearestNode', () => {
  it('returns the closest node to a point', () => {
    const result = nearestNode(graph, [-95.2481, 38.9571])
    expect(result?.id).toBe('c')
  })

  it('returns the node itself when the point is a node', () => {
    expect(nearestNode(graph, B)?.id).toBe('b')
  })

  it('returns null for an empty graph', () => {
    expect(nearestNode({ nodes: [], edges: [] }, A)).toBeNull()
  })
})

describe('findRoute', () => {
  it('takes the shorter of two available paths', () => {
    const route = findRoute(graph, 'a', 'c')
    expect(route).not.toBeNull()
    expect(route!.path).toEqual([A, B, C])
  })

  it('reports distance as the sum of its edge lengths', () => {
    const route = findRoute(graph, 'a', 'c')
    const expected = distanceMeters(A, B) + distanceMeters(B, C)
    expect(route!.distanceMeters).toBeCloseTo(expected, 6)
  })

  it('routes in both directions over undirected edges', () => {
    const route = findRoute(graph, 'c', 'a')
    expect(route!.path).toEqual([C, B, A])
  })

  it('returns a zero-length route when start and end are the same node', () => {
    const route = findRoute(graph, 'b', 'b')
    expect(route).toEqual({ path: [B], distanceMeters: 0 })
  })

  it('returns null when the two nodes are in disconnected components', () => {
    expect(findRoute(disconnected, 'island-1', 'island-2')).toBeNull()
  })

  it('returns null for unknown node ids', () => {
    expect(findRoute(graph, 'a', 'nope')).toBeNull()
    expect(findRoute(graph, 'nope', 'a')).toBeNull()
  })
})
