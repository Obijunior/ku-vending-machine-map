import { Link, useParams } from 'react-router-dom'
import { getBuildingById, getMachineById } from '../data/queries'
import { formatPrice, machineLabel } from '../lib/format'
import NotFound from './NotFound'

export default function MachineDetail() {
  const { id } = useParams()
  const machine = id ? getMachineById(id) : undefined
  const building = machine ? getBuildingById(machine.buildingId) : undefined
  if (!machine || !building) return <NotFound />

  return (
    <div className="machine-detail">
      <Link to={`/building/${building.id}`} className="back-link">
        ← {building.name}
      </Link>
      <h2>{machineLabel(machine)}</h2>
      <p className="machine-meta">
        Floor {machine.floor} · {machine.locationNote}
      </p>
      {machine.slots.length === 0 ? (
        <p className="empty-note">Inventory not surveyed yet.</p>
      ) : (
        <table className="slot-table">
          <thead>
            <tr>
              <th>Slot</th>
              <th>Item</th>
              <th>Price</th>
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
