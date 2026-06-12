# KU Vending Machine Map MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static SPA mapping KU Lawrence vending machines — tilted 3D campus map, building sidebar, slot-level machine inventory, and item search.

**Architecture:** Fully static React SPA; all data lives in typed TypeScript files in `src/data/`. Selection state lives in the URL (`/`, `/building/:id`, `/machine/:id`); a split-view layout renders a sidebar (routes) beside a MapLibre map, collapsing to a list/map toggle on mobile. All MapLibre logic is isolated in one component.

**Tech Stack:** Bun, Vite, TypeScript, React 19, react-router-dom v7, maplibre-gl (OpenFreeMap vector tiles), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-11-vending-machine-map-design.md`

**Conventions for all tasks:**
- Run all commands from the repo root (`vending-machine-map/`). Shell is PowerShell; the commands below work there.
- Run single test files with `bunx vitest run <path>`; run everything with `bun run test`.
- Component tests reference the seed data (Wescoe Hall, Hot Cheetos, etc.). If you change seed data, update the tests that mention it.

---

### Task 1: Commit scaffold, swap dependencies, delete dead code

The repo has one commit (the design spec). The Vite scaffold is staged but uncommitted. Commit it untouched first so every later diff is reviewable, then swap Leaflet/Supabase for MapLibre.

**Files:**
- Delete: `src/supabaseClient.ts`, `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`
- Modify: `package.json` (dependencies; `test` script)

- [ ] **Step 1: Commit the staged scaffold as-is**

```bash
git commit -m "chore: initial Vite + React + TypeScript scaffold"
```

Expected: commit created containing the staged scaffold files (App.tsx, vite.config.ts, etc.).

- [ ] **Step 2: Swap dependencies**

```bash
bun remove @supabase/supabase-js leaflet react-leaflet @types/leaflet
bun add maplibre-gl
```

Expected: both succeed; `package.json` dependencies are now `maplibre-gl`, `react`, `react-dom`, `react-router-dom`.

- [ ] **Step 3: Make the test script non-interactive**

In `package.json`, change:

```json
"test": "vitest"
```

to:

```json
"test": "vitest run"
```

(`vitest` alone starts watch mode, which hangs non-interactive runs.)

- [ ] **Step 4: Confirm the dead files are unreferenced, then delete them**

```bash
git grep -n "supabaseClient\|hero.png\|react.svg\|vite.svg" -- src index.html
```

Expected: no output — `git grep` exits with code 1 when nothing matches; that exit code is the pass condition here. Then delete:

```bash
git rm src/supabaseClient.ts src/assets/hero.png src/assets/react.svg src/assets/vite.svg
```

- [ ] **Step 5: Verify the build still works**

```bash
bun run build
```

Expected: `tsc -b` passes and Vite reports `✓ built in …` with no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: swap Leaflet/Supabase for maplibre-gl, drop unused assets"
```

---

### Task 2: Data model — types, seed data, integrity tests

**Files:**
- Create: `src/data/types.ts`
- Create: `src/data/buildings.ts`
- Create: `src/data/machines.ts`
- Test: `src/data/integrity.test.ts`

- [ ] **Step 1: Write the failing integrity test**

Create `src/data/integrity.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildings } from './buildings'
import { machines } from './machines'

describe('buildings', () => {
  it('have unique ids', () => {
    const ids = buildings.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('exist', () => {
    expect(buildings.length).toBeGreaterThan(0)
  })
})

describe('machines', () => {
  it('have unique ids', () => {
    const ids = machines.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('reference existing buildings', () => {
    const buildingIds = new Set(buildings.map((b) => b.id))
    for (const machine of machines) {
      expect(
        buildingIds.has(machine.buildingId),
        `machine ${machine.id} references missing building ${machine.buildingId}`,
      ).toBe(true)
    }
  })

  it('have unique slot codes within each machine', () => {
    for (const machine of machines) {
      const codes = machine.slots.map((s) => s.code)
      expect(new Set(codes).size, `duplicate slot code in ${machine.id}`).toBe(codes.length)
    }
  })

  it('have positive integer prices', () => {
    for (const machine of machines) {
      for (const slot of machine.slots) {
        expect(
          Number.isInteger(slot.priceCents) && slot.priceCents > 0,
          `bad price for ${machine.id} slot ${slot.code}: ${slot.priceCents}`,
        ).toBe(true)
      }
    }
  })

  it('have parseable lastUpdated dates', () => {
    for (const machine of machines) {
      expect(
        Number.isNaN(Date.parse(machine.lastUpdated)),
        `unparseable lastUpdated on ${machine.id}: ${machine.lastUpdated}`,
      ).toBe(false)
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
bunx vitest run src/data/integrity.test.ts
```

Expected: FAIL — cannot resolve `./buildings` / `./machines`.

- [ ] **Step 3: Create the types**

Create `src/data/types.ts`:

