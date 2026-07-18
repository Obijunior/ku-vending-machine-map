import { useState } from 'react'
import { BrowserRouter, Route, Routes, matchPath, useLocation } from 'react-router-dom'
import { getMachineById } from './data/queries'
import BuildingDetail from './components/BuildingDetail'
import BuildingList from './components/BuildingList'
import MachineDetail from './components/MachineDetail'
import MapPane from './components/MapPane'
import NotFound from './components/NotFound'
import './App.css'

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

export function AppLayout() {
  const { buildingId, machineId } = useSelection()
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
        <MapPane selectedBuildingId={buildingId} selectedMachineId={machineId} />
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
