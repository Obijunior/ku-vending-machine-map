# Contributing

Thanks for wanting to help map KU's vending machines! The site is fully
static — all data lives in typed TypeScript files, so contributing mostly
means editing those files and opening a pull request.

## Dev setup

You'll need [Bun](https://bun.sh).

```bash
bun install
bun run dev      # dev server at http://localhost:5173
bun run test     # run the test suite
bun run lint     # eslint
```

## Contributing data (the main way to help)

- **Buildings:** `src/data/buildings.ts` — id, name, `[lng, lat]`, `floors`.
- **Machines & inventory:** `src/data/machines.ts` — slot code, item, price
  in cents; an optional `position: [lng, lat]` places the machine in the 3D
  indoor view. A machine with `slots: []` shows as "inventory not surveyed
  yet", so partial info is still useful.
- **Footprints:** after adding a building, run `bun run fetch-footprints` to
  regenerate `src/data/footprints.ts` from OpenStreetMap and commit the
  result.

Coordinates are `[lng, lat]` — Google Maps shows "lat, lng", so flip the pair
when pasting. The data-integrity tests catch swaps, duplicate ids, broken
building references, duplicate slot codes, and bad prices.

Surveyed a machine in person? Even a single machine's real inventory is a
great contribution — most inventory is still placeholder data.

## Contributing code

Bug fixes and features are welcome too. Match the existing style, and add or
update tests alongside your change.

## Submitting

1. Fork the repo and create a branch.
2. Make your change.
3. Run `bun run test` and `bun run lint` — both should pass.
4. Open a pull request describing what you added or fixed.
