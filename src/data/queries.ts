import { buildings } from './buildings'
import { buildingEntrances, edges, nodes } from './campusGraph'
import { machines } from './machines'
import { findRoute, nearestNode, type Route } from '../lib/routing'
import type { Building, Coordinates, VendingMachine } from './types'

export function getBuildingById(id: string): Building | undefined {
  return buildings.find((b) => b.id === id)
}

export function getMachineById(id: string): VendingMachine | undefined {
  return machines.find((m) => m.id === id)
}

export function getMachinesForBuilding(buildingId: string): VendingMachine[] {
  return machines.filter((m) => m.buildingId === buildingId)
}

/**
 * Walking route from a starting point to a building's entrance, or null when
 * the building isn't on the path graph yet or nothing connects to it. Callers
 * fall back to straight-line distance and the Google Maps link on null.
 */
export function getRouteToBuilding(
  origin: Coordinates,
  buildingId: string,
): Route | null {
  const entranceId = buildingEntrances[buildingId]
  if (!entranceId) return null

  const graph = { nodes, edges }
  const start = nearestNode(graph, origin)
  if (!start) return null

  return findRoute(graph, start.id, entranceId)
}
