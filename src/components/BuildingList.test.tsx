import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import BuildingList from './BuildingList'

function renderList() {
  render(
    <MemoryRouter>
      <BuildingList />
    </MemoryRouter>,
  )
}

describe('BuildingList', () => {
  it('lists every building with its machine count', () => {
    renderList()
    expect(screen.getByRole('link', { name: /Wescoe Hall/ })).toHaveTextContent('2 machines')
    expect(screen.getByRole('link', { name: /Budig Hall/ })).toHaveTextContent('1 machine')
    expect(screen.getByRole('link', { name: /Anschutz Library/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Kansas Union/ })).toBeInTheDocument()
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

  it('shows a message when nothing matches', async () => {
    const user = userEvent.setup()
    renderList()
    await user.type(screen.getByRole('searchbox'), 'zzzz')
    expect(screen.getByText(/no matches/i)).toBeInTheDocument()
  })
})
