import { Link, useParams } from 'react-router-dom'
import { getBuildingById, getMachinesForBuilding } from '../data/queries'
import { machineLabel } from '../lib/format'
import NotFound from './NotFound'

export default function BuildingDetail() {
  const { id } = useParams()
  const building = id ? getBuildingById(id) : undefined
  if (!building) return <NotFound />

  const buildingMachines = getMachinesForBuilding(building.id)

  return (
    <div className="building-detail">
      <Link to="/" className="back-link">
        ← All buildings
      </Link>
      <h2>{building.name}</h2>
      {buildingMachines.length === 0 ? (
        <p className="empty-note">No machines recorded here yet.</p>
      ) : (
        <ul className="result-list">
          {buildingMachines.map((machine) => (
            <li key={machine.id}>
              <Link to={`/machine/${machine.id}`} className="result-row">
                <span className="result-title">{machineLabel(machine)}</span>
                <span className="result-sub">
                  Floor {machine.floor} · {machine.locationNote}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
