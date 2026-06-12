import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import IndoorView from './IndoorView'
import { getBuildingById, getMachinesForBuilding } from '../data/queries'

vi.mock('@react-three/fiber', () => ({
  Canvas: () => <div data-testid="canvas-stub" />,
}))
vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Html: () => null,
}))

const wescoe = getBuildingById('wescoe')!
const wescoeMachines = getMachinesForBuilding('wescoe')

function renderView(selectedMachineId: string | null = null) {
  render(
    <MemoryRouter>
      <IndoorView
        building={wescoe}
        machines={wescoeMachines}
        selectedMachineId={selectedMachineId}
      />
    </MemoryRouter>,
  )
}

describe('IndoorView', () => {
  it('renders the canvas and a chip per floor plus All', () => {
    renderView()
    expect(screen.getByTestId('canvas-stub')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    for (const floor of wescoe.floors) {
      expect(screen.getByRole('button', { name: String(floor) })).toBeInTheDocument()
    }
  })

  it('defaults the active chip to All with no machine selected', () => {
    renderView()
    expect(screen.getByRole('button', { name: 'All' })).toHaveClass('floor-chip--active')
  })

  it("defaults the active chip to the selected machine's floor", () => {
    renderView('wescoe-2-snack')
    expect(screen.getByRole('button', { name: '2' })).toHaveClass('floor-chip--active')
  })

  it('switches the active chip on click', async () => {
    const user = userEvent.setup()
    renderView('wescoe-2-snack')
    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByRole('button', { name: 'All' })).toHaveClass('floor-chip--active')
    expect(screen.getByRole('button', { name: '2' })).not.toHaveClass('floor-chip--active')
  })
})
