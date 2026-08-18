import { describe, expect, it } from 'vitest'
import { findRoute, nearestNode } from './routing'
import { distanceMeters } from './location'
import type { PathGraph } from '../data/campusPaths'
import type { Coordinates } from '../data/types'

// A synthetic graph. Laid out along one latitude so distances are easy to
// reason about:
//
//   a ---- b ---- c        a-b-c is the direct chain
//    \____ d ____/         a-d-c detours south and is strictly longer
//
const A: Coordinates = [-95.25, 38.957]
const B: Coordinates = [-95.249, 38.957]
const C: Coordinates = [-95.248, 38.957]
const D: Coordinates = [-95.249, 38.956]

// b-c bulges north through this vertex rather than running straight, so a
// route over it must report the bulge's length and draw through it.
const BULGE: Coordinates = [-95.2485, 38.9575]

function graphOf(
  nodes: [string, Coordinates][],
  edges: [string, string, Coordinates[]][],
): PathGraph {
  return {
    nodes: new Map(nodes.map(([id, coordinates]) => [id, { id, coordinates }])),
    edges: edges.map(([from, to, between]) => ({ from, to, between })),
  }
}

const graph = graphOf(
  [
    ['a', A],
    ['b', B],
    ['c', C],
    ['d', D],
  ],
  [
    ['a', 'b', []],
    ['b', 'c', [BULGE]],
    ['a', 'd', []],
    ['d', 'c', []],
  ],
)

const disconnected = graphOf(
  [
    ['island-1', A],
    ['island-2', C],
  ],
  [],
)

describe('nearestNode', () => {
  it('returns the closest node to a point', () => {
    expect(nearestNode(graph, [-95.2481, 38.9571])?.id).toBe('c')
  })

  it('returns the node itself when the point is a node', () => {
    expect(nearestNode(graph, B)?.id).toBe('b')
  })

  it('returns null for an empty graph', () => {
    expect(nearestNode(graphOf([], []), A)).toBeNull()
  })
})

describe('findRoute', () => {
  it('takes the shorter of two available paths', () => {
    const route = findRoute(graph, 'a', 'c')
    expect(route).not.toBeNull()
    // via b (even with its bulge) rather than down through d
    expect(route!.path).toContainEqual(B)
    expect(route!.path).not.toContainEqual(D)
  })

  it('draws through the polyline rather than cutting junction to junction', () => {
    const route = findRoute(graph, 'a', 'c')
    expect(route!.path).toEqual([A, B, BULGE, C])
  })

  it('counts the polyline length, not the straight line between junctions', () => {
    const route = findRoute(graph, 'b', 'c')
    const throughBulge = distanceMeters(B, BULGE) + distanceMeters(BULGE, C)
    expect(route!.distanceMeters).toBeCloseTo(throughBulge, 6)
    // The bulge is a real detour, so it must exceed the straight b->c line.
    expect(route!.distanceMeters).toBeGreaterThan(distanceMeters(B, C))
  })

  it('reports distance as the sum of its edge lengths', () => {
    const route = findRoute(graph, 'a', 'c')
    const expected =
      distanceMeters(A, B) + distanceMeters(B, BULGE) + distanceMeters(BULGE, C)
    expect(route!.distanceMeters).toBeCloseTo(expected, 6)
  })

  it('routes in both directions over undirected edges', () => {
    const route = findRoute(graph, 'c', 'a')
    // Same vertices, reversed — including the intermediate bulge.
    expect(route!.path).toEqual([C, BULGE, B, A])
  })

  it('never repeats a vertex where two edges meet', () => {
    const route = findRoute(graph, 'a', 'c')
    for (let i = 1; i < route!.path.length; i += 1) {
      expect(route!.path[i]).not.toEqual(route!.path[i - 1])
    }
  })

  it('returns a zero-length route when start and end are the same node', () => {
    expect(findRoute(graph, 'b', 'b')).toEqual({ path: [B], distanceMeters: 0 })
  })

  it('returns null when the two nodes are in disconnected components', () => {
    expect(findRoute(disconnected, 'island-1', 'island-2')).toBeNull()
  })

  it('returns null for unknown node ids', () => {
    expect(findRoute(graph, 'a', 'nope')).toBeNull()
    expect(findRoute(graph, 'nope', 'a')).toBeNull()
  })

  it('handles a graph large enough to matter without bogging down', () => {
    // A 2,000-node chain: bigger than the real campus network, and slow enough
    // to notice if the frontier ever regresses to a linear scan.
    const nodes: [string, Coordinates][] = []
    const edges: [string, string, Coordinates[]][] = []
    for (let i = 0; i < 2000; i += 1) {
      nodes.push([`n${i}`, [-95.25 + i * 0.0001, 38.957]])
      if (i > 0) edges.push([`n${i - 1}`, `n${i}`, []])
    }
    const big = graphOf(nodes, edges)
    const started = performance.now()
    const route = findRoute(big, 'n0', 'n1999')
    expect(route).not.toBeNull()
    expect(route!.path).toHaveLength(2000)
    expect(performance.now() - started).toBeLessThan(1000)
  })
})
