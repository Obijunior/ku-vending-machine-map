import { buildings } from './buildings'
import { machines } from './machines'
import type { Building, VendingMachine } from './types'

export function getBuildingById(id: string): Building | undefined {
  return buildings.find((b) => b.id === id)
}

export function getMachineById(id: string): VendingMachine | undefined {
  return machines.find((m) => m.id === id)
}

export function getMachinesForBuilding(buildingId: string): VendingMachine[] {
  return machines.filter((m) => m.buildingId === buildingId)
}
