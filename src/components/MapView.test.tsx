import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MapView from './MapView'
import { buildings } from '../data/buildings'
import type { Building, Coordinates } from '../data/types'

type MapOptions = { minZoom?: number; maxBounds?: [[number, number], [number, number]] }
type SourceSpec = { type: string; data: unknown }
type FlyToCall = { center: Coordinates; zoom: number; pitch: number }

const { mapOptions, sources, layers, sourceData, flyToCalls } = vi.hoisted(() => ({
  mapOptions: [] as MapOptions[],
  sources: new Map<string, SourceSpec>(),
  layers: [] as { id: string; type: string }[],
  sourceData: new Map<string, unknown>(),
  flyToCalls: [] as FlyToCall[],
}))

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
    // Fire 'load' synchronously so layer-setup code actually runs in tests.
    on(event: string, handler: () => void) {
      if (event === 'load') handler()
      return this
    }
    getStyle() {
      return { layers: [{ id: 'place-label', type: 'symbol' }] }
    }
    addSource(id: string, source: SourceSpec) {
      sources.set(id, source)
      sourceData.set(id, source.data)
    }
    addLayer(layer: { id: string; type: string }) {
      layers.push(layer)
    }
    getSource(id: string) {
      if (!sources.has(id)) return undefined
      return { setData: (data: unknown) => sourceData.set(id, data) }
    }
    flyTo(options: FlyToCall) {
      flyToCalls.push(options)
    }
    remove() {}
  }
  class NavigationControl {}
  return { Map, Marker, NavigationControl }
})

const ROUTE: Coordinates[] = [
  [-95.248, 38.957],
  [-95.2478, 38.9573],
]

function renderMap(route: Coordinates[] | null = null) {
  render(
    <MemoryRouter>
      <MapView buildings={buildings} selectedBuildingId={null} route={route} />
    </MemoryRouter>,
  )
}

describe('MapView', () => {
  beforeEach(() => {
    mapOptions.length = 0
    layers.length = 0
    sources.clear()
    sourceData.clear()
    flyToCalls.length = 0
  })

  it('pens the camera in around campus', () => {
    renderMap()
    const [[west, south], [east, north]] = mapOptions[0].maxBounds!
    for (const [lng, lat] of buildings.map((b) => b.coordinates)) {
      expect(lng > west && lng < east && lat > south && lat < north).toBe(true)
    }
  })

  it('never zooms out past neighborhood scale', () => {
    renderMap()
    expect(mapOptions[0].minZoom).toBe(13)
  })

  it('renders the map container without crashing', () => {
    renderMap()
    expect(screen.getByTestId('map')).toBeInTheDocument()
  })

  it('renders with a selected building without crashing', () => {
    render(
      <MemoryRouter>
        <MapView buildings={buildings} selectedBuildingId="wescoe" route={null} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('map')).toBeInTheDocument()
  })

  it('registers the route source and line layer', () => {
    renderMap()
    expect(sources.has('walking-route')).toBe(true)
    expect(layers.some((layer) => layer.id === 'walking-route-line')).toBe(true)
  })

  it('leaves the route source empty when there is no route', () => {
    renderMap()
    expect(sourceData.get('walking-route')).toEqual({
      type: 'FeatureCollection',
      features: [],
    })
  })

  it('feeds the route coordinates into the route source', () => {
    renderMap(ROUTE)
    expect(sourceData.get('walking-route')).toEqual({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: ROUTE },
        },
      ],
    })
  })

  it('flies to a focusBuilding even when it is not in the buildings marker array', () => {
    // A machineless building — e.g. a route destination — is filtered out of
    // the marker array MapPane passes as `buildings`, but should still be a
    // valid camera target via `focusBuilding`.
    const offMarkerBuilding: Building = {
      id: 'green',
      name: 'Green Hall',
      coordinates: [-95.256, 38.958],
      floors: [1, 2, 3],
    }
    render(
      <MemoryRouter>
        <MapView
          buildings={buildings}
          selectedBuildingId="green"
          route={null}
          focusBuilding={offMarkerBuilding}
        />
      </MemoryRouter>,
    )
    expect(flyToCalls).toContainEqual({
      center: offMarkerBuilding.coordinates,
      zoom: 17.5,
      pitch: 55,
    })
  })
})
