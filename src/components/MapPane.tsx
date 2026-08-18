import { Buildings, MapTrifold } from '@phosphor-icons/react'
import { Component, Suspense, lazy, useEffect, useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { buildings } from '../data/buildings'
import { getBuildingById, getMachinesForBuilding, getRouteToBuilding } from '../data/queries'
import { useCampusPaths } from '../data/campusPaths'
import type { Coordinates, UserOrigin } from '../data/types'

// Both renderers are heavy (MapLibre ~800KB, three.js ~900KB) and neither is
// needed for the sidebar. Splitting them lets the machine list paint first.
const MapView = lazy(() => import('./MapView'))
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
  origin: UserOrigin | null
  isPickingOrigin: boolean
  onPickOrigin: (coordinates: Coordinates) => void
  onCancelOriginPick: () => void
}

export default function MapPane({
  selectedBuildingId,
  selectedMachineId,
  origin,
  isPickingOrigin,
  onPickOrigin,
  onCancelOriginPick,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const building = selectedBuildingId ? getBuildingById(selectedBuildingId) : undefined
  const inside = building !== undefined && searchParams.get('view') === 'inside'

  // Only fetch the walking network once a route could actually be drawn —
  // it is a few hundred KB and irrelevant until someone sets a starting point.
  const wantsRoute = origin !== null && building !== undefined && !isPickingOrigin
  const paths = useCampusPaths(wantsRoute)

  // Only the campus view draws routes; the indoor scene has its own geometry.
  const route = useMemo(() => {
    if (!wantsRoute) return null
    return getRouteToBuilding(paths, origin.coordinates, building.id)?.path ?? null
  }, [wantsRoute, paths, origin, building])

  useEffect(() => {
    if (!isPickingOrigin || searchParams.get('view') !== 'inside') return
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('view')
    setSearchParams(nextParams, { replace: true })
  }, [isPickingOrigin, searchParams, setSearchParams])

  function showInside(nextInside: boolean) {
    const nextParams = new URLSearchParams(searchParams)
    if (nextInside) nextParams.set('view', 'inside')
    else nextParams.delete('view')
    setSearchParams(nextParams)
  }

  return (
    <>
      {building && !isPickingOrigin && (
        <div className="view-toggle">
          <button
            type="button"
            className={inside ? '' : 'view-toggle--active'}
            aria-pressed={!inside}
            onClick={() => showInside(false)}
          >
            <MapTrifold size={17} weight="duotone" aria-hidden="true" />
            <span>Campus</span>
          </button>
          <button
            type="button"
            className={inside ? 'view-toggle--active' : ''}
            aria-pressed={inside}
            onClick={() => showInside(true)}
          >
            <Buildings size={17} weight="duotone" aria-hidden="true" />
            <span>Inside</span>
          </button>
        </div>
      )}
      {isPickingOrigin && (
        <div className="pin-prompt" role="status">
          <span>Click the map to set your starting point</span>
          <button type="button" onClick={onCancelOriginPick}>Cancel</button>
        </div>
      )}
      {inside && building && !isPickingOrigin ? (
        <IndoorErrorBoundary>
          <Suspense fallback={<div className="pane-note">Loading 3D view…</div>}>
            <IndoorView
              key={building.id}
              building={building}
              machines={getMachinesForBuilding(building.id)}
              selectedMachineId={selectedMachineId}
            />
          </Suspense>
        </IndoorErrorBoundary>
      ) : (
        <Suspense fallback={<div className="pane-note">Loading map…</div>}>
          <MapView
            buildings={buildingsWithMachines}
            selectedBuildingId={selectedBuildingId}
            origin={origin}
            isPickingOrigin={isPickingOrigin}
            onPickOrigin={onPickOrigin}
            route={route}
            focusBuilding={building}
          />
        </Suspense>
      )}
    </>
  )
}
