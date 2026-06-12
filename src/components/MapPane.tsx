import { Component, Suspense, lazy, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import MapView from './MapView'
import { buildings } from '../data/buildings'
import { getBuildingById, getMachinesForBuilding } from '../data/queries'

const IndoorView = lazy(() => import('../indoor/IndoorView'))

const buildingsWithMachines = buildings.filter(
  (b) => getMachinesForBuilding(b.id).length > 0,
)

class IndoorErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="pane-note">
          The 3D view couldn't start (it needs WebGL). The machine list on the left
          still has everything.
        </div>
      )
    }
    return this.props.children
  }
}

type Props = {
  selectedBuildingId: string | null
  selectedMachineId: string | null
}

export default function MapPane({ selectedBuildingId, selectedMachineId }: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const building = selectedBuildingId ? getBuildingById(selectedBuildingId) : undefined
  const inside = building !== undefined && searchParams.get('view') === 'inside'

  return (
    <>
      {building && (
        <div className="view-toggle">
          <button
            type="button"
            className={inside ? '' : 'view-toggle--active'}
            onClick={() => setSearchParams({})}
          >
            🗺️ Campus
          </button>
          <button
            type="button"
            className={inside ? 'view-toggle--active' : ''}
            onClick={() => setSearchParams({ view: 'inside' })}
          >
            🏢 Inside
          </button>
        </div>
      )}
      {inside && building ? (
        <IndoorErrorBoundary>
          <Suspense fallback={<div className="pane-note">Loading 3D view…</div>}>
            <IndoorView
              building={building}
              machines={getMachinesForBuilding(building.id)}
              selectedMachineId={selectedMachineId}
            />
          </Suspense>
        </IndoorErrorBoundary>
      ) : (
        <MapView buildings={buildingsWithMachines} selectedBuildingId={selectedBuildingId} />
      )}
    </>
  )
}
