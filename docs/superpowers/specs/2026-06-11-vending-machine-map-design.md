# KU Vending Machine Map — MVP Design

**Date:** 2026-06-11
**Status:** Approved

## Overview

A public, read-only web app that maps vending machines on the University of Kansas
Lawrence campus. Visitors see a 3D-tilted campus map, browse buildings, view each
machine's slot-by-slot inventory, and search for items ("where can I get Hot
Cheetos?"). The site owner maintains all data by editing TypeScript files in the
repo and redeploying — there is no backend and no admin UI.

A 3D indoor view per building is the long-term vision; this MVP designs the data
model so that view is purely additive later (phase 2).

## Decisions Made During Brainstorming

| Question | Decision |
|---|---|
| Audience | Public read-only; only the owner edits (community editing maybe later) |
| Phasing | MVP now; 3D indoor view is phase 2, data model must be 3D-ready |
| Data entry | Static TypeScript data files in repo; edit → commit → redeploy |
| Campus | University of Kansas, Lawrence (map centers on Jayhawk Blvd) |
| Inventory granularity | Slot-based (A1, A2, B1…) with item + price; placeholder data until surveyed |
| Layout | Split view: building sidebar + map (collapses to list/map toggle on mobile) |
| Machine inventory display | Simple list (slot code · item · price), not a machine-face grid |
| Item search | In MVP scope |
| Map technology | MapLibre GL with OpenFreeMap vector tiles (tilted camera, 3D extruded buildings) |

## Architecture & Stack

Fully static single-page app. No backend, no Supabase, no auth.

- **Tooling:** Bun, Vite, TypeScript, React 19 (existing scaffold, minus
  `@supabase/supabase-js`, `leaflet`, `react-leaflet`, `@types/leaflet`)
- **Map:** `maplibre-gl`, OpenFreeMap vector tiles, camera pitched ~45° with 3D
  extruded buildings, centered on Jayhawk Blvd
- **Routing:** `react-router-dom` — `/`, `/building/:id`, `/machine/:id`
- **Data:** typed TypeScript files in `src/data/`
- **Testing:** Vitest + Testing Library (existing setup)
- **Deployment:** `bun run build` → static `dist/`, host on GitHub Pages /
  Netlify / Cloudflare Pages. Inventory update = edit file, commit, push.

## Data Model

`src/data/types.ts`:

```ts
type Building = {
  id: string                    // "wescoe" — used in URLs
  name: string                  // "Wescoe Hall"
  coordinates: [number, number] // [lng, lat] — map marker + camera target
}

type VendingMachine = {
  id: string                    // "wescoe-2-snack"
  buildingId: string
  type: 'drink' | 'snack' | 'combo'
  brand?: string                // "Pepsi", "Coca-Cola"
  floor: number
  locationNote: string          // "by the elevators, across from room 2066"
  lastUpdated: string           // ISO date the owner last verified this machine
  slots: Slot[]
  position?: { x: number; y: number } // phase 2: spot on the floor plan for 3D
}

type Slot = {
  code: string                  // "A1"
  item: string                  // "Hot Cheetos"
  priceCents: number            // 175 — integer cents, no float money bugs
}
```

- `src/data/buildings.ts` exports `buildings: Building[]`
- `src/data/machines.ts` exports `machines: VendingMachine[]` (may split
  per-building later if it grows long)
- Seed with a handful of real KU buildings and made-up slot inventory; replace
  with surveyed data over time.

**Data-integrity test (Vitest):** unique building IDs, unique machine IDs, every
`machine.buildingId` references an existing building, slot codes unique within a
machine, `priceCents` a positive integer, `lastUpdated` parseable as a date. A
typo fails `bun test` instead of silently breaking the site.

**Item search** substring-matches `slot.item` across all machines — no separate
item catalog to maintain.

## UI & Components

**Desktop (>768px):** split view — sidebar ~360px, map fills the rest. Sidebar
content follows the URL:

- **`/` — building list:** search box on top; buildings listed with
  machine-count badge and machine-type icons. Click a building (in list or its
  map marker) → `/building/:id`.
- **`/building/:id` — building view:** back link, building name, machines
  listed with type, brand, floor, location note. Map camera flies to the
  building. Click a machine → `/machine/:id`.
- **`/machine/:id` — machine view:** slot list (code · item · price), floor,
  location note, last-updated date.

**Search:** filters as you type; matches building names and slot items
(case-insensitive substring). Item hits render with full context — e.g.
"Hot Cheetos · $1.75 — Wescoe Hall, Floor 2 snack machine" — and selecting one
navigates to that machine with the map flying along. Building-name hits keep the
building row UI.

**Map:** one marker per building that has machines (no markers for unmapped
buildings). Selected building's marker is visually highlighted. Camera flies +
tilts to the selected building.

**Mobile (≤768px):** same routes; sidebar and map become a toggle — list view by
default with a floating "Map" button.

**Component tree:**

```
App (routes, selection derived from URL)
├── MapView        — all MapLibre logic isolated here; props: markers, selection
└── Sidebar
    ├── SearchBox
    ├── BuildingList
    ├── BuildingDetail
    └── MachineDetail
```

Selection state lives in the URL. Everything else derives from the static data
files. No global state library.

## Edge Cases & Error Handling

- Unknown `/building/x` or `/machine/x`: friendly "not found" panel with link
  back to `/` (stale shared links must not crash).
- Map tile failure: sidebar remains fully functional; the app never depends on
  the map to work.
- Empty search results: "no matches" message with a hint.
- Machine with empty `slots`: show "inventory not surveyed yet" instead of an
  empty table.

## Testing

- Data-integrity suite (see Data Model).
- Component tests: search matching (building-name hits, item hits,
  case-insensitivity), URL → selection wiring, slot list rendering, not-found
  states.
- `MapView`: thin smoke test only — MapLibre isn't meaningfully testable in
  jsdom; verified by running the app.

## Phase 2 (Designed For, Not Built)

- `/building/:id` gains a 3D tab: react-three-fiber scene of simple extruded
  floor plates per floor, machine markers placed at each machine's `position`.
- Purely additive: data model already carries `floor` and `position`.
- Possible later: community editing (would reintroduce a backend), live-ish
  inventory status.

## Out of Scope for MVP

- Any backend, accounts, or admin UI
- 3D indoor building view
- Live inventory / stock levels (data is a "when full" snapshot)
- Machine-face grid rendering
- Mapping every KU building (only buildings present in the data appear)
