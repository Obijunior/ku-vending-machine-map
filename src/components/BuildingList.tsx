import { useState } from 'react'
import { Link } from 'react-router-dom'
import { buildings } from '../data/buildings'
import { machines } from '../data/machines'
import { getMachinesForBuilding } from '../data/queries'
import { formatPrice, machineLabel } from '../lib/format'
import { search } from '../lib/search'
import type { MachineType } from '../data/types'

const TYPE_ICONS: Record<MachineType, string> = {
  drink: '🥤',
  snack: '🍫',
  combo: '🥤🍫',
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
        placeholder="Search buildings or snacks…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search buildings or snacks"
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
                        <span aria-hidden="true">
                          {buildingMachines.map((m) => TYPE_ICONS[m.type]).join(' ')}
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
