import { useMemo } from 'react'
import FloorPlate from './FloorPlate'
import MachineDot from './MachineDot'
import { floorElevation } from './projection'
import { buildingFootprint } from './footprint'
import type { Building, VendingMachine } from '../data/types'

type Props = {
  building: Building
  machines: VendingMachine[]
  selectedMachineId: string | null
  emphasizedFloor: number | null
  onSelectMachine: (id: string) => void
}

export default function BuildingScene({
  building,
  machines,
  selectedMachineId,
  emphasizedFloor,
  onSelectMachine,
}: Props) {
  const { points, origin, radius } = useMemo(() => buildingFootprint(building), [building])
  const dotRadius = Math.min(Math.max(radius * 0.03, 1.2), 3.5)

  // Unpositioned machines on the same floor would stack at the centroid; fan them out.
  const offsets = useMemo(() => {
    const map = new Map<string, number>()
    for (const floor of building.floors) {
      const unpositioned = machines.filter((m) => m.floor === floor && !m.position)
      unpositioned.forEach((m, i) =>
        map.set(m.id, (i - (unpositioned.length - 1) / 2) * (dotRadius * 2.6)),
      )
    }
    return map
  }, [building, machines, dotRadius])

  return (
    <group>
      {building.floors.map((floor) => (
        <FloorPlate
          key={floor}
          points={points}
          elevation={floorElevation(floor, building.floors)}
          emphasized={emphasizedFloor === null || emphasizedFloor === floor}
        />
      ))}
      {machines.map((machine) => (
        <MachineDot
          key={machine.id}
          machine={machine}
          origin={origin}
          elevation={floorElevation(machine.floor, building.floors)}
          selected={machine.id === selectedMachineId}
          dimmed={emphasizedFloor !== null && emphasizedFloor !== machine.floor}
          offsetX={offsets.get(machine.id) ?? 0}
          dotRadius={dotRadius}
          onSelect={onSelectMachine}
        />
      ))}
    </group>
  )
}
