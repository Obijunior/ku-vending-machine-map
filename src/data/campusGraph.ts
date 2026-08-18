// Which node of the campus walking network each building's doors sit on.
//
// The network itself is NOT here: it is generated from OpenStreetMap by
// scripts/fetch-paths.ts into public/data/campus-paths.json and fetched at
// runtime. This file holds the one thing OSM cannot tell us — which junction
// counts as a given building's entrance — so it stays hand-authored.
//
// Node ids are OpenStreetMap node ids, which is what makes this file durable:
// re-running the import keeps the same ids, so these mappings survive.
//
// Finding an id: run `bun run fetch-paths`, then look in
// public/data/campus-paths.json for nodes near the building. See
// CONTRIBUTING.md for the workflow.
//
// This map is allowed to be incomplete. A building that isn't listed falls
// back to straight-line distance and the Google Maps link — nothing breaks.

/**
 * Building id -> the nodes at that building's doors, in no particular order.
 *
 * List every door you map. Routing tries them all and keeps the shortest, so
 * a visitor approaching Budig from the north is not sent around to a south
 * door. A building with one door just gets a one-element array.
 */
export const buildingEntrances: Record<string, string[]> = {}
