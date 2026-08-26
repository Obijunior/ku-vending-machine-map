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
export const buildingEntrances: Record<string, string[]> = {
    'ambler-rec': ['9492780929'],
    anschutz: ["9042208802"],
    blake: ['12158173401', '12158173402', '5726549621'],
    budig: ['9042208924', '10152383970', '9042193003', '9042208805', '10152383972'],
    'cap-fed': ['5729374304', '5729384221', '5729374310', '9042274729', '5729374319'],
    eaton: ['9061394837', '11532678153', '11532678155'],
    fraser: ['9440253155', '9440253156', '9440253178', '9440253174'],
    leep2: ['11532678154', '9056427904', '5729294321'],
    learned: ['5729364379', '9056679181'],
    ritchie: ['6318580513', '6062365617', '2271141506', '9459304455'],
    slawson: ['6318580513', '12953182843', '1767026052'],
    snow: ['11532688320', '2498364347', '7015092963'],
    strong: ['1822459863', '1822459865'],
    wescoe: ["5721555659", "9440290945", "5721555658", "9061344687"],
};