```ts
export type Building = {
  /** URL-safe unique id, e.g. "wescoe" */
  id: string
  name: string
  /** [longitude, latitude] — map marker + camera target */
  coordinates: [number, number]
}

export type MachineType = 'drink' | 'snack' | 'combo'

export type Slot = {
  /** Slot code as printed on the machine, e.g. "A1" */
  code: string
  item: string
  /** Integer cents, e.g. 175 = $1.75 */
  priceCents: number
}

export type VendingMachine = {
  /** Unique id, e.g. "wescoe-2-snack" */
  id: string
  buildingId: string
  type: MachineType
  brand?: string
  floor: number
  locationNote: string
  /** ISO date (YYYY-MM-DD) the data was last verified */
  lastUpdated: string
  /** Empty array = machine exists but inventory not surveyed yet */
  slots: Slot[]
  /** Phase 2: position on the floor plan for the 3D view */
  position?: { x: number; y: number }
}
```

- [ ] **Step 4: Create the seed buildings**

Create `src/data/buildings.ts`:

```ts
import type { Building } from './types'

// Coordinates are approximate (eyeballed from OpenStreetMap); refine during surveys.
export const buildings: Building[] = [
  { id: 'wescoe', name: 'Wescoe Hall', coordinates: [-95.247, 38.9579] },
  { id: 'budig', name: 'Budig Hall', coordinates: [-95.2456, 38.9577] },
  { id: 'anschutz', name: 'Anschutz Library', coordinates: [-95.2453, 38.9566] },
  { id: 'kansas-union', name: 'Kansas Union', coordinates: [-95.2445, 38.9598] },
]
```

- [ ] **Step 5: Create the seed machines**

Create `src/data/machines.ts` (placeholder inventory until machines are surveyed in person):

```ts
import type { VendingMachine } from './types'

// Inventory is placeholder data until each machine is surveyed in person.
export const machines: VendingMachine[] = [
  {
    id: 'wescoe-2-snack',
    buildingId: 'wescoe',
    type: 'snack',
    floor: 2,
    locationNote: 'Main hallway, by the elevators',
    lastUpdated: '2026-06-11',
    slots: [
      { code: 'A1', item: 'Snickers', priceCents: 175 },
      { code: 'A2', item: 'Oreos', priceCents: 150 },
      { code: 'A3', item: 'Pretzels', priceCents: 125 },
      { code: 'B1', item: "Lay's Classic", priceCents: 150 },
      { code: 'B2', item: 'Hot Cheetos', priceCents: 175 },
      { code: 'B3', item: 'Cheez-It', priceCents: 150 },
    ],
  },
  {
    id: 'wescoe-2-drink',
    buildingId: 'wescoe',
    type: 'drink',
    brand: 'Pepsi',
    floor: 2,
    locationNote: 'Main hallway, by the elevators',
    lastUpdated: '2026-06-11',
    slots: [
      { code: '1', item: 'Pepsi', priceCents: 200 },
      { code: '2', item: 'Diet Pepsi', priceCents: 200 },
      { code: '3', item: 'Mountain Dew', priceCents: 200 },
      { code: '4', item: 'Aquafina Water', priceCents: 150 },
    ],
  },
  {
    id: 'budig-1-combo',
    buildingId: 'budig',
    type: 'combo',
    floor: 1,
    locationNote: 'Lobby outside the lecture halls',
    lastUpdated: '2026-06-11',
    slots: [
      { code: 'A1', item: 'Doritos Nacho', priceCents: 150 },
      { code: 'A2', item: 'Pop-Tarts', priceCents: 175 },
      { code: 'C1', item: 'Coca-Cola', priceCents: 200 },
      { code: 'C2', item: 'Sprite', priceCents: 200 },
    ],
  },
  {
    id: 'anschutz-1-drink',
    buildingId: 'anschutz',
    type: 'drink',
    brand: 'Coca-Cola',
    floor: 1,
    locationNote: 'Entry level, near the study commons',
    lastUpdated: '2026-06-11',
    slots: [
      { code: '1', item: 'Coca-Cola', priceCents: 200 },
      { code: '2', item: 'Sprite', priceCents: 200 },
      { code: '3', item: 'Dasani Water', priceCents: 150 },
    ],
  },
  {
    id: 'anschutz-3-snack',
    buildingId: 'anschutz',
    type: 'snack',
    floor: 3,
    locationNote: 'Third floor study area',
    lastUpdated: '2026-06-11',
    slots: [], // not surveyed yet — exercises the "inventory not surveyed" UI
  },
  {
    id: 'kansas-union-1-drink',
    buildingId: 'kansas-union',
    type: 'drink',
    brand: 'Pepsi',
    floor: 1,
    locationNote: 'Ground floor, by the bowling alley',
    lastUpdated: '2026-06-11',
    slots: [
      { code: '1', item: 'Pepsi', priceCents: 225 },
      { code: '2', item: 'Gatorade Cool Blue', priceCents: 250 },
      { code: '3', item: 'Starbucks Frappuccino', priceCents: 350 },
    ],
  },
]
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
bunx vitest run src/data/integrity.test.ts
```

Expected: PASS — 7 tests.

- [ ] **Step 7: Commit**

```bash
git add src/data
git commit -m "feat: add data model and seed data with integrity tests"
```

---

### Task 3: Query and formatting helpers

