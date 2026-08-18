import { useEffect, useRef } from 'react'
import {
  Map as MaplibreMap,
  Marker,
  NavigationControl,
  type GeoJSONSource,
  type MapMouseEvent,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useNavigate } from 'react-router-dom'
import type { FeatureCollection } from 'geojson'
import { campusBounds } from '../lib/bounds'
import type { Building, Coordinates, UserOrigin } from '../data/types'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const CAMPUS_CENTER: Coordinates = [-95.2462, 38.958]
const KU_DISTRICTS_SOURCE_ID = 'ku-districts'
const KU_DISTRICTS_GEOJSON = `${import.meta.env.BASE_URL}data/ku-districts.geojson`
const ROUTE_SOURCE_ID = 'walking-route'
const ROUTE_LAYER_ID = 'walking-route-line'

const EMPTY_ROUTE: FeatureCollection = { type: 'FeatureCollection', features: [] }

function routeToGeoJson(route: Coordinates[] | null): FeatureCollection {
  if (!route || route.length < 2) return EMPTY_ROUTE
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: route },
      },
    ],
  }
}

function addRouteLayer(map: MaplibreMap) {
  map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data: EMPTY_ROUTE })
  map.addLayer({
    id: ROUTE_LAYER_ID,
    type: 'line',
    source: ROUTE_SOURCE_ID,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#e8000d',
      'line-width': 5,
      'line-opacity': 0.9,
    },
  })
}

/** Districts the app actually covers. West campus is out of scope for now. */
const COVERED_DISTRICTS = ['North District', 'Central District']
const UNMAPPED_FILTER = ['!', ['in', ['get', 'DISTRICT'], ['literal', COVERED_DISTRICTS]]] as const
const COVERED_FILTER = ['in', ['get', 'DISTRICT'], ['literal', COVERED_DISTRICTS]] as const

function addCampusDistrictLayers(map: MaplibreMap) {
  map.addSource(KU_DISTRICTS_SOURCE_ID, {
    type: 'geojson',
    data: KU_DISTRICTS_GEOJSON,
    attribution: 'University of Kansas Smart Campus',
  })

  // Keep campus shading below place and road labels so the basemap stays legible.
  const styleLayers = map.getStyle().layers
  const firstLabelLayer = styleLayers.find((layer) => layer.type === 'symbol')?.id

  map.addLayer(
    {
      id: 'ku-district-fill',
      type: 'fill',
      source: KU_DISTRICTS_SOURCE_ID,
      filter: COVERED_FILTER as unknown as never,
      paint: {
        'fill-color': '#0051ba',
        'fill-opacity': 0.05, // change to make fill darker or lighter
      },
    },
    firstLabelLayer,
  )
  map.addLayer(
    {
      id: 'ku-district-outline',
      type: 'line',
      source: KU_DISTRICTS_SOURCE_ID,
      filter: COVERED_FILTER as unknown as never,
      paint: {
        'line-color': '#0051ba',
        'line-width': 2.5,
        'line-opacity': 0.8,
      },
    },
    firstLabelLayer,
  )

  // Districts with no machine or path data yet read as grey and dashed, so the
  // blue campus outline means "covered" rather than just "this is KU".
  map.addLayer(
    {
      id: 'ku-district-unmapped-fill',
      type: 'fill',
      source: KU_DISTRICTS_SOURCE_ID,
      filter: UNMAPPED_FILTER as unknown as never,
      paint: {
        'fill-color': '#6b7488',
        'fill-opacity': 0.06,
      },
    },
    firstLabelLayer,
  )
  map.addLayer(
    {
      id: 'ku-district-unmapped-outline',
      type: 'line',
      source: KU_DISTRICTS_SOURCE_ID,
      filter: UNMAPPED_FILTER as unknown as never,
      paint: {
        'line-color': '#6b7488',
        'line-width': 1.5,
        'line-opacity': 0.7,
        'line-dasharray': [3, 2],
      },
    },
    firstLabelLayer,
  )
  map.addLayer({
    id: 'ku-district-unmapped-label',
    type: 'symbol',
    source: KU_DISTRICTS_SOURCE_ID,
    filter: UNMAPPED_FILTER as unknown as never,
    layout: {
      'text-field': 'Not mapped yet',
      'text-size': 25,
      'text-letter-spacing': 0.08,
      // Borrow a font the basemap style already loads: naming one it lacks
      // silently drops the label rather than erroring.
      'text-font': styleLayers
        .flatMap((layer) =>
          layer.type === 'symbol' && layer.layout?.['text-font']
            ? [layer.layout['text-font'] as string[]]
            : [],
        )
        .find((font) => Array.isArray(font) && font.length > 0) ?? ['Noto Sans Regular'],
    },
    paint: {
      'text-color': '#5b6883',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.6,
    },
  })
}

