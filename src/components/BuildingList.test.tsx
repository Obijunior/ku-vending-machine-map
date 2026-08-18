import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import BuildingList from './BuildingList'

// Counts matter here: Wescoe must have 2 machines and Budig 1 for the
// machine-count assertions below.
vi.mock('../data/machines', () => ({
  machines: [
    {
      id: 'wescoe-2-snack',
      buildingId: 'wescoe',
      type: 'snack',
      floor: 2,
      locationNote: '',
      lastUpdated: '2026-06-11',
      slots: [{ code: 'B2', item: 'Hot Cheetos', priceCents: 175 }],
    },
    {
      id: 'wescoe-2-drink',
      buildingId: 'wescoe',
      type: 'drink',
      floor: 2,
      locationNote: '',
      lastUpdated: '2026-06-11',
      slots: [],
    },
    {
      id: 'budig-1-combo',
      buildingId: 'budig',
      type: 'combo',
      floor: 1,
      locationNote: '',
      lastUpdated: '2026-06-11',
      slots: [],
    },
  ],
}))

function renderList() {
  render(
    <MemoryRouter>
      <BuildingList />
    </MemoryRouter>,
  )
}

describe('BuildingList', () => {
  it('lists buildings that have machines, with their counts', () => {
    renderList()
    expect(screen.getByRole('link', { name: /Wescoe Hall/ })).toHaveTextContent('2 machines')
    expect(screen.getByRole('link', { name: /Budig Hall/ })).toHaveTextContent('1 machine')
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

  it('keeps machine-less buildings out of the browse list', () => {
    renderList()
    // Anschutz has no machines in this suite's fixture, so it should not be
    // listed while browsing — most of campus is only a routing destination.
    expect(screen.queryByRole('link', { name: /Anschutz Library/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Wescoe Hall/ })).toBeInTheDocument()
  })

  it('still finds a machine-less building by name when searching', async () => {
    const user = userEvent.setup()
    renderList()
    await user.type(screen.getByRole('searchbox'), 'anschutz')
    expect(screen.getByRole('link', { name: /Anschutz Library/ })).toBeInTheDocument()
  })

  it('shows a message when nothing matches', async () => {
    const user = userEvent.setup()
    renderList()
    await user.type(screen.getByRole('searchbox'), 'zzzz')
    expect(screen.getByText(/no matches/i)).toBeInTheDocument()
  })
})
