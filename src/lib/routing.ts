import type { Coordinates } from '../data/types'
import { edgePolyline, type PathGraph, type PathNode } from '../data/campusPaths'
import { distanceMeters } from './location'

export type Route = {
  /** Every vertex from start to end, ready to draw as a line. */
  path: Coordinates[]
  /** Sum of the polyline lengths actually walked. */
  distanceMeters: number
}

/** The graph node closest to a point, or null if the graph is empty. */
export function nearestNode(graph: PathGraph, point: Coordinates): PathNode | null {
  let best: PathNode | null = null
  let bestDistance = Infinity
  for (const node of graph.nodes.values()) {
    const distance = distanceMeters(point, node.coordinates)
    if (distance < bestDistance) {
      bestDistance = distance
      best = node
    }
  }
  return best
}

function polylineMetres(points: Coordinates[]): number {
  let total = 0
  for (let i = 1; i < points.length; i += 1) {
    total += distanceMeters(points[i - 1], points[i])
  }
  return total
}

type Link = {
  to: string
  weight: number
  /** Vertices from this side of the edge to the other, in walking order. */
  polyline: Coordinates[]
}

/**
 * Adjacency is derived once per graph and memoised, because a single page view
 * routes several times (the map pane and the detail panel each ask) and the
 * graph object is stable for the lifetime of the app.
 */
const adjacencyCache = new WeakMap<PathGraph, Map<string, Link[]>>()

function adjacencyFor(graph: PathGraph): Map<string, Link[]> {
  const cachedAdjacency = adjacencyCache.get(graph)
  if (cachedAdjacency) return cachedAdjacency

  const links = new Map<string, Link[]>()
  const push = (from: string, link: Link) => {
    const list = links.get(from)
    if (list) list.push(link)
    else links.set(from, [link])
  }

  for (const edge of graph.edges) {
    const forward = edgePolyline(graph, edge)
    // A dangling edge means the generator emitted an id it never wrote a node
    // for. Skip rather than throw: bad data should not white-screen the map.
    if (forward.length < 2) continue
    const weight = polylineMetres(forward)
    push(edge.from, { to: edge.to, weight, polyline: forward })
    push(edge.to, { to: edge.from, weight, polyline: [...forward].reverse() })
  }

  adjacencyCache.set(graph, links)
  return links
}

/**
 * Minimal binary min-heap keyed by distance.
 *
 * The campus graph is ~1,400 junctions, where a linear scan for the next
 * nearest node costs O(V^2) — a few million comparisons per query, several
 * times per navigation. A heap makes the same search effectively instant.
 */
class MinHeap {
  private items: { id: string; dist: number }[] = []

  get size(): number {
    return this.items.length
  }

  push(id: string, dist: number) {
    const items = this.items
    items.push({ id, dist })
    let i = items.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (items[parent].dist <= items[i].dist) break
      ;[items[parent], items[i]] = [items[i], items[parent]]
      i = parent
    }
  }

  pop(): { id: string; dist: number } | undefined {
    const items = this.items
    if (items.length === 0) return undefined
    const top = items[0]
    const last = items.pop()!
    if (items.length > 0) {
      items[0] = last
      let i = 0
      for (;;) {
        const left = i * 2 + 1
        const right = left + 1
        let smallest = i
        if (left < items.length && items[left].dist < items[smallest].dist) smallest = left
        if (right < items.length && items[right].dist < items[smallest].dist) smallest = right
        if (smallest === i) break
        ;[items[smallest], items[i]] = [items[i], items[smallest]]
        i = smallest
      }
    }
    return top
  }
}

/**
 * Shortest walking path between two nodes, or null when either id is unknown
 * or no path exists.
 *
 * The returned path follows each edge's full polyline rather than jumping
 * junction to junction — otherwise a drawn route would cut straight across
 * whatever the real sidewalk curves around.
 */
export function findRoute(
  graph: PathGraph,
  fromNodeId: string,
  toNodeId: string,
): Route | null {
  const start = graph.nodes.get(fromNodeId)
  const end = graph.nodes.get(toNodeId)
  if (!start || !end) return null
  if (fromNodeId === toNodeId) return { path: [start.coordinates], distanceMeters: 0 }

  const links = adjacencyFor(graph)
  const best = new Map<string, number>([[fromNodeId, 0]])
  const cameBy = new Map<string, Link & { from: string }>()
  const settled = new Set<string>()
  const queue = new MinHeap()
  queue.push(fromNodeId, 0)

  while (queue.size > 0) {
    const current = queue.pop()!
    if (settled.has(current.id)) continue // a stale entry left by a better path
    if (current.id === toNodeId) break
    settled.add(current.id)

    for (const link of links.get(current.id) ?? []) {
      if (settled.has(link.to)) continue
      const candidate = current.dist + link.weight
      if (candidate < (best.get(link.to) ?? Infinity)) {
        best.set(link.to, candidate)
        cameBy.set(link.to, { ...link, from: current.id })
        queue.push(link.to, candidate)
      }
    }
  }

  const total = best.get(toNodeId)
  if (total === undefined || !cameBy.has(toNodeId)) return null

  // Walk back to the start, stitching each edge's polyline in walking order.
  const segments: Coordinates[][] = []
  let cursor = toNodeId
  while (cursor !== fromNodeId) {
    const step = cameBy.get(cursor)
    if (!step) return null
    segments.push(step.polyline)
    cursor = step.from
  }
  segments.reverse()

  const path: Coordinates[] = [start.coordinates]
  for (const segment of segments) {
    // Skip each segment's first vertex — it is the previous segment's last.
    for (let i = 1; i < segment.length; i += 1) path.push(segment[i])
  }

  return { path, distanceMeters: total }
}
