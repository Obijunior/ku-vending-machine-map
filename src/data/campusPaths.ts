import { useEffect, useState } from 'react'
import type { Coordinates } from './types'

// The campus walking network, generated from OpenStreetMap by
// scripts/fetch-paths.ts and served as a static asset.
//
// It is fetched rather than bundled: at ~220KB it has no business in the JS
// every visitor downloads, and routing only matters once someone sets a
// starting point. Until it arrives, callers fall back to straight-line
// distance and the Google Maps link — the same graceful path used for
// buildings that aren't on the network at all.

const PATHS_URL = `${import.meta.env.BASE_URL}data/campus-paths.json`

export type PathNode = {
  id: string
  coordinates: Coordinates
}

export type PathEdge = {
  from: string
  to: string
  /**
   * Vertices strictly BETWEEN the two endpoints. The endpoints live in `nodes`,
   * so storing them again here would repeat ~40% of the geometry for nothing.
   * Use `edgePolyline` to get the full line.
   */
  between: Coordinates[]
}

export type PathGraph = {
  nodes: Map<string, PathNode>
  edges: PathEdge[]
}

/** Full vertex list for an edge, from its `from` endpoint to its `to` endpoint. */
export function edgePolyline(graph: PathGraph, edge: PathEdge): Coordinates[] {
  const from = graph.nodes.get(edge.from)
  const to = graph.nodes.get(edge.to)
  if (!from || !to) return []
  return [from.coordinates, ...edge.between, to.coordinates]
}

type RawGraph = {
  nodes: Record<string, Coordinates>
  edges: [string, string, Coordinates[]][]
}

function parse(raw: RawGraph): PathGraph {
  const nodes = new Map<string, PathNode>()
  for (const [id, coordinates] of Object.entries(raw.nodes)) {
    nodes.set(id, { id, coordinates })
  }
  const edges = raw.edges.map(([from, to, between]) => ({ from, to, between }))
  return { nodes, edges }
}

// One in-flight request shared by every caller; one cached result afterwards.
let cached: PathGraph | null = null
let inFlight: Promise<PathGraph | null> | null = null

export function loadCampusPaths(): Promise<PathGraph | null> {
  if (cached) return Promise.resolve(cached)
  if (inFlight) return inFlight

  inFlight = fetch(PATHS_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`campus-paths.json returned ${response.status}`)
      return response.json() as Promise<RawGraph>
    })
    .then((raw) => {
      cached = parse(raw)
      return cached
    })
    .catch((error: unknown) => {
      // A missing or malformed network is not fatal: routing simply stays
      // unavailable and the straight-line fallback carries the UI.
      console.warn('Could not load the campus walking network; using straight-line distances.', error)
      inFlight = null
      return null
    })

  return inFlight
}

/** Already-loaded graph, or null. Does not trigger a fetch. */
export function getLoadedCampusPaths(): PathGraph | null {
  return cached
}

/**
 * Loads the network on first use and re-renders when it arrives.
 * Returns null until then, which callers treat as "no route available yet".
 */
export function useCampusPaths(enabled: boolean): PathGraph | null {
  const [graph, setGraph] = useState<PathGraph | null>(getLoadedCampusPaths)

  useEffect(() => {
    if (!enabled || graph) return
    let cancelled = false
    loadCampusPaths().then((loaded) => {
      if (!cancelled && loaded) setGraph(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [enabled, graph])

  return graph
}

/** Test seam: drop the cache so a suite can install its own graph. */
export function resetCampusPathsForTests(next: PathGraph | null = null) {
  cached = next
  inFlight = null
}
