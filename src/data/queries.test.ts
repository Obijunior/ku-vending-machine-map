import { describe, expect, it } from 'vitest'
import { getBuildingById, getMachineById, getMachinesForBuilding } from './queries'

describe('getBuildingById', () => {
  it('returns the building for a known id', () => {
    expect(getBuildingById('wescoe')?.name).toBe('Wescoe Hall')
  })

  it('returns undefined for an unknown id', () => {
    expect(getBuildingById('nope')).toBeUndefined()
  })
})

describe('getMachineById', () => {
  it('returns the machine for a known id', () => {
    expect(getMachineById('wescoe-2-snack')?.type).toBe('snack')
  })

  it('returns undefined for an unknown id', () => {
    expect(getMachineById('nope')).toBeUndefined()
  })
})

describe('getMachinesForBuilding', () => {
  it('returns all machines in a building', () => {
    const ids = getMachinesForBuilding('wescoe').map((m) => m.id)
    expect(ids).toEqual(['wescoe-2-snack', 'wescoe-2-drink'])
  })

  it('returns an empty array for an unknown building', () => {
    expect(getMachinesForBuilding('nope')).toEqual([])
  })
})
