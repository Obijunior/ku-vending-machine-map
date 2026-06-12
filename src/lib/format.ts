import type { VendingMachine } from '../data/types'

export function formatPrice(priceCents: number): string {
  return `$${(priceCents / 100).toFixed(2)}`
}

export function machineLabel(machine: VendingMachine): string {
  const base =
    machine.type === 'combo'
      ? 'Snack & drink machine'
      : machine.type === 'drink'
        ? 'Drink machine'
        : 'Snack machine'
  return machine.brand ? `${machine.brand} ${base[0].toLowerCase()}${base.slice(1)}` : base
}