**Files:**
- Create: `src/data/queries.ts`
- Create: `src/lib/format.ts`
- Test: `src/data/queries.test.ts`
- Test: `src/lib/format.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/data/queries.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getBuildingById, getMachineById, getMachinesForBuilding } from './queries'

describe('getBuildingById', () => {
  it('returns the building for a known id', () => {
    expect(getBuildingById('wescoe')?.name).toBe('Wescoe Hall')
  })

  it('returns undefined for an unknown id', () => {
    expect(getBuildingById('nope')).toBeUndefined()
  })
})

describe('getMachineById', () => {
  it('returns the machine for a known id', () => {
    expect(getMachineById('wescoe-2-snack')?.type).toBe('snack')
  })

  it('returns undefined for an unknown id', () => {
    expect(getMachineById('nope')).toBeUndefined()
  })
})

describe('getMachinesForBuilding', () => {
  it('returns all machines in a building', () => {
    const ids = getMachinesForBuilding('wescoe').map((m) => m.id)
    expect(ids).toEqual(['wescoe-2-snack', 'wescoe-2-drink'])
  })

  it('returns an empty array for an unknown building', () => {
    expect(getMachinesForBuilding('nope')).toEqual([])
  })
})
```

Create `src/lib/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatPrice, machineLabel } from './format'
import type { VendingMachine } from '../data/types'

describe('formatPrice', () => {
  it('formats cents as dollars', () => {
    expect(formatPrice(175)).toBe('$1.75')
  })

  it('pads whole-dollar amounts', () => {
    expect(formatPrice(200)).toBe('$2.00')
  })

  it('handles amounts over ten dollars', () => {
    expect(formatPrice(1050)).toBe('$10.50')
  })
})

function machineWith(overrides: Partial<VendingMachine>): VendingMachine {
  return {
    id: 'test',
    buildingId: 'test',
    type: 'snack',
    floor: 1,
    locationNote: '',
    lastUpdated: '2026-06-11',
    slots: [],
    ...overrides,
  }
}

describe('machineLabel', () => {
  it('labels a branded drink machine', () => {
    expect(machineLabel(machineWith({ type: 'drink', brand: 'Pepsi' }))).toBe(
      'Pepsi drink machine',
    )
  })

  it('labels an unbranded snack machine', () => {
    expect(machineLabel(machineWith({ type: 'snack' }))).toBe('Snack machine')
  })

  it('labels a combo machine', () => {
    expect(machineLabel(machineWith({ type: 'combo' }))).toBe('Snack & drink machine')
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
bunx vitest run src/data/queries.test.ts src/lib/format.test.ts
```

Expected: FAIL — cannot resolve `./queries` / `./format`.

- [ ] **Step 3: Implement the helpers**

Create `src/data/queries.ts`:

```ts
import { buildings } from './buildings'
import { machines } from './machines'
import type { Building, VendingMachine } from './types'

export function getBuildingById(id: string): Building | undefined {
  return buildings.find((b) => b.id === id)
}

export function getMachineById(id: string): VendingMachine | undefined {
  return machines.find((m) => m.id === id)
}

export function getMachinesForBuilding(buildingId: string): VendingMachine[] {
  return machines.filter((m) => m.buildingId === buildingId)
}
```

Create `src/lib/format.ts`:

```ts
import type { VendingMachine } from '../data/types'

export function formatPrice(priceCents: number): string {
  return `$${(priceCents / 100).toFixed(2)}`
}

export function machineLabel(machine: VendingMachine): string {
  const base =
    machine.type === 'combo'
      ? 'Snack & drink machine'
      : machine.type === 'drink'
        ? 'Drink machine'
        : 'Snack machine'
  return machine.brand ? `${machine.brand} ${base[0].toLowerCase()}${base.slice(1)}` : base
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
bunx vitest run src/data/queries.test.ts src/lib/format.test.ts
```

Expected: PASS — 12 tests across both files.

- [ ] **Step 5: Commit**

```bash
git add src/data/queries.ts src/data/queries.test.ts src/lib
git commit -m "feat: add data query and formatting helpers"
```

---

### Task 4: Search

Pure function: matches building names and slot items, case-insensitive substring. Empty/whitespace query returns all buildings and no item hits.

**Files:**
- Create: `src/lib/search.ts`
- Test: `src/lib/search.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/search.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { search } from './search'
import { buildings } from '../data/buildings'
import { machines } from '../data/machines'

describe('search', () => {
  it('returns all buildings and no items for an empty query', () => {
    const results = search('', buildings, machines)
    expect(results.buildings).toEqual(buildings)
    expect(results.items).toEqual([])
  })

  it('treats whitespace-only queries as empty', () => {
    const results = search('   ', buildings, machines)
    expect(results.buildings).toEqual(buildings)
    expect(results.items).toEqual([])
  })

  it('matches building names case-insensitively', () => {
    const results = search('WESCOE', buildings, machines)
    expect(results.buildings.map((b) => b.id)).toEqual(['wescoe'])
  })

  it('matches slot items with full context', () => {
    const results = search('hot cheetos', buildings, machines)
    expect(results.buildings).toEqual([])
    expect(results.items).toHaveLength(1)
    const hit = results.items[0]
    expect(hit.slot.code).toBe('B2')
    expect(hit.machine.id).toBe('wescoe-2-snack')
    expect(hit.building.id).toBe('wescoe')
  })

  it('finds an item across multiple machines', () => {
    const results = search('pepsi', buildings, machines)
    const machineIds = results.items.map((hit) => hit.machine.id)
    expect(machineIds).toContain('wescoe-2-drink')
    expect(machineIds).toContain('kansas-union-1-drink')
  })

  it('returns nothing for a query with no matches', () => {
    const results = search('zzzz', buildings, machines)
    expect(results.buildings).toEqual([])
    expect(results.items).toEqual([])
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
bunx vitest run src/lib/search.test.ts
```

