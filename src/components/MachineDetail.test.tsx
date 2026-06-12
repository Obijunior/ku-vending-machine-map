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
