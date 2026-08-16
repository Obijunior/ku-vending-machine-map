import { Link, useParams } from 'react-router-dom'
import { getBuildingById, getMachinesForBuilding, getRouteToBuilding } from '../data/queries'
import type { UserOrigin } from '../data/types'
import { machineLabel } from '../lib/format'
import { distanceMeters, formatDistance, walkingDirectionsUrl } from '../lib/location'
import NotFound from './NotFound'

type Props = {
  origin?: UserOrigin | null
}

export default function BuildingDetail({ origin = null }: Props) {
  const { id } = useParams()
  const building = id ? getBuildingById(id) : undefined
  if (!building) return <NotFound />

  const buildingMachines = getMachinesForBuilding(building.id)
  // Prefer the real walked distance; fall back to straight-line when this
  // building isn't on the path graph yet.
  const route = origin ? getRouteToBuilding(origin.coordinates, building.id) : null
  const distance = origin
    ? formatDistance(
        route?.distanceMeters ?? distanceMeters(origin.coordinates, building.coordinates),
      )
    : null

  return (
    <div className="building-detail">
      <Link to="/" className="back-link">
        ← All buildings
      </Link>
      <h2>{building.name}</h2>
      {origin && (
        <div className="directions-bar">
          <span>{distance} from your starting point</span>
          <a
            href={walkingDirectionsUrl(origin.coordinates, building.coordinates)}
            target="_blank"
            rel="noreferrer"
          >
            Walking directions ↗
          </a>
        </div>
      )}
      {buildingMachines.length === 0 ? (
        <p className="empty-note">No machines recorded here yet.</p>
      ) : (
        <ul className="result-list">
          {buildingMachines.map((machine) => (
            <li key={machine.id}>
              <Link to={`/machine/${machine.id}`} className="result-row">
                <span className="result-title">{machineLabel(machine)}</span>
                <span className="result-sub">
                  Floor {machine.floor}{machine.locationNote ? ` · ${machine.locationNote}` : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