Expected: FAIL — cannot resolve `./search`.

- [ ] **Step 3: Implement search**

Create `src/lib/search.ts`:

```ts
import type { Building, Slot, VendingMachine } from '../data/types'

export type ItemHit = {
  slot: Slot
  machine: VendingMachine
  building: Building
}

export type SearchResults = {
  buildings: Building[]
  items: ItemHit[]
}

export function search(
  query: string,
  allBuildings: Building[],
  allMachines: VendingMachine[],
): SearchResults {
  const q = query.trim().toLowerCase()
  if (q === '') return { buildings: allBuildings, items: [] }

  const buildingsById = new Map(allBuildings.map((b) => [b.id, b]))
  const matchedBuildings = allBuildings.filter((b) => b.name.toLowerCase().includes(q))

  const items: ItemHit[] = []
  for (const machine of allMachines) {
    const building = buildingsById.get(machine.buildingId)
    if (!building) continue
    for (const slot of machine.slots) {
      if (slot.item.toLowerCase().includes(q)) {
        items.push({ slot, machine, building })
      }
    }
  }

  return { buildings: matchedBuildings, items }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
bunx vitest run src/lib/search.test.ts
```

Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search.ts src/lib/search.test.ts
git commit -m "feat: add building and item search"
```

---

### Task 5: BuildingList component (sidebar root view)

Search box + results. Empty query: all buildings with machine counts and type icons. Non-empty: item hits section + matching buildings section; "no matches" message when both empty.

**Files:**
- Create: `src/components/BuildingList.tsx`
- Test: `src/components/BuildingList.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/BuildingList.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import BuildingList from './BuildingList'

function renderList() {
  render(
    <MemoryRouter>
      <BuildingList />
    </MemoryRouter>,
  )
}

