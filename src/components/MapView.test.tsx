import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import MapView from './MapView'
import { buildings } from '../data/buildings'

vi.mock('maplibre-gl', () => {
  class Marker {
    private el: HTMLElement
    constructor(options: { element: HTMLElement }) {
      this.el = options.element
    }
    setLngLat() {
      return this
    }
    addTo() {
      return this
    }
    getElement() {
      return this.el
    }
    remove() {}
  }
  class Map {
    addControl() {
      return this
    }
    flyTo() {}
    remove() {}
  }
  class NavigationControl {}
  return { Map, Marker, NavigationControl }
})

describe('MapView', () => {
  it('renders the map container without crashing', () => {
    render(
      <MemoryRouter>
        <MapView buildings={buildings} selectedBuildingId={null} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('map')).toBeInTheDocument()
  })

  it('renders with a selected building without crashing', () => {
    render(
      <MemoryRouter>
        <MapView buildings={buildings} selectedBuildingId="wescoe" />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('map')).toBeInTheDocument()
  })
})
