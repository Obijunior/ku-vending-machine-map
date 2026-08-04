import { CookieIcon, PintGlassIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { buildings } from '../data/buildings'
import { machines } from '../data/machines'
import { getMachinesForBuilding } from '../data/queries'
import { formatPrice, machineLabel } from '../lib/format'
import { search } from '../lib/search'
import type { MachineType } from '../data/types'

const MACHINE_TYPE_NAMES: Record<MachineType, string> = {
  drink: 'Drink',
  snack: 'Snack',
  combo: 'Combination',
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

export default function BuildingList() {
  const [query, setQuery] = useState('')
  const results = search(query, buildings, machines)
  const searching = query.trim() !== ''
  const nothingFound = results.buildings.length === 0 && results.items.length === 0

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

      {searching && results.items.length > 0 && (
        <section>
          <h2 className="section-label">Items</h2>
          <ul className="result-list">
            {results.items.map(({ slot, machine, building }) => (
              <li key={`${machine.id}-${slot.code}`}>
                <Link to={`/machine/${machine.id}`} className="result-row">
                  <span className="result-title">
                    {slot.item} · {formatPrice(slot.priceCents)}
                  </span>
                  <span className="result-sub">
                    {building.name} · Floor {machine.floor} · {machineLabel(machine)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {nothingFound ? (
        <p className="empty-note">No matches — try a building name or a snack.</p>
      ) : (
        results.buildings.length > 0 && (
          <section>
            {searching && <h2 className="section-label">Buildings</h2>}
            <ul className="result-list">
              {results.buildings.map((building) => {
                const buildingMachines = getMachinesForBuilding(building.id)
                return (
                  <li key={building.id}>
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
                      </span>
                    </Link>
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