type Props = {
  buildings: Building[]
  selectedBuildingId: string | null
  origin?: UserOrigin | null
  isPickingOrigin?: boolean
  onPickOrigin?: (coordinates: Coordinates) => void
  /** Node-to-node walking path to highlight, or null for none. */
  route?: Coordinates[] | null
  /**
   * Building to fly the camera to, overriding the lookup in `buildings`.
   * Needed because `buildings` here is filtered to ones with markers, but a
   * selected building (a route destination, say) may not have machines and
   * so wouldn't be found by that lookup alone.
   */
  focusBuilding?: Building | null
}

export default function MapView({
  buildings,
  selectedBuildingId,
  origin = null,
  isPickingOrigin = false,
  onPickOrigin,
  route = null,
  focusBuilding = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MaplibreMap | null>(null)
  const markersRef = useRef(new Map<string, Marker>())
  const originMarkerRef = useRef<Marker | null>(null)
  const isPickingOriginRef = useRef(isPickingOrigin)
  const onPickOriginRef = useRef(onPickOrigin)
  const styleLoadedRef = useRef(false)
  const routeRef = useRef(route)
  const navigate = useNavigate()

  useEffect(() => {
    isPickingOriginRef.current = isPickingOrigin
    onPickOriginRef.current = onPickOrigin
  }, [isPickingOrigin, onPickOrigin])

  useEffect(() => {
    if (!containerRef.current) return
    const map = new MaplibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: CAMPUS_CENTER,
      zoom: 15.5,
      pitch: 45,
      // Campus is the whole point of this map. Fencing the camera in keeps the
      // tile requests to the couple of square kilometres we care about — and
      // stops people from getting lost in Kansas.
      maxBounds: campusBounds(buildings.map((b) => b.coordinates)),
      minZoom: 13,
    })
    map.addControl(new NavigationControl({ visualizePitch: true }))
    map.on('load', () => {
      addCampusDistrictLayers(map)
      addRouteLayer(map)
      styleLoadedRef.current = true
      // The route prop may have changed while the style was still loading.
      const source = map.getSource<GeoJSONSource>(ROUTE_SOURCE_ID)
      if (source) source.setData(routeToGeoJson(routeRef.current))
    })
    mapRef.current = map

    for (const building of buildings) {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'map-marker'
      el.title = building.name
      el.setAttribute('aria-label', building.name)
      el.addEventListener('click', (event) => {
        event.stopPropagation()
        navigate(`/building/${building.id}`)
      })
      const marker = new Marker({ element: el }).setLngLat(building.coordinates).addTo(map)
      markersRef.current.set(building.id, marker)
    }

    const handleMapClick = (event: MapMouseEvent) => {
      if (!isPickingOriginRef.current) return
      onPickOriginRef.current?.([event.lngLat.lng, event.lngLat.lat])
    }
    map.on('click', handleMapClick)

    const markers = markersRef.current
    return () => {
      map.remove()
      mapRef.current = null
      styleLoadedRef.current = false
      originMarkerRef.current = null
      markers.clear()
    }
    // Buildings come from a static module and never change at runtime,
    // and navigate is stable — init the map exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      marker.getElement().classList.toggle('map-marker--selected', id === selectedBuildingId)
    }
    const selected = focusBuilding ?? buildings.find((b) => b.id === selectedBuildingId)
    if (selected && mapRef.current) {
      mapRef.current.flyTo({ center: selected.coordinates, zoom: 17.5, pitch: 55 })
    }
  }, [selectedBuildingId, buildings, focusBuilding])

  useEffect(() => {
    if (!mapRef.current) return
    if (!origin) {
      originMarkerRef.current?.remove()
      originMarkerRef.current = null
      return
    }

    if (!originMarkerRef.current) {
      const el = document.createElement('div')
      el.className = 'origin-marker'
      el.setAttribute('role', 'img')
      el.setAttribute('aria-label', 'Directions starting point')
      originMarkerRef.current = new Marker({ element: el })
        .setLngLat(origin.coordinates)
        .addTo(mapRef.current)
    } else {
      originMarkerRef.current.setLngLat(origin.coordinates)
    }

    originMarkerRef.current
      .getElement()
      .classList.toggle('origin-marker--device', origin.source === 'device')
  }, [origin])

  useEffect(() => {
    routeRef.current = route
    if (!mapRef.current || !styleLoadedRef.current) return
    const source = mapRef.current.getSource<GeoJSONSource>(ROUTE_SOURCE_ID)
    if (source) source.setData(routeToGeoJson(route))
  }, [route])

  return (
    <div
      ref={containerRef}
      className={`map-container${isPickingOrigin ? ' map-container--picking' : ''}`}
      data-testid="map"
      aria-label="Campus vending machine map"
    />
  )
}
