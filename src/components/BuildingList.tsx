import { CookieIcon, PintGlassIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { buildings } from '../data/buildings'
import { machines } from '../data/machines'
import { getBuildingById, getMachinesForBuilding } from '../data/queries'
import type { Building, Coordinates, MachineType, UserOrigin, VendingMachine } from '../data/types'
import { formatPrice, machineLabel } from '../lib/format'
import { distanceMeters, formatDistance, walkingDirectionsUrl } from '../lib/location'
import { search } from '../lib/search'

const MACHINE_TYPE_NAMES: Record<MachineType, string> = {
  drink: 'Drink',
  snack: 'Snack',
  combo: 'Combination',
}

type Props = {
  origin?: UserOrigin | null
}

type NearestMachine = {
  machine: VendingMachine
  building: Building
  distance: number
}

function MachineTypeIcon({ type }: { type: MachineType }) {
  return (
    <span
      className={`machine-type-icon machine-type-icon--${type}`}
      role="img"
      aria-label={`${MACHINE_TYPE_NAMES[type]} machine`}
    >
      {type !== 'snack' && (
        <PintGlassIcon className="machine-type-glyph" size={18} weight="duotone" aria-hidden="true" />
      )}
      {type !== 'drink' && (
        <CookieIcon
          className="machine-type-glyph"
          size={18}
          weight="duotone"
          aria-hidden="true"
        />
      )}
    </span>
  )
}

function DirectionsLink({
  origin,
  destination,
}: {
  origin: UserOrigin | null
  destination: Coordinates
}) {
  if (!origin) return null
  return (
    <a
      className="directions-link"
      href={walkingDirectionsUrl(origin.coordinates, destination)}
      target="_blank"
      rel="noreferrer"
    >
      Directions ↗
    </a>
  )
}

export default function BuildingList({ origin = null }: Props) {
  const [query, setQuery] = useState('')
  const results = search(query, buildings, machines)
  const searching = query.trim() !== ''

  const itemResults = origin
    ? [...results.items].sort(
        (a, b) =>
          distanceMeters(origin.coordinates, a.building.coordinates) -
          distanceMeters(origin.coordinates, b.building.coordinates),
      )
    : results.items
  const buildingResults = origin
    ? [...results.buildings].sort(
        (a, b) =>
          distanceMeters(origin.coordinates, a.coordinates) -
          distanceMeters(origin.coordinates, b.coordinates),
      )
    : results.buildings
  const nearestMachines: NearestMachine[] = origin && !searching
    ? machines
        .map((machine) => {
          const building = getBuildingById(machine.buildingId)
          if (!building) return null
          const destination = machine.position ?? building.coordinates
          return {
            machine,
            building,
            distance: distanceMeters(origin.coordinates, destination),
          }
        })
        .filter((entry): entry is NearestMachine => entry !== null)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5)
    : []
  const nothingFound = buildingResults.length === 0 && itemResults.length === 0

  return (
    <div className="building-list">
      <input
        type="search"
        className="search-box"
        placeholder="Search buildings or items..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search buildings or items"
      />

      {nearestMachines.length > 0 && (
        <section>
          <h2 className="section-label">Nearest machines</h2>
          <ul className="result-list">
            {nearestMachines.map(({ machine, building, distance }) => {
              const destination = machine.position ?? building.coordinates
              return (
                <li className="result-card" key={machine.id}>
                  <Link to={`/machine/${machine.id}`} className="result-row">
                    <span className="result-title">{machineLabel(machine)}</span>
                    <span className="result-sub">
                      {building.name} · Floor {machine.floor} · {formatDistance(distance)}
                    </span>
                  </Link>
                  <DirectionsLink origin={origin} destination={destination} />
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {searching && itemResults.length > 0 && (
        <section>
          <h2 className="section-label">Items</h2>
          <ul className="result-list">
            {itemResults.map(({ slot, machine, building }) => (
              <li className="result-card" key={`${machine.id}-${slot.code}`}>
                <Link to={`/machine/${machine.id}`} className="result-row">
                  <span className="result-title">
                    {slot.item} · {formatPrice(slot.priceCents)}
                  </span>
                  <span className="result-sub">
                    {building.name} · Floor {machine.floor} · {machineLabel(machine)}
                    {origin && ` · ${formatDistance(distanceMeters(origin.coordinates, machine.position ?? building.coordinates))}`}
                  </span>
                </Link>
                <DirectionsLink origin={origin} destination={machine.position ?? building.coordinates} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {nothingFound ? (
        <p className="empty-note">No matches — try a building name or a snack.</p>
      ) : (
        buildingResults.length > 0 && (
          <section>
            {(searching || origin) && (
              <h2 className="section-label">{searching ? 'Buildings' : 'All buildings'}</h2>
            )}
            <ul className="result-list">
              {buildingResults.map((building) => {
                const buildingMachines = getMachinesForBuilding(building.id)
                return (
                  <li className={origin ? 'result-card' : undefined} key={building.id}>
                    <Link to={`/building/${building.id}`} className="result-row">
                      <span className="result-title">{building.name}</span>
                      <span className="result-sub">
                        {buildingMachines.length} machine
                        {buildingMachines.length === 1 ? '' : 's'}{' '}
                        <span className="machine-type-icons">
                          {buildingMachines.map((machine) => (
                            <MachineTypeIcon key={machine.id} type={machine.type} />
                          ))}
                        </span>
                        {origin && ` · ${formatDistance(distanceMeters(origin.coordinates, building.coordinates))}`}
                      </span>
                    </Link>
                    <DirectionsLink origin={origin} destination={building.coordinates} />
                  </li>
                )
              })}
            </ul>
          </section>
        )
      )}
    </div>
  )
}
