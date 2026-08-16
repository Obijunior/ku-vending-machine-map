import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import MachineDetail from './MachineDetail'

// Buildings stay real (wescoe / anschutz exist); only the survey-dependent
// machine inventory is fixture data so real surveys can't break this suite.
vi.mock('../data/machines', () => ({
  machines: [
    {
      id: 'wescoe-2-snack',
      buildingId: 'wescoe',
      type: 'snack',
      floor: 2,
      locationNote: 'Main hallway, by the elevators',
      lastUpdated: '2026-06-11',
      slots: [
        { code: 'B2', item: 'Hot Cheetos', priceCents: 175 },
        { code: 'A1', item: 'Snickers', priceCents: 150 },
      ],
    },
    {
      id: 'anschutz-3-snack',
      buildingId: 'anschutz',
      type: 'snack',
      floor: 3,
      locationNote: '',
      lastUpdated: '2026-07-22',
      slots: [],
    },
  ],
}))

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
