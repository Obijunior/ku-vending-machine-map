# Contributing

Thanks for helping map vending machines on the University of Kansas Lawrence
campus. The application is fully static: machine and building records are typed
TypeScript data, while campus boundaries and indoor floor polygons are committed
GeoJSON snapshots. Contributions that add or verify real machine locations and
inventory are especially valuable.

## Ways to contribute

You can help by:

- Adding or correcting a building
- Adding, locating, or surveying a vending machine
- Updating item names, slot codes, or prices from an in-person survey
- Refreshing generated map or floor-plan data
- Fixing a bug or improving the application

## Development setup

[Bun](https://bun.sh) is the supported package manager and is required by the
data-generation scripts. Using Bun also avoids creating a conflicting
`package-lock.json`.

```bash
git clone https://github.com/Obijunior/ku-vending-machine-map.git
cd ku-vending-machine-map
bun install
bun run dev
```

The development server is available at <http://localhost:5173> by default.

## Contributing data

Application data is maintained in:

- `src/data/buildings.ts` for buildings, coordinates, and KU GIS identifiers
- `src/data/machines.ts` for machines, locations, and inventory
- `src/data/itemPrices.ts` for campus-wide default prices by item name
- `src/data/campusGraph.ts` for the hand-authored map of building entrances
- `public/data/campus-paths.json` for the generated OpenStreetMap walking network
- `src/data/footprints.ts` for generated OpenStreetMap building footprints
- `public/data/ku-districts.geojson` for the generated campus district polygons
- `public/data/ku-floors/*.geojson` for generated, per-building floor polygons

Files under `public/data/` are served locally with the application. Visitors do
not query KU's GIS server directly.

### Adding a building

Add a building to `src/data/buildings.ts`:

```ts
{
  id: 'new-building',
  name: 'New Building',
  coordinates: [-95.255, 38.956],
  gisLocationId: '123',
  floors: [1, 2, 3],
}
```

Building fields follow these rules:

- `id` must be unique, stable, and URL-safe.
- `name` should use the building's official display name.
- `coordinates` must be `[longitude, latitude]`.
- `gisLocationId` is optional. When present, it must match the building-location
  identifier in KU Smart Campus layer 4. It lets the generator create the
  building's official floor snapshot.
- `floors` must contain the known floor numbers used by machine records in
  ascending order. The indoor view supplements this list with numeric levels
  found in the generated KU floor snapshot.

After adding a building, regenerate its OpenStreetMap footprint and, when it has
a KU GIS identifier, the KU GIS snapshots as described in
[Generating geographic data](#generating-geographic-data).

### Adding a machine

Add a machine to `src/data/machines.ts`:

```ts
{
  id: 'new-building-1-snack',
  buildingId: 'new-building',
  type: 'snack',
  floor: 1,
  locationNote: 'North hallway, beside room 100',
  lastUpdated: '2026-08-04',
  slots: [],
}
```

Machine fields follow these rules:

- `id` must be unique, stable, and URL-safe.
- `buildingId` must match an existing building id.
- `type` must be `drink`, `snack`, or `combo`.
- `floor` must be one of the building's listed floors.
- `locationNote` should help someone find the machine after entering the
  building. Use an empty string if its location is not known.
- `lastUpdated` must be the date the data was actually verified, formatted as
  `YYYY-MM-DD`.
- `slots` may be empty when the machine exists but its inventory has not been
  surveyed.
- An optional `position: [longitude, latitude]` places the machine within the
  building footprint in the indoor 3D view.

### Adding inventory

Add each surveyed item to the machine's `slots` array:

```ts
slots: [
  { code: 'A1', item: 'Pretzels', category: 'chips', priceCents: 125 },
  { code: 'A2', item: 'Hot Cheetos', category: 'chips', priceCents: 175 },
  { code: 'B1', item: 'Celsius', flavor: 'Sparkling Orange', category: 'energy-drink' },
]
```

Inventory fields follow these rules:

- `code` must match the code printed on the machine and be unique within that
  machine.
- `item` should be the brand/product name without a flavor, e.g. `Celsius` or
  `Gatorade`, so slots of the same product only differ by `flavor` and share
  one entry in `itemPrices.ts`.
- `flavor` is optional. Add it when a product comes in multiple flavors and
  you want that distinction kept, e.g. `Sparkling Orange`. Slots with the same
  `item` but a different `flavor` are shown and searched as distinct, but
  still price from the same `itemPrices.ts` entry, since flavor doesn't affect
  price. Omit it for single-flavor items or when the flavor isn't worth
  tracking.
- `category` is optional and must be one of `soda`, `energy-drink`,
  `electrolyte-drink`, `protein-shake`, `water`, `gum`, `candy`, `chips`, or
  `other`. It powers filtering by item type, so prefer the closest matching
  category over `other` when one applies. Add a new category to `SlotCategory`
  in `src/data/types.ts` if none of the existing ones fit.
- `priceCents` is optional. Omit it to use the campus-wide default for that
  item from `src/data/itemPrices.ts`; set it only to override that default for
  this specific slot. When set, it must be a positive integer number of
  cents; for example, `$1.75` is `175`.

Use `slots: []` when inventory has not been surveyed. Do not invent products or
prices to make an entry look complete.

When several consecutive slots stock the same thing, e.g. `B1`-`B9` all
holding Pepsi, use `slotRange()` instead of listing each one:

```ts
import { slotRange } from './slotRange'

slots: [
  ...slotRange('B1', 'B9', { item: 'Pepsi', category: 'soda' }),
  { code: 'C1', item: 'Diet Pepsi', category: 'soda' },
]
```

It expands to the same array of individual slots as typing them out, so it
mixes freely with regular entries. The two codes must share a letter prefix
and the second must not come before the first; `slotRange` throws immediately
on import if they don't, so a typo fails loudly instead of producing wrong data.

### Setting a campus-wide default price

If the same item is priced the same way across machines, add it once to
`src/data/itemPrices.ts` instead of repeating `priceCents` on every slot:

```ts
export const itemPrices: Record<string, number> = {
  'Celsius Sparkling Orange': 350,
}
```

Matching against a slot's `item` is case- and punctuation-insensitive, but
word order still has to match, so keep the key identical to how the item is
named in `machines.ts`. Any slot that sets its own `priceCents` overrides this
default; a slot with neither shows as unpriced rather than guessing.

### Adding walking paths

Walking routes run over a network of paths across campus. That network is
**generated from OpenStreetMap**, not drawn by hand — KU's campus is mapped in
detail there, down to sidewalks, steps and street crossings.

```bash
bun run fetch-paths
```

This writes `public/data/campus-paths.json` (~220 KB), which the app fetches the
first time someone asks for a route. Re-run it to pick up OSM improvements.

The one thing OpenStreetMap cannot tell us is which junction counts as a given
building's front door, so that stays hand-authored in `src/data/campusGraph.ts`.
To find the ids:

```bash
bun run suggest-entrances
```

That shortlists the network nodes nearest each building's footprint, labelled by
which side they sit on, and warns when two adjacent buildings share a candidate
— giving the same node to both would make the walk between them zero metres.
Confirm the ones that are really doors and add them:

```ts
export const buildingEntrances: Record<string, string[]> = {
  // List every door. Routing tries them all and keeps the shortest, so someone
  // arriving at Budig's north side is not sent around to a south door.
  budig: ['9042193012', '9042193016'],
  wescoe: ['5721555659'],
}
```

Ids are OpenStreetMap node ids, so re-running `fetch-paths` keeps them stable
and this map survives regeneration. `bun run test` checks that every id still
resolves to a node in the generated network and that no entrance sits absurdly
far from its own building.

The map is allowed to be incomplete. A building that isn't listed falls back to
straight-line distance and the Google Maps link, so you can map doors a few
buildings at a time.

#### Filling a gap OpenStreetMap missed

If a real path is absent from OSM, draw it on [geojson.io](https://geojson.io)
as **LineStrings**, starting each new line at the junction it meets, and run:

```bash
bun run graph-from-geojson path/to/export.geojson
```

Vertices become nodes and consecutive pairs become edges, so the connections are
the drawing rather than a list you maintain by hand. Vertices within 4 m merge
into one junction, and every merge is reported so you can catch two that were
meant to stay distinct.

The better fix is usually to add the path to OpenStreetMap itself — it benefits
everyone and survives regeneration.

### Coordinates

All coordinates in this repository use `[longitude, latitude]`. Services such
as Google Maps commonly display coordinates as `latitude, longitude`, so
reverse that order before adding them.

Building coordinates should identify the building itself. A machine's optional
`position` should fall within or immediately adjacent to its building
footprint. The KU GIS generator requests WGS84 (`EPSG:4326`) GeoJSON so its
coordinates use the same order.

### Verification and sources

In-person observations are preferred for machine locations, inventory, and
prices. When using an online source for a building or location detail, include
the source in the pull request and, when useful, in a short code comment.

Only update `lastUpdated` for data that was actually checked. Describe what you
verified in the pull request so reviewers can distinguish surveyed data from
partial or externally sourced information.

The generated district and floor data comes from the public
[KU Smart Campus ArcGIS service](https://opsmaps.ku.edu:6443/arcgis/rest/services/homePagewmProd/MapServer?f=pjson):

- Layer 0 supplies the Central, North, and West campus district polygons.
- Layer 4 supplies floor-specific building polygons.


### Generating geographic data

After adding a building or correcting its coordinates, regenerate the
OpenStreetMap footprints:

```bash
bun run fetch-footprints
```

This rewrites `src/data/footprints.ts`. Treat that file as generated output
rather than editing its geometry by hand. A footprint must correspond to an
entry in `src/data/buildings.ts`; do not retain standalone footprints for
buildings that are not part of the application.

After changing a `gisLocationId`, adding a GIS-backed building, or intentionally
refreshing KU data, run:

```bash
bun run fetch-ku-gis
```

This command:

1. Downloads KU district layer 0 to `public/data/ku-districts.geojson`.
2. Recreates `public/data/ku-floors/` from layer 4 for every building with a
   `gisLocationId`.
3. Requests WGS84 GeoJSON and validates that every response is a feature
   collection.
4. Retries transient service failures up to three times.

Commit all generated changes with the source-data change. The indoor view loads
only the selected building's local file, supports polygon holes and
multipolygons, uses numeric basement and half-floor levels, and ignores
non-numeric levels such as `ROOF`. If a snapshot is missing or cannot be read,
the view falls back to the OpenStreetMap footprint.

KU publishes location `228` as the connected `M2SEC/LEEP2/SPAHR` complex. The
LEEP 2 entry intentionally uses that combined identifier, so
`public/data/ku-floors/leep2.geojson` includes the connected complex. Spahr is
not a separate application building unless a machine record and building entry
are added for it.

## Contributing code

Bug fixes and features are welcome. Follow the existing TypeScript and React
style, keep changes focused, and update relevant tests when behavior changes.

The campus map uses MapLibre. Its KU-blue fill and outline are rendered from the
local district snapshot below map labels. The indoor renderer uses React Three
Fiber and projects the selected building's local floor snapshot into meters,
falling back to the generated OpenStreetMap footprint when necessary.

## Validation

Before opening a pull request, run:

```bash
bun run test
bun run lint
bun run build
```

The data-integrity tests check common problems including swapped coordinates,
duplicate ids, broken building references, invalid floors, stale footprints,
duplicate slot codes, and invalid prices.

Confirm that:

- Coordinates use `[longitude, latitude]`.
- Building and machine ids are unique and URL-safe.
- Every `buildingId` references an existing building.
- Machine floors exist in the associated building's `floors` array.
- Prices are positive integer cents.
- Slot codes are unique within each machine.
- `lastUpdated` reflects the actual verification date.
- Unknown inventory remains `slots: []` instead of being guessed.
- Generated OpenStreetMap and KU GIS files are committed when applicable.
- Every generated footprint references an application building.
- No `package-lock.json` or unrelated generated files were added.

## Submitting a pull request

1. Fork the repository and create a focused branch.
2. Make and validate your changes.
3. Commit only the files related to the contribution.
4. Open a pull request that explains what changed and why.
5. For data contributions, state how and when the information was verified and
   include any external sources used.

Small contributions are welcome. A single verified machine, corrected location,
or surveyed inventory update is useful.
