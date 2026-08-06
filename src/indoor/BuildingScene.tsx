import { useEffect, useMemo, useState } from 'react'
import FloorPlate from './FloorPlate'
import MachineDot from './MachineDot'
import { floorElevation, lngLatToLocal } from './projection'
import { buildingFootprint } from './footprint'
import { fetchKuFloorPlans, type KuFloorPlan } from './kuFloors'
import type { Building, VendingMachine } from '../data/types'

type Props = {
  building: Building
  machines: VendingMachine[]
  selectedMachineId: string | null
  emphasizedFloor: number | null
  onFloorsLoaded: (floors: number[]) => void
  onSelectMachine: (id: string) => void
}

export default function BuildingScene({
  building,
  machines,
  selectedMachineId,
  emphasizedFloor,
  onFloorsLoaded,
  onSelectMachine,
}: Props) {
  const { points, origin, radius } = useMemo(() => buildingFootprint(building), [building])
  const [floorPlans, setFloorPlans] = useState<KuFloorPlan[] | null>(null)
  const dotRadius = Math.min(Math.max(radius * 0.03, 1.2), 3.5)

  useEffect(() => {
    if (!building.gisLocationId) return
    const controller = new AbortController()
    fetchKuFloorPlans(building.id, controller.signal)
      .then(setFloorPlans)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.warn(`Could not load KU floor plans for ${building.name}; using footprint fallback.`)
        }
      })
    return () => controller.abort()
  }, [building.gisLocationId, building.id, building.name])

  const floors = useMemo(
    () =>
      [...new Set([
        ...(floorPlans?.map((plan) => plan.floor) ?? []),
        ...building.floors,
        ...machines.map((machine) => machine.floor),
      ])].sort((a, b) => a - b),
    [building.floors, floorPlans, machines],
  )

  useEffect(() => onFloorsLoaded(floors), [floors, onFloorsLoaded])

  const projectedPlans = useMemo(() => {
    const plans = new Map<number, { points: [number, number][]; holes: [number, number][][] }[]>()
    for (const plan of floorPlans ?? []) {
      plans.set(
        plan.floor,
        plan.polygons.map((polygon) => ({
          points: polygon.points.map((point) => lngLatToLocal(point, origin)),
          holes: polygon.holes.map((ring) =>
            ring.map((point) => lngLatToLocal(point, origin)),
          ),
        })),
      )
    }
    return plans
  }, [floorPlans, origin])

  // Unpositioned machines on the same floor would stack at the centroid; fan them out.
  const offsets = useMemo(() => {
    const map = new Map<string, number>()
    for (const floor of floors) {
      const unpositioned = machines.filter((m) => m.floor === floor && !m.position)
      unpositioned.forEach((m, i) =>
        map.set(m.id, (i - (unpositioned.length - 1) / 2) * (dotRadius * 2.6)),
      )
    }
    return map
  }, [floors, machines, dotRadius])

  return (
    <group>
      {floors.map((floor) => {
        const polygons = projectedPlans.get(floor)
        if (!polygons?.length) {
          return (
            <FloorPlate
              key={floor}
              points={points}
              elevation={floorElevation(floor, floors)}
              emphasized={emphasizedFloor === null || emphasizedFloor === floor}
            />
          )
        }
        return polygons.map((polygon, index) => (
          <FloorPlate
            key={`${floor}-${index}`}
            points={polygon.points}
            holes={polygon.holes}
            elevation={floorElevation(floor, floors)}
            emphasized={emphasizedFloor === null || emphasizedFloor === floor}
          />
        ))
      })}
      {machines.map((machine) => (
        <MachineDot
          key={machine.id}
          machine={machine}
          origin={origin}
          elevation={floorElevation(machine.floor, floors)}
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
