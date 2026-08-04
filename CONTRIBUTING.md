# Contributing

Thanks for helping map vending machines on the University of Kansas Lawrence
campus. The application is fully static, and its data is stored in typed
TypeScript files. Contributions that add or verify real machine locations and
inventory are especially valuable.

## Ways to contribute

You can help by:

- Adding or correcting a building
- Adding, locating, or surveying a vending machine
- Updating item names, slot codes, or prices from an in-person survey
- Fixing a bug or improving the application



## Development setup

[Bun](https://bun.sh) is the supported package manager and is required by the
footprint-generation script. Using Bun also avoids creating a conflicting
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

- `src/data/buildings.ts` for buildings and campus coordinates
- `src/data/machines.ts` for machines, locations, and inventory
- `src/data/footprints.ts` for generated OpenStreetMap building footprints

### Adding a building

Add a building to `src/data/buildings.ts`:

```ts
{
  id: 'new-building',
  name: 'New Building',
  coordinates: [-95.255, 38.956],
  floors: [1, 2, 3],
}
```

Building fields follow these rules:

- `id` must be unique, stable, and URL-safe.
- `name` should use the building's official display name.
- `coordinates` must be `[longitude, latitude]`.
- `floors` must contain the building's actual floor numbers in ascending order.
  Use `0` for a basement or ground level when that matches the building data.

After adding a building, regenerate its footprint as described in
[Generating footprints](#generating-footprints).

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
  { code: 'A1', item: 'Pretzels', priceCents: 125 },
  { code: 'A2', item: 'Hot Cheetos', priceCents: 175 },
]
```

Inventory fields follow these rules:

- `code` must match the code printed on the machine and be unique within that
  machine.
- `item` should match the product label without adding availability claims.
- `priceCents` must be an integer number of cents; for example, `$1.75` is
  `175`.

Use `slots: []` when inventory has not been surveyed. Do not invent products or
prices to make an entry look complete.

### Coordinates

All coordinates in this repository use `[longitude, latitude]`. Services such
as Google Maps commonly display coordinates as `latitude, longitude`, so
reverse that order before adding them.

Building coordinates should identify the building itself. A machine's optional
`position` should fall within or immediately adjacent to its building
footprint.

### Verification and sources

In-person observations are preferred for machine locations, inventory, and
prices. When using an online source for a building or location detail, include
the source in the pull request and, when useful, in a short code comment.

Only update `lastUpdated` for data that was actually checked. Describe what you
verified in the pull request so reviewers can distinguish surveyed data from
partial or externally sourced information.

### Generating footprints

After adding a building or correcting its coordinates, run:

```bash
bun run fetch-footprints
```

This regenerates `src/data/footprints.ts` from OpenStreetMap. Commit the updated
file with the building change. Treat `footprints.ts` as generated output rather
than editing its geometry by hand.

## Contributing code

Bug fixes and features are welcome. Follow the existing TypeScript and React
style, keep changes focused, and update relevant tests when behavior changes.


## Validation

Before opening a pull request, run:

```bash
bun run test
bun run lint
bun run build
```

The data-integrity tests check common problems including swapped coordinates,
duplicate ids, broken building references, invalid floors, duplicate slot
codes, and invalid prices.

Confirm that:

- Coordinates use `[longitude, latitude]`.
- Building and machine ids are unique and URL-safe.
- Every `buildingId` references an existing building.
- Machine floors exist in the associated building's `floors` array.
- Prices are integer cents.
- Slot codes are unique within each machine.
- `lastUpdated` reflects the actual verification date.
- Unknown inventory remains `slots: []` instead of being guessed.
- Generated footprints are committed when applicable.
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