import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppLayout } from '../App'

vi.mock('./MapView', () => ({
  default: () => <div data-testid="map-stub" />,
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

describe('MapPane', () => {
  it('shows no toggle and only the campus map at the root', () => {
    renderAt('/')
    expect(screen.getByTestId('map-stub')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /inside/i })).not.toBeInTheDocument()
  })

  it('shows the toggle on a building page, campus by default', () => {
    renderAt('/building/wescoe')
    expect(screen.getByTestId('map-stub')).toBeInTheDocument()
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
    expect(screen.getByTestId('map-stub')).toBeInTheDocument()
  })

  it('ignores ?view=inside at the root', () => {
    renderAt('/?view=inside')
    expect(screen.getByTestId('map-stub')).toBeInTheDocument()
  })
})
