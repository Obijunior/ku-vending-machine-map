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

/**
 * Building id -> the nodes at that building's doors, in no particular order.
 *
 * List every door you digitize. Routing tries them all and keeps the shortest,
 * so a visitor approaching Budig from the north is not sent around to a south
 * door. A building with one door just gets a one-element array.
 */
export const buildingEntrances: Record<string, string[]> = {}
