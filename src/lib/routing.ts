import type { Coordinates, GraphEdge, GraphNode } from '../data/types'
import { distanceMeters } from './location'

export type Graph = {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export type Route = {
  /** Node coordinates from start to end, ready to draw as a line. */
  path: Coordinates[]
  /** Sum of the edge lengths actually walked. */
  distanceMeters: number
}

/** The graph node closest to a point, or null if the graph is empty. */
export function nearestNode(graph: Graph, point: Coordinates): GraphNode | null {
  let best: GraphNode | null = null
  let bestDistance = Infinity
  for (const node of graph.nodes) {
    const distance = distanceMeters(point, node.coordinates)
    if (distance < bestDistance) {
      bestDistance = distance
      best = node
    }
  }
  return best
}

type Neighbor = { id: string; weight: number }

function buildAdjacency(
  edges: GraphEdge[],
  nodeById: Map<string, GraphNode>,
): Map<string, Neighbor[]> {
  const neighbors = new Map<string, Neighbor[]>()
  const link = (from: string, to: string, weight: number) => {
    const list = neighbors.get(from)
    if (list) list.push({ id: to, weight })
    else neighbors.set(from, [{ id: to, weight }])
  }

  for (const edge of edges) {
    const from = nodeById.get(edge.from)
    const to = nodeById.get(edge.to)
    // Dangling edges are caught by the integrity tests at edit time; skip them
    // here rather than throwing so a data typo can never white-screen the map.
    if (!from || !to) continue
    const weight = distanceMeters(from.coordinates, to.coordinates)
    link(from.id, to.id, weight)
    link(to.id, from.id, weight)
  }
  return neighbors
}

/**
 * Shortest walking path between two nodes, or null when either id is unknown
 * or no path exists (disconnected clusters are an expected state).
 */
export function findRoute(
  graph: Graph,
  fromNodeId: string,
  toNodeId: string,
): Route | null {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))
  const start = nodeById.get(fromNodeId)
  const end = nodeById.get(toNodeId)
  if (!start || !end) return null
  if (fromNodeId === toNodeId) return { path: [start.coordinates], distanceMeters: 0 }

  const neighbors = buildAdjacency(graph.edges, nodeById)
  const best = new Map<string, number>([[fromNodeId, 0]])
  const previous = new Map<string, string>()
  const settled = new Set<string>()

  for (;;) {
    // Linear scan for the nearest unsettled node. The campus graph is ~100
    // nodes, so a priority queue would add code without changing the feel.
    let current: string | null = null
    let currentDistance = Infinity
    for (const [id, distance] of best) {
      if (!settled.has(id) && distance < currentDistance) {
        current = id
        currentDistance = distance
      }
    }
    if (current === null) return null // exhausted the reachable component
    if (current === toNodeId) break

    settled.add(current)
    for (const neighbor of neighbors.get(current) ?? []) {
      if (settled.has(neighbor.id)) continue
      const candidate = currentDistance + neighbor.weight
      if (candidate < (best.get(neighbor.id) ?? Infinity)) {
        best.set(neighbor.id, candidate)
        previous.set(neighbor.id, current)
      }
    }
  }

  const path: Coordinates[] = []
  let cursor: string | undefined = toNodeId
  while (cursor !== undefined) {
    path.unshift(nodeById.get(cursor)!.coordinates)
    cursor = previous.get(cursor)
  }
  return { path, distanceMeters: best.get(toNodeId)! }
}
