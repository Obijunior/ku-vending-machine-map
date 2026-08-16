import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppLayout } from '../App'
import MapPane from './MapPane'
import type { UserOrigin } from '../data/types'

vi.mock('./MapView', () => ({
  default: ({ route }: { route: [number, number][] | null }) => (
    <div data-testid="map-stub" data-route-points={route ? route.length : 0} />
  ),
}))

vi.mock('../data/campusGraph', () => ({
  nodes: [
    { id: 'n-quad', coordinates: [-95.248, 38.957] },
    { id: 'n-wescoe-door', coordinates: [-95.2478, 38.9573] },
  ],
  edges: [{ from: 'n-quad', to: 'n-wescoe-door' }],
  buildingEntrances: { wescoe: 'n-wescoe-door' },
}))

vi.mock('../indoor/IndoorView', () => ({
  default: ({ machines }: { machines: unknown[] }) => (
    <div data-testid="indoor-stub" data-machine-count={machines.length} />
  ),
}))

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppLayout />
    </MemoryRouter>,
  )
}

const pinnedAtQuad: UserOrigin = {
  coordinates: [-95.248, 38.957],
  source: 'pin',
}

// MapView is lazy-loaded inside MapPane, so every assertion here is async.
function renderPane(origin: UserOrigin | null, selectedBuildingId: string | null) {
  render(
    <MemoryRouter initialEntries={['/building/wescoe']}>
      <MapPane
        selectedBuildingId={selectedBuildingId}
        selectedMachineId={null}
        origin={origin}
        isPickingOrigin={false}
        onPickOrigin={() => {}}
        onCancelOriginPick={() => {}}
      />
    </MemoryRouter>,
  )
}

describe('MapPane', () => {
  // MapLibre is ~800KB; it loads as its own chunk so the sidebar can paint first.
  it('loads the campus map lazily rather than on first paint', async () => {
    renderAt('/')
    expect(screen.queryByTestId('map-stub')).not.toBeInTheDocument()
    expect(await screen.findByTestId('map-stub')).toBeInTheDocument()
  })

  it('shows no toggle and only the campus map at the root', async () => {
    renderAt('/')
    expect(await screen.findByTestId('map-stub')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /inside/i })).not.toBeInTheDocument()
  })

  it('shows the toggle on a building page, campus by default', async () => {
    renderAt('/building/wescoe')
    expect(await screen.findByTestId('map-stub')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /inside/i })).toBeInTheDocument()
    expect(screen.queryByTestId('indoor-stub')).not.toBeInTheDocument()
  })

  it('switches to the indoor view when Inside is clicked', async () => {
    const user = userEvent.setup()
    renderAt('/building/wescoe')
    await user.click(screen.getByRole('button', { name: /inside/i }))
    expect(await screen.findByTestId('indoor-stub')).toBeInTheDocument()
    expect(screen.queryByTestId('map-stub')).not.toBeInTheDocument()
  })

  it('honors ?view=inside on initial load and passes the building machines', async () => {
    renderAt('/building/wescoe?view=inside')
    const stub = await screen.findByTestId('indoor-stub')
    expect(stub).toHaveAttribute('data-machine-count', '2')
  })

  it('switches back to campus', async () => {
    const user = userEvent.setup()
    renderAt('/building/wescoe?view=inside')
    await screen.findByTestId('indoor-stub')
    await user.click(screen.getByRole('button', { name: /campus/i }))
    expect(await screen.findByTestId('map-stub')).toBeInTheDocument()
  })

  it('ignores ?view=inside at the root', async () => {
    renderAt('/?view=inside')
    expect(await screen.findByTestId('map-stub')).toBeInTheDocument()
  })

  it('draws no route when no starting point is set', async () => {
    renderPane(null, 'wescoe')
    expect(await screen.findByTestId('map-stub')).toHaveAttribute('data-route-points', '0')
  })

  it('draws a route to a building that is on the path graph', async () => {
    renderPane(pinnedAtQuad, 'wescoe')
    expect(await screen.findByTestId('map-stub')).toHaveAttribute('data-route-points', '2')
  })

  it('draws no route for a building that is not on the path graph', async () => {
    renderPane(pinnedAtQuad, 'budig')
    expect(await screen.findByTestId('map-stub')).toHaveAttribute('data-route-points', '0')
  })

  it('draws no route when no building is selected', async () => {
    renderPane(pinnedAtQuad, null)
    expect(await screen.findByTestId('map-stub')).toHaveAttribute('data-route-points', '0')
  })
})
