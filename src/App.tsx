import { useState } from 'react'
import { BrowserRouter, Route, Routes, matchPath, useLocation } from 'react-router-dom'
import { buildings } from './data/buildings'
import { getMachineById, getMachinesForBuilding } from './data/queries'
import BuildingDetail from './components/BuildingDetail'
import BuildingList from './components/BuildingList'
import MachineDetail from './components/MachineDetail'
import MapView from './components/MapView'
import NotFound from './components/NotFound'
import './App.css'

const buildingsWithMachines = buildings.filter(
  (b) => getMachinesForBuilding(b.id).length > 0,
)

function useSelectedBuildingId(): string | null {
  const { pathname } = useLocation()
  const buildingMatch = matchPath('/building/:id', pathname)
  if (buildingMatch?.params.id) return buildingMatch.params.id
  const machineMatch = matchPath('/machine/:id', pathname)
  if (machineMatch?.params.id) {
    return getMachineById(machineMatch.params.id)?.buildingId ?? null
  }
  return null
}

export function AppLayout() {
  const selectedBuildingId = useSelectedBuildingId()
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')

  return (
    <div className="app">
      <aside className={`sidebar ${mobileView === 'map' ? 'mobile-hidden' : ''}`}>
        <header className="app-header">
          <h1>KU Vending</h1>
          <p>Vending machines across the Lawrence campus</p>
        </header>
        <Routes>
          <Route path="/" element={<BuildingList />} />
          <Route path="/building/:id" element={<BuildingDetail />} />
          <Route path="/machine/:id" element={<MachineDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </aside>
      <div className={`map-pane ${mobileView === 'list' ? 'mobile-hidden' : ''}`}>
        <MapView buildings={buildingsWithMachines} selectedBuildingId={selectedBuildingId} />
      </div>
      <button
        type="button"
        className="mobile-toggle"
        onClick={() => setMobileView(mobileView === 'list' ? 'map' : 'list')}
      >
        {mobileView === 'list' ? '🗺️ Map' : '📋 List'}
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
