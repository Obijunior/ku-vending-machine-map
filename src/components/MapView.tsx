import { useEffect, useRef } from 'react'
import { Map as MaplibreMap, Marker, NavigationControl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useNavigate } from 'react-router-dom'
import type { Building } from '../data/types'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const CAMPUS_CENTER: [number, number] = [-95.2462, 38.958]

type Props = {
  buildings: Building[]
  selectedBuildingId: string | null
}

export default function MapView({ buildings, selectedBuildingId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MaplibreMap | null>(null)
  const markersRef = useRef(new Map<string, Marker>())
  const navigate = useNavigate()

  useEffect(() => {
    if (!containerRef.current) return
    const map = new MaplibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: CAMPUS_CENTER,
      zoom: 15.5,
      pitch: 45,
    })
    map.addControl(new NavigationControl({ visualizePitch: true }))
    mapRef.current = map

    for (const building of buildings) {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'map-marker'
      el.title = building.name
      el.addEventListener('click', () => navigate(`/building/${building.id}`))
      const marker = new Marker({ element: el }).setLngLat(building.coordinates).addTo(map)
      markersRef.current.set(building.id, marker)
    }

    const markers = markersRef.current
    return () => {
      map.remove()
      mapRef.current = null
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
    const selected = buildings.find((b) => b.id === selectedBuildingId)
    if (selected && mapRef.current) {
      mapRef.current.flyTo({ center: selected.coordinates, zoom: 17.5, pitch: 55 })
    }
  }, [selectedBuildingId, buildings])

  return <div ref={containerRef} className="map-container" data-testid="map" />
}
