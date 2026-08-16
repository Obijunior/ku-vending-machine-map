import type { GraphEdge, GraphNode } from './types'

// Hand-authored walking-path network for the KU Lawrence campus.
//
// Coordinates are [longitude, latitude] — Google Maps shows "lat, lng", so flip
// the pair when pasting. See CONTRIBUTING.md for the geojson.io authoring
// workflow.
//
// This file is intentionally allowed to be incomplete. Buildings absent from
// `buildingEntrances`, and origins with no reachable path, fall back to the
// straight-line distance and the Google Maps link — nothing breaks.

export const nodes: GraphNode[] = []

export const edges: GraphEdge[] = []

/** Building id -> id of the node at that building's entrance. */
export const buildingEntrances: Record<string, string> = {}
