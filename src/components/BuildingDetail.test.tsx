import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import BuildingDetail from './BuildingDetail'
import { getBuildingById } from '../data/queries'
import { distanceMeters, formatDistance } from '../lib/location'
import type { Coordinates, UserOrigin } from '../data/types'

vi.mock('../data/machines', () => ({
  machines: [
    {
      id: 'wescoe-2-snack',
      buildingId: 'wescoe',
      type: 'snack',
      floor: 2,
      locationNote: 'Main hallway, by the elevators',
      lastUpdated: '2026-06-11',
      slots: [],
    },
    {
      id: 'wescoe-2-drink',
      buildingId: 'wescoe',
      type: 'drink',
      floor: 2,
      locationNote: 'Main hallway, by the elevators',
      lastUpdated: '2026-06-11',
      slots: [],
    },
  ],
}))

vi.mock('../data/campusGraph', () => ({
  buildingEntrances: { wescoe: ['n-wescoe-door'] },
}))

// Stand in for the fetched network so the component renders synchronously —
// jsdom has no server to load the real asset from. Only the hook is replaced;
// edgePolyline stays real so routing behaves exactly as it does in the app.
//
// Deliberately a detour: the path runs east to a corner and then back
// northwest to the door, so the walked distance is roughly triple the
// straight-line distance and the two can't be confused.
vi.mock('../data/campusPaths', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../data/campusPaths')>()),
  useCampusPaths: () => ({
    nodes: new Map([
      ['n-quad', { id: 'n-quad', coordinates: [-95.2478, 38.9558] }],
      ['n-corner', { id: 'n-corner', coordinates: [-95.245, 38.9558] }],
      ['n-wescoe-door', { id: 'n-wescoe-door', coordinates: [-95.2478, 38.9573] }],
    ]),
    edges: [
      { from: 'n-quad', to: 'n-corner', between: [] },
      { from: 'n-corner', to: 'n-wescoe-door', between: [] },
    ],
  }),
}))

const QUAD: Coordinates = [-95.2478, 38.9558]
const CORNER: Coordinates = [-95.245, 38.9558]
const WESCOE_DOOR: Coordinates = [-95.2478, 38.9573]

const pinnedAtQuad: UserOrigin = { coordinates: QUAD, source: 'pin' }

// Computed with the same helpers the app uses, so the assertion can't drift
// from a hand-rounded number.
const walkedDistance = formatDistance(
  distanceMeters(QUAD, CORNER) + distanceMeters(CORNER, WESCOE_DOOR),
)

function renderAt(path: string, origin: UserOrigin | null = null) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/building/:id" element={<BuildingDetail origin={origin} />} />
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
    expect(screen.getByRole('link', { name: /Drink machine/ })).toHaveAttribute(
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

  it('reports the walked distance when the building is on the path graph', () => {
    renderAt('/building/wescoe', pinnedAtQuad)
    expect(screen.getByText(/from your starting point/)).toHaveTextContent(walkedDistance)
  })

  it('does not report the straight-line distance once a route exists', () => {
    const straightLine = formatDistance(
      distanceMeters(QUAD, getBuildingById('wescoe')!.coordinates),
    )
    expect(straightLine).not.toBe(walkedDistance) // guards the fixture itself
    renderAt('/building/wescoe', pinnedAtQuad)
    expect(screen.getByText(/from your starting point/)).not.toHaveTextContent(straightLine)
  })

  it('still offers the Google Maps link alongside the in-app route', () => {
    renderAt('/building/wescoe', pinnedAtQuad)
    expect(screen.getByRole('link', { name: /walking directions/i }).getAttribute('href'))
      .toContain('travelmode=walking')
  })
})
