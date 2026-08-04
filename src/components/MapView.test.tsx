import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MapView from './MapView'
import { buildings } from '../data/buildings'

type MapOptions = { minZoom?: number; maxBounds?: [[number, number], [number, number]] }
const { mapOptions } = vi.hoisted(() => ({ mapOptions: [] as MapOptions[] }))

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
    constructor(options: MapOptions) {
      mapOptions.push(options)
    }
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
  beforeEach(() => {
    mapOptions.length = 0
  })

  it('pens the camera in around campus', () => {
    render(
      <MemoryRouter>
        <MapView buildings={buildings} selectedBuildingId={null} />
      </MemoryRouter>,
    )
    const [[west, south], [east, north]] = mapOptions[0].maxBounds!
    for (const [lng, lat] of buildings.map((b) => b.coordinates)) {
      expect(lng > west && lng < east && lat > south && lat < north).toBe(true)
    }
  })

  it('never zooms out past neighborhood scale', () => {
    render(
      <MemoryRouter>
        <MapView buildings={buildings} selectedBuildingId={null} />
      </MemoryRouter>,
    )
    expect(mapOptions[0].minZoom).toBe(13)
  })

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
