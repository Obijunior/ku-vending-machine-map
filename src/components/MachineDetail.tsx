import { Link, useParams } from 'react-router-dom'
import { getBuildingById, getMachineById, getRouteToBuilding } from '../data/queries'
import { useCampusPaths } from '../data/campusPaths'
import type { UserOrigin } from '../data/types'
import { formatPrice, machineLabel } from '../lib/format'
import { distanceMeters, formatDistance, walkingDirectionsUrl } from '../lib/location'
import NotFound from './NotFound'

type Props = {
  origin?: UserOrigin | null
}

export default function MachineDetail({ origin = null }: Props) {
  const { id } = useParams()
  const machine = id ? getMachineById(id) : undefined
  const building = machine ? getBuildingById(machine.buildingId) : undefined
  // Hooks must run before the not-found return, or the hook order changes
  // between a known and an unknown machine id.
  const paths = useCampusPaths(origin !== null)
  if (!machine || !building) return <NotFound />

  const destination = machine.position ?? building.coordinates
  // The network is outdoors, so it routes to the building's entrance; the
  // machine's own position only matters for the straight-line fallback.
  const route = origin ? getRouteToBuilding(paths, origin.coordinates, building.id) : null
  const distance = origin
    ? formatDistance(
        route?.distanceMeters ?? distanceMeters(origin.coordinates, destination),
      )
    : null

  return (
    <div className="machine-detail">
      <Link to={`/building/${building.id}`} className="back-link">
        ← {building.name}
      </Link>
      <h2>{machineLabel(machine)}</h2>
      <p className="machine-meta">
        Floor {machine.floor}{machine.locationNote ? ` · ${machine.locationNote}` : ''}
      </p>
      {origin && (
        <div className="directions-bar">
          <span>{distance} from your starting point</span>
          <a
            href={walkingDirectionsUrl(origin.coordinates, destination)}
            target="_blank"
            rel="noreferrer"
          >
            Walking directions ↗
          </a>
        </div>
      )}
      {machine.slots.length === 0 ? (
        <p className="empty-note">Inventory not surveyed yet.</p>
      ) : (
        <table className="slot-table">
          <thead>
            <tr>
              <th scope="col">Slot</th>
              <th scope="col">Item</th>
              <th scope="col">Price</th>
            </tr>
          </thead>
          <tbody>
            {machine.slots.map((slot) => (
              <tr key={slot.code}>
                <td className="slot-code">{slot.code}</td>
                <td>{slot.item}</td>
                <td className="slot-price">{formatPrice(slot.priceCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="updated-note">Last verified {machine.lastUpdated}</p>
    </div>
  )
}