describe('BuildingList', () => {
  it('lists every building with its machine count', () => {
    renderList()
    expect(screen.getByRole('link', { name: /Wescoe Hall/ })).toHaveTextContent('2 machines')
    expect(screen.getByRole('link', { name: /Budig Hall/ })).toHaveTextContent('1 machine')
    expect(screen.getByRole('link', { name: /Anschutz Library/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Kansas Union/ })).toBeInTheDocument()
  })

  it('filters buildings by name as you type', async () => {
    const user = userEvent.setup()
    renderList()
    await user.type(screen.getByRole('searchbox'), 'wescoe')
    expect(screen.getByRole('link', { name: /Wescoe Hall/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Kansas Union/ })).not.toBeInTheDocument()
  })

  it('shows item hits with price and machine context', async () => {
    const user = userEvent.setup()
    renderList()
    await user.type(screen.getByRole('searchbox'), 'hot cheetos')
    const hit = screen.getByRole('link', { name: /Hot Cheetos/ })
    expect(hit).toHaveTextContent('$1.75')
    expect(hit).toHaveTextContent('Wescoe Hall')
    expect(hit).toHaveAttribute('href', '/machine/wescoe-2-snack')
  })

  it('shows a message when nothing matches', async () => {
    const user = userEvent.setup()
    renderList()
    await user.type(screen.getByRole('searchbox'), 'zzzz')
    expect(screen.getByText(/no matches/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
bunx vitest run src/components/BuildingList.test.tsx
```

Expected: FAIL — cannot resolve `./BuildingList`.

- [ ] **Step 3: Implement the component**

Create `src/components/BuildingList.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { buildings } from '../data/buildings'
import { machines } from '../data/machines'
import { getMachinesForBuilding } from '../data/queries'
import { formatPrice, machineLabel } from '../lib/format'
import { search } from '../lib/search'
import type { MachineType } from '../data/types'

const TYPE_ICONS: Record<MachineType, string> = {
  drink: '🥤',
  snack: '🍫',
  combo: '🥤🍫',
}

export default function BuildingList() {
  const [query, setQuery] = useState('')
  const results = search(query, buildings, machines)
  const searching = query.trim() !== ''
  const nothingFound = results.buildings.length === 0 && results.items.length === 0

  return (
    <div className="building-list">
      <input
        type="search"
        className="search-box"
        placeholder="Search buildings or snacks…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search buildings or items"
      />

      {searching && results.items.length > 0 && (
        <section>
          <h2 className="section-label">Items</h2>
          <ul className="result-list">
            {results.items.map(({ slot, machine, building }) => (
              <li key={`${machine.id}-${slot.code}`}>
                <Link to={`/machine/${machine.id}`} className="result-row">
                  <span className="result-title">
                    {slot.item} · {formatPrice(slot.priceCents)}
                  </span>
                  <span className="result-sub">
                    {building.name} · Floor {machine.floor} · {machineLabel(machine)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {nothingFound ? (
        <p className="empty-note">No matches — try a building name or a snack.</p>
      ) : (
        results.buildings.length > 0 && (
          <section>
            {searching && <h2 className="section-label">Buildings</h2>}
            <ul className="result-list">
              {results.buildings.map((building) => {
                const buildingMachines = getMachinesForBuilding(building.id)
                return (
                  <li key={building.id}>
                    <Link to={`/building/${building.id}`} className="result-row">
                      <span className="result-title">{building.name}</span>
                      <span className="result-sub">
                        {buildingMachines.length} machine
                        {buildingMachines.length === 1 ? '' : 's'}{' '}
                        {buildingMachines.map((m) => TYPE_ICONS[m.type]).join(' ')}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
bunx vitest run src/components/BuildingList.test.tsx
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/BuildingList.tsx src/components/BuildingList.test.tsx
git commit -m "feat: add building list with search"
```

---

### Task 6: NotFound and BuildingDetail components

**Files:**
- Create: `src/components/NotFound.tsx`
- Create: `src/components/BuildingDetail.tsx`
- Test: `src/components/BuildingDetail.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/BuildingDetail.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import BuildingDetail from './BuildingDetail'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/building/:id" element={<BuildingDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BuildingDetail', () => {
  it('shows the building name and its machines', () => {
    renderAt('/building/wescoe')
    expect(screen.getByRole('heading', { name: 'Wescoe Hall' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Snack machine/ })).toHaveAttribute(
      'href',
      '/machine/wescoe-2-snack',
    )
    expect(screen.getByRole('link', { name: /Pepsi drink machine/ })).toHaveAttribute(
      'href',
      '/machine/wescoe-2-drink',
    )
  })

  it('shows floor and location for each machine', () => {
    renderAt('/building/wescoe')
    expect(screen.getAllByText(/Floor 2 · Main hallway, by the elevators/)).toHaveLength(2)
  })

  it('shows not-found for an unknown building', () => {
    renderAt('/building/nope')
    expect(screen.getByRole('heading', { name: /not found/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /all buildings/i })).toHaveAttribute('href', '/')
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
bunx vitest run src/components/BuildingDetail.test.tsx
```

Expected: FAIL — cannot resolve `./BuildingDetail`.

- [ ] **Step 3: Implement the components**

Create `src/components/NotFound.tsx`:

```tsx
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="not-found">
      <h2>Not found</h2>
      <p>That building or machine isn't on the map (yet).</p>
      <Link to="/" className="back-link">
        ← All buildings
      </Link>
    </div>
  )
}
```

Create `src/components/BuildingDetail.tsx`:

```tsx
import { Link, useParams } from 'react-router-dom'
import { getBuildingById, getMachinesForBuilding } from '../data/queries'
import { machineLabel } from '../lib/format'
import NotFound from './NotFound'

export default function BuildingDetail() {
  const { id } = useParams()
  const building = id ? getBuildingById(id) : undefined
  if (!building) return <NotFound />

  const buildingMachines = getMachinesForBuilding(building.id)

  return (
    <div className="building-detail">
      <Link to="/" className="back-link">
        ← All buildings
      </Link>
      <h2>{building.name}</h2>
      {buildingMachines.length === 0 ? (
        <p className="empty-note">No machines recorded here yet.</p>
      ) : (
        <ul className="result-list">
          {buildingMachines.map((machine) => (
            <li key={machine.id}>
              <Link to={`/machine/${machine.id}`} className="result-row">
                <span className="result-title">{machineLabel(machine)}</span>
                <span className="result-sub">
                  Floor {machine.floor} · {machine.locationNote}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
bunx vitest run src/components/BuildingDetail.test.tsx
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/NotFound.tsx src/components/BuildingDetail.tsx src/components/BuildingDetail.test.tsx
git commit -m "feat: add building detail and not-found views"
```

---

### Task 7: MachineDetail component

**Files:**
- Create: `src/components/MachineDetail.tsx`
- Test: `src/components/MachineDetail.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/MachineDetail.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import MachineDetail from './MachineDetail'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/machine/:id" element={<MachineDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MachineDetail', () => {
  it('shows the slot inventory with formatted prices', () => {
    renderAt('/machine/wescoe-2-snack')
    expect(screen.getByRole('heading', { name: 'Snack machine' })).toBeInTheDocument()
    const row = screen.getByText('Hot Cheetos').closest('tr')!
    expect(row).toHaveTextContent('B2')
    expect(row).toHaveTextContent('$1.75')
  })

  it('links back to its building', () => {
    renderAt('/machine/wescoe-2-snack')
    expect(screen.getByRole('link', { name: /Wescoe Hall/ })).toHaveAttribute(
      'href',
      '/building/wescoe',
    )
  })

  it('shows floor, location, and last-updated date', () => {
    renderAt('/machine/wescoe-2-snack')
    expect(screen.getByText(/Floor 2 · Main hallway, by the elevators/)).toBeInTheDocument()
    expect(screen.getByText(/Last verified 2026-06-11/)).toBeInTheDocument()
  })

  it('shows a message for machines with no surveyed inventory', () => {
    renderAt('/machine/anschutz-3-snack')
    expect(screen.getByText(/inventory not surveyed yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows not-found for an unknown machine', () => {
    renderAt('/machine/nope')
    expect(screen.getByRole('heading', { name: /not found/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
bunx vitest run src/components/MachineDetail.test.tsx
```

Expected: FAIL — cannot resolve `./MachineDetail`.

- [ ] **Step 3: Implement the component**

Create `src/components/MachineDetail.tsx`:

```tsx
import { Link, useParams } from 'react-router-dom'
import { getBuildingById, getMachineById } from '../data/queries'
import { formatPrice, machineLabel } from '../lib/format'
import NotFound from './NotFound'

export default function MachineDetail() {
  const { id } = useParams()
  const machine = id ? getMachineById(id) : undefined
  const building = machine ? getBuildingById(machine.buildingId) : undefined
  if (!machine || !building) return <NotFound />

  return (
    <div className="machine-detail">
      <Link to={`/building/${building.id}`} className="back-link">
        ← {building.name}
      </Link>
      <h2>{machineLabel(machine)}</h2>
      <p className="machine-meta">
        Floor {machine.floor} · {machine.locationNote}
      </p>
      {machine.slots.length === 0 ? (
        <p className="empty-note">Inventory not surveyed yet.</p>
      ) : (
        <table className="slot-table">
          <thead>
            <tr>
              <th>Slot</th>
              <th>Item</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {machine.slots.map((slot) => (
              <tr key={slot.code}>
                <td className="slot-code">{slot.code}</td>
                <td>{slot.item}</td>
                <td className="slot-price">{formatPrice(slot.priceCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="updated-note">Last verified {machine.lastUpdated}</p>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
bunx vitest run src/components/MachineDetail.test.tsx
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/MachineDetail.tsx src/components/MachineDetail.test.tsx
git commit -m "feat: add machine detail view with slot inventory"
```

---

### Task 8: MapView component

All MapLibre logic lives here: map init (tilted camera, OpenFreeMap style), one marker per building, marker click navigates, selection highlights + flyTo. jsdom can't run MapLibre, so the test mocks `maplibre-gl` and only smoke-tests rendering — real verification is manual in Task 9.

**Files:**
- Create: `src/components/MapView.tsx`
- Test: `src/components/MapView.test.tsx`

- [ ] **Step 1: Write the failing smoke test**

Create `src/components/MapView.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import MapView from './MapView'
import { buildings } from '../data/buildings'

vi.mock('maplibre-gl', () => {
  class Marker {
    private el: HTMLElement
    constructor(options: { element: HTMLElement }) {
      this.el = options.element
    }
    setLngLat() {
      return this
    }
    addTo() {
      return this
    }
    getElement() {
      return this.el
    }
    remove() {}
  }
  class Map {
    addControl() {
      return this
    }
    flyTo() {}
    remove() {}
  }
  class NavigationControl {}
  return { Map, Marker, NavigationControl }
})

describe('MapView', () => {
  it('renders the map container without crashing', () => {
    render(
      <MemoryRouter>
        <MapView buildings={buildings} selectedBuildingId={null} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('map')).toBeInTheDocument()
  })

  it('renders with a selected building without crashing', () => {
    render(
      <MemoryRouter>
        <MapView buildings={buildings} selectedBuildingId="wescoe" />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('map')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
bunx vitest run src/components/MapView.test.tsx
```

Expected: FAIL — cannot resolve `./MapView`.

- [ ] **Step 3: Implement the component**

Create `src/components/MapView.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { Map as MaplibreMap, Marker, NavigationControl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useNavigate } from 'react-router-dom'
import type { Building } from '../data/types'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const CAMPUS_CENTER: [number, number] = [-95.2462, 38.958]

type Props = {
  buildings: Building[]
  selectedBuildingId: string | null
}

export default function MapView({ buildings, selectedBuildingId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MaplibreMap | null>(null)
  const markersRef = useRef(new Map<string, Marker>())
  const navigate = useNavigate()

  useEffect(() => {
    if (!containerRef.current) return
    const map = new MaplibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: CAMPUS_CENTER,
      zoom: 15.5,
      pitch: 45,
    })
    map.addControl(new NavigationControl({ visualizePitch: true }))
    mapRef.current = map

    for (const building of buildings) {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'map-marker'
      el.title = building.name
      el.addEventListener('click', () => navigate(`/building/${building.id}`))
      const marker = new Marker({ element: el }).setLngLat(building.coordinates).addTo(map)
      markersRef.current.set(building.id, marker)
    }

    const markers = markersRef.current
    return () => {
      map.remove()
      mapRef.current = null
      markers.clear()
    }
    // Buildings come from a static module and never change at runtime,
    // and navigate is stable — init the map exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      marker.getElement().classList.toggle('map-marker--selected', id === selectedBuildingId)
    }
    const selected = buildings.find((b) => b.id === selectedBuildingId)
    if (selected && mapRef.current) {
      mapRef.current.flyTo({ center: selected.coordinates, zoom: 17.5, pitch: 55 })
    }
  }, [selectedBuildingId, buildings])

  return <div ref={containerRef} className="map-container" data-testid="map" />
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
bunx vitest run src/components/MapView.test.tsx
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/MapView.tsx src/components/MapView.test.tsx
git commit -m "feat: add MapLibre campus map with building markers"
```

---

### Task 9: App shell — layout, routing, styles, mobile toggle

Wires everything together: split-view layout, routes in the sidebar, selection derived from the URL and passed to MapView, mobile list/map toggle, and the full stylesheet. Ends with manual verification in the browser.

**Files:**
- Modify: `src/App.tsx` (replace entirely)
- Modify: `src/App.css` (replace entirely)
- Modify: `src/index.css` (replace entirely)
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppLayout } from './App'

vi.mock('./components/MapView', () => ({
  default: () => <div data-testid="map-stub" />,
}))

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppLayout />
    </MemoryRouter>,
  )
}

describe('AppLayout', () => {
  it('shows the building list and map at the root', () => {
    renderAt('/')
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Wescoe Hall/ })).toBeInTheDocument()
    expect(screen.getByTestId('map-stub')).toBeInTheDocument()
  })

  it('navigates from building list to building detail', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('link', { name: /Wescoe Hall/ }))
    expect(screen.getByRole('heading', { name: 'Wescoe Hall' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pepsi drink machine/ })).toBeInTheDocument()
  })

  it('navigates from building detail to machine detail', async () => {
    const user = userEvent.setup()
    renderAt('/building/wescoe')
    await user.click(screen.getByRole('link', { name: /Pepsi drink machine/ }))
    expect(screen.getByText('Mountain Dew')).toBeInTheDocument()
  })

  it('shows not-found for unknown routes', () => {
    renderAt('/garbage')
    expect(screen.getByRole('heading', { name: /not found/i })).toBeInTheDocument()
  })

  it('toggles between list and map on mobile', async () => {
    const user = userEvent.setup()
    renderAt('/')
    const toggle = screen.getByRole('button', { name: /map/i })
    await user.click(toggle)
    expect(screen.getByRole('button', { name: /list/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

```bash
bunx vitest run src/App.test.tsx
```

Expected: FAIL — `AppLayout` is not exported from `./App`.

- [ ] **Step 3: Replace App.tsx**

Replace the entire contents of `src/App.tsx` with:

```tsx
import { useState } from 'react'
import { BrowserRouter, Route, Routes, matchPath, useLocation } from 'react-router-dom'
import { buildings } from './data/buildings'
import { getMachineById } from './data/queries'
import BuildingDetail from './components/BuildingDetail'
import BuildingList from './components/BuildingList'
import MachineDetail from './components/MachineDetail'
import MapView from './components/MapView'
import NotFound from './components/NotFound'
import './App.css'

function useSelectedBuildingId(): string | null {
  const { pathname } = useLocation()
  const buildingMatch = matchPath('/building/:id', pathname)
  if (buildingMatch?.params.id) return buildingMatch.params.id
  const machineMatch = matchPath('/machine/:id', pathname)
  if (machineMatch?.params.id) {
    return getMachineById(machineMatch.params.id)?.buildingId ?? null
  }
  return null
}

export function AppLayout() {
  const selectedBuildingId = useSelectedBuildingId()
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')

  return (
    <div className="app">
      <aside className={`sidebar ${mobileView === 'map' ? 'mobile-hidden' : ''}`}>
        <header className="app-header">
          <h1>KU Vending</h1>
          <p>Vending machines across the Lawrence campus</p>
        </header>
        <Routes>
          <Route path="/" element={<BuildingList />} />
          <Route path="/building/:id" element={<BuildingDetail />} />
          <Route path="/machine/:id" element={<MachineDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </aside>
      <div className={`map-pane ${mobileView === 'list' ? 'mobile-hidden' : ''}`}>
        <MapView buildings={buildings} selectedBuildingId={selectedBuildingId} />
      </div>
      <button
        type="button"
        className="mobile-toggle"
        onClick={() => setMobileView(mobileView === 'list' ? 'map' : 'list')}
      >
        {mobileView === 'list' ? '🗺️ Map' : '📋 List'}
      </button>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}
```

- [ ] **Step 4: Replace index.css**

Replace the entire contents of `src/index.css` with:

```css
:root {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  color: #1d1d1f;
  background: #fff;
  -webkit-font-smoothing: antialiased;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
}

body {
  margin: 0;
}
```

- [ ] **Step 5: Replace App.css**

Replace the entire contents of `src/App.css` with:

```css
.app {
  display: flex;
  height: 100dvh;
  overflow: hidden;
}

/* --- Sidebar --- */

.sidebar {
  width: 360px;
  flex-shrink: 0;
  overflow-y: auto;
  background: #fff;
  border-right: 1px solid #e3e3e3;
  padding: 20px 16px 80px;
}

.app-header h1 {
  margin: 0;
  font-size: 22px;
  color: #0051ba;
}

.app-header p {
  margin: 2px 0 16px;
  font-size: 13px;
  color: #666;
}

.search-box {
  width: 100%;
  padding: 10px 12px;
  font-size: 15px;
  border: 1px solid #ccc;
  border-radius: 8px;
  margin-bottom: 12px;
}

.section-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
  margin: 16px 0 6px;
}

.result-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.result-row {
  display: block;
  padding: 10px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
}

.result-row:hover {
  background: #f2f5fb;
}

.result-title {
  display: block;
  font-weight: 600;
  font-size: 15px;
}

.result-sub {
  display: block;
  font-size: 13px;
  color: #666;
  margin-top: 2px;
}

.back-link {
  display: inline-block;
  font-size: 13px;
  color: #0051ba;
  text-decoration: none;
  margin-bottom: 8px;
}

.back-link:hover {
  text-decoration: underline;
}

.building-detail h2,
.machine-detail h2,
.not-found h2 {
  margin: 4px 0 12px;
  font-size: 20px;
}

.machine-meta {
  font-size: 14px;
  color: #555;
  margin: 0 0 16px;
}

.slot-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.slot-table th {
  text-align: left;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
  padding: 6px 8px;
  border-bottom: 1px solid #e3e3e3;
}

.slot-table th:last-child {
  text-align: right;
}

.slot-table td {
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.slot-code {
  color: #888;
  font-family: ui-monospace, 'Cascadia Mono', monospace;
}

.slot-price {
  text-align: right;
}

.updated-note {
  font-size: 12px;
  color: #999;
  margin-top: 16px;
}

.empty-note {
  font-size: 14px;
  color: #777;
}

/* --- Map --- */

.map-pane {
  flex: 1;
  position: relative;
}

.map-container {
  position: absolute;
  inset: 0;
}

.map-marker {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #0051ba;
  border: 3px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  cursor: pointer;
  padding: 0;
}

/* Note: don't use transform here — MapLibre positions markers via inline transform. */
.map-marker--selected {
  background: #e8000d;
  width: 26px;
  height: 26px;
}

/* --- Mobile --- */

.mobile-toggle {
  display: none;
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    border-right: none;
  }

  .mobile-hidden {
    display: none;
  }

  .mobile-toggle {
    display: block;
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    padding: 10px 20px;
    border-radius: 999px;
    border: none;
    background: #0051ba;
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }
}
```

- [ ] **Step 6: Run the App tests to verify they pass**

```bash
bunx vitest run src/App.test.tsx
```

Expected: PASS — 5 tests.

- [ ] **Step 7: Run the full suite and build**

```bash
bun run test
bun run build
```

Expected: all test files pass; build succeeds.

- [ ] **Step 8: Manual verification in the browser**

```bash
bun run dev
```

(`bun run dev` blocks — run it in the background or a separate terminal.)

Open http://localhost:5173 and verify:

1. Tilted campus map renders with 3D buildings (zoom in if extrusions aren't visible at the initial zoom); 4 blue markers visible.
2. Clicking a marker opens that building in the sidebar and the camera flies in; the marker turns red and grows.
3. Clicking a machine shows its slot table; `anschutz-3-snack` shows "Inventory not surveyed yet."
4. Searching "hot cheetos" shows the item hit; clicking it lands on the Wescoe snack machine with the map flown to Wescoe.
5. Narrow the window below 768px: sidebar fills the screen, floating "🗺️ Map" button toggles to the map and back, and the map renders correctly after toggling (MapLibre auto-resizes via ResizeObserver — if it renders as a blank strip, note it for a fix).
6. Visit http://localhost:5173/building/nope — friendly not-found panel, app doesn't crash.

If anything fails, fix it before committing and note the fix in the commit message.

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/App.css src/index.css
git commit -m "feat: wire up split-view app shell with routing and mobile toggle"
```

---

### Task 10: Lint, README, SPA fallback, final verification

**Files:**
- Modify: `README.md` (replace entirely)
- Create: `public/_redirects`

- [ ] **Step 1: Run the linter and fix anything it reports**

```bash
bun run lint
```

Expected: no errors. If it flags real issues, fix them (don't disable rules to silence them; the one pre-approved disable is the exhaustive-deps comment in MapView).

- [ ] **Step 2: Add the SPA fallback for static hosts**

Create `public/_redirects` (Netlify/Cloudflare Pages convention so deep links like `/building/wescoe` serve the app instead of 404):

```
/*  /index.html  200
```

- [ ] **Step 3: Replace README.md**

Replace the entire contents of `README.md` with:

````markdown
# KU Vending Machine Map

A map of vending machines on the University of Kansas Lawrence campus: a tilted
3D campus map, per-building machine lists, slot-level inventory, and item
search ("where can I get Hot Cheetos?").

Fully static — no backend. All data lives in typed TypeScript files and is
maintained by editing them and redeploying.

## Stack

Bun · Vite · TypeScript · React · react-router · MapLibre GL (OpenFreeMap
tiles) · Vitest

## Development

```bash
bun install
bun run dev      # dev server at http://localhost:5173
bun run test     # run the test suite
bun run lint     # eslint
bun run build    # production build in dist/
```

## Updating the data

- Buildings: `src/data/buildings.ts` (id, name, [lng, lat])
- Machines & inventory: `src/data/machines.ts` (slot code, item, price in cents)

Run `bun run test` after editing — the data-integrity suite catches duplicate
ids, broken building references, duplicate slot codes, and bad prices. Commit
and push to redeploy.

A machine with `slots: []` shows as "inventory not surveyed yet" — current
inventory is placeholder data until each machine is surveyed in person.

## Deployment

`bun run build` produces a static `dist/` for any static host (Netlify,
Cloudflare Pages, GitHub Pages). `public/_redirects` provides the SPA fallback
on Netlify/Cloudflare so deep links work.

## Roadmap

- Phase 2: 3D indoor view per building (react-three-fiber) — the data model
  already carries `floor` and `position` per machine
- Real inventory from in-person surveys

See `docs/superpowers/specs/` for the full design.
````

- [ ] **Step 4: Final full verification**

```bash
bun run test
bun run build
```

Expected: all tests pass; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add README.md public/_redirects
git commit -m "docs: rewrite README, add SPA fallback for static hosts"
```
