import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppLayout } from './App'

vi.mock('./components/MapView', () => ({
  default: () => <div data-testid="map-stub" />,
}))

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppLayout />
    </MemoryRouter>,
  )
}

describe('AppLayout', () => {
  it('shows the building list and map at the root', () => {
    renderAt('/')
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Wescoe Hall/ })).toBeInTheDocument()
    expect(screen.getByTestId('map-stub')).toBeInTheDocument()
  })

  it('navigates from building list to building detail', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('link', { name: /Wescoe Hall/ }))
    expect(screen.getByRole('heading', { name: 'Wescoe Hall' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pepsi drink machine/ })).toBeInTheDocument()
  })

  it('navigates from building detail to machine detail', async () => {
    const user = userEvent.setup()
    renderAt('/building/wescoe')
    await user.click(screen.getByRole('link', { name: /Pepsi drink machine/ }))
    expect(screen.getByText('Mountain Dew')).toBeInTheDocument()
  })

  it('shows not-found for unknown routes', () => {
    renderAt('/garbage')
    expect(screen.getByRole('heading', { name: /not found/i })).toBeInTheDocument()
  })

  it('toggles between list and map on mobile', async () => {
    const user = userEvent.setup()
    renderAt('/')
    const toggle = screen.getByRole('button', { name: /map/i })
    await user.click(toggle)
    expect(screen.getByRole('button', { name: /list/i })).toBeInTheDocument()
  })
})
