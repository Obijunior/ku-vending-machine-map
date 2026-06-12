import { describe, expect, it } from 'vitest'
import { formatPrice, machineLabel } from './format'
import type { VendingMachine } from '../data/types'

describe('formatPrice', () => {
  it('formats cents as dollars', () => {
    expect(formatPrice(175)).toBe('$1.75')
  })

  it('pads whole-dollar amounts', () => {
    expect(formatPrice(200)).toBe('$2.00')
  })

  it('handles amounts over ten dollars', () => {
    expect(formatPrice(1050)).toBe('$10.50')
  })
})

function machineWith(overrides: Partial<VendingMachine>): VendingMachine {
  return {
    id: 'test',
    buildingId: 'test',
    type: 'snack',
    floor: 1,
    locationNote: '',
    lastUpdated: '2026-06-11',
    slots: [],
    ...overrides,
  }
}

describe('machineLabel', () => {
  it('labels a branded drink machine', () => {
    expect(machineLabel(machineWith({ type: 'drink', brand: 'Pepsi' }))).toBe(
      'Pepsi drink machine',
    )
  })

  it('labels an unbranded snack machine', () => {
    expect(machineLabel(machineWith({ type: 'snack' }))).toBe('Snack machine')
  })

  it('labels a combo machine', () => {
    expect(machineLabel(machineWith({ type: 'combo' }))).toBe('Snack & drink machine')
  })
})
