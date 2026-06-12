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
