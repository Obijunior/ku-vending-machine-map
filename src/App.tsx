import { ListBullets, MapTrifold } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, matchPath, useLocation } from 'react-router-dom'
import type { Coordinates, UserOrigin } from './data/types'
import { getMachineById } from './data/queries'
import BuildingDetail from './components/BuildingDetail'
import BuildingList from './components/BuildingList'
import LocationControls from './components/LocationControls'
import MachineDetail from './components/MachineDetail'
import MapPane from './components/MapPane'
import NotFound from './components/NotFound'
import './App.css'

const MOBILE_VIEWPORT_QUERY = '(max-width: 768px)'

function matchesMobileViewport(): boolean {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(MOBILE_VIEWPORT_QUERY).matches
}

function useSelection(): { buildingId: string | null; machineId: string | null } {
  const { pathname } = useLocation()
  const buildingMatch = matchPath('/building/:id', pathname)
  if (buildingMatch?.params.id) {
    return { buildingId: buildingMatch.params.id, machineId: null }
  }
  const machineMatch = matchPath('/machine/:id', pathname)
  if (machineMatch?.params.id) {
    return {
      buildingId: getMachineById(machineMatch.params.id)?.buildingId ?? null,
      machineId: machineMatch.params.id,
    }
  }
  return { buildingId: null, machineId: null }
}

function geolocationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location wasn't shared. Drop a pin on the map instead."
  }
  if (error.code === error.TIMEOUT) {
    return 'Location timed out. Try again or drop a pin instead.'
  }
  return 'Your location is unavailable. Drop a pin on the map instead.'
}

export function AppLayout() {
  const { buildingId, machineId } = useSelection()
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')
  const [isMobileViewport, setIsMobileViewport] = useState(matchesMobileViewport)
  // The mobile layout starts on the list. Avoid downloading and initializing
  // MapLibre until the visitor actually opens the hidden map pane.
  const [hasRequestedMap, setHasRequestedMap] = useState(() => !matchesMobileViewport())
  const [origin, setOrigin] = useState<UserOrigin | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [isPickingOrigin, setIsPickingOrigin] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return

    const viewportQuery = window.matchMedia(MOBILE_VIEWPORT_QUERY)
    const updateViewport = () => {
      setIsMobileViewport(viewportQuery.matches)
      if (!viewportQuery.matches) setHasRequestedMap(true)
    }

    updateViewport()
    viewportQuery.addEventListener('change', updateViewport)
    return () => viewportQuery.removeEventListener('change', updateViewport)
  }, [])

  function useDeviceLocation() {
    setLocationError(null)
    setIsPickingOrigin(false)

    if (!navigator.geolocation) {
      setLocationError('Location is unavailable in this browser. Drop a pin instead.')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setOrigin({ coordinates: [coords.longitude, coords.latitude], source: 'device' })
        setIsLocating(false)
      },
      (error) => {
        setLocationError(geolocationErrorMessage(error))
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  function startOriginPick() {
    setLocationError(null)
    setIsLocating(false)
    setIsPickingOrigin(true)
    setHasRequestedMap(true)
    setMobileView('map')
  }

  function toggleMobileView() {
    const nextView = mobileView === 'list' ? 'map' : 'list'
    if (nextView === 'map') setHasRequestedMap(true)
    setMobileView(nextView)
  }

  function pickOrigin(coordinates: Coordinates) {
    setOrigin({ coordinates, source: 'pin' })
    setIsPickingOrigin(false)
    setLocationError(null)
  }

  function clearOrigin() {
    setOrigin(null)
    setIsPickingOrigin(false)
    setLocationError(null)
  }

  return (
    <div className="app">
      <aside className={`sidebar ${mobileView === 'map' ? 'mobile-hidden' : ''}`}>
        <header className="app-header">
          <h1>KU Vending (STILL IN ALPHA!!)</h1>
          <p>Vending machines across the Lawrence campus</p>
        </header>
        <LocationControls
          origin={origin}
          isLocating={isLocating}
          isPickingOrigin={isPickingOrigin}
          error={locationError}
          onUseLocation={useDeviceLocation}
          onStartPin={startOriginPick}
          onClear={clearOrigin}
        />
        <Routes>
          <Route path="/" element={<BuildingList origin={origin} />} />
          <Route path="/building/:id" element={<BuildingDetail origin={origin} />} />
          <Route path="/machine/:id" element={<MachineDetail origin={origin} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <footer className="sidebar-footer">
          <a
            href="https://github.com/Obijunior/ku-vending-machine-map/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noreferrer"
          >
            Want to contribute?
          </a>
        </footer>
      </aside>
      <div className={`map-pane ${mobileView === 'list' ? 'mobile-hidden' : ''}`}>
        {(hasRequestedMap || !isMobileViewport) && (
          <MapPane
            selectedBuildingId={buildingId}
            selectedMachineId={machineId}
            origin={origin}
            isPickingOrigin={isPickingOrigin}
            onPickOrigin={pickOrigin}
            onCancelOriginPick={() => setIsPickingOrigin(false)}
          />
        )}
      </div>
      <button
        type="button"
        className="mobile-toggle"
        onClick={toggleMobileView}
      >
        {mobileView === 'list' ? (
          <>
            <MapTrifold size={19} weight="duotone" aria-hidden="true" />
            <span>Map</span>
          </>
        ) : (
          <>
            <ListBullets size={19} weight="duotone" aria-hidden="true" />
            <span>List</span>
          </>
        )}
      </button>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}
