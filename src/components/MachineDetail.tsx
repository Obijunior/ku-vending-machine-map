import { Link, useParams } from 'react-router-dom'
import { getBuildingById, getMachineById } from '../data/queries'
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
  if (!machine || !building) return <NotFound />

  const destination = machine.position ?? building.coordinates
  const distance = origin
    ? formatDistance(distanceMeters(origin.coordinates, destination))
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
