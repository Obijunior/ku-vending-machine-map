import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import BuildingDetail from './BuildingDetail'

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
})
