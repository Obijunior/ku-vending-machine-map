import { slotRange } from './slotRange'
import type { Slot } from './types'

/**
 * Vendor's stock Starbucks-branded drink loadout, shared by machines that
 * haven't been swapped out from the default mix, e.g. `anschutz-2-drink`
 * and `learned-2-drink`.
 */
export function starbucksDefaultDrinkSlots(): Slot[] {
  return [
    ...slotRange('A1', 'A9', {item: 'Life Wtr'}),
    ...slotRange('B1', 'B3', {item: 'Starbucks Cold Brew', flavor: 'Chocolate Cream'}),
    ...slotRange('B4', 'B6', {item: 'Alani', flavor: 'Pink Slush'}),
    ...slotRange('B7', 'B9', {item: 'Starbucks Cold Brew', flavor: 'Vanilla Sweet Cream'}),
    ...slotRange('C1', 'C3', {item: 'Doubleshot Energy', flavor: 'Mocha'}),
    ...slotRange('C4', 'C6', {item: 'Doubleshot Energy', flavor: 'Vanilla'}),
    ...slotRange('C7', 'C9', {item: 'Doubleshot Energy', flavor: 'White Chocolate'}),
    ...slotRange('D1', 'D6', {item: 'Starbucks Frappuccino', flavor: 'Mocha'}),
    ...slotRange('D7', 'D9', {item: 'Starbucks Frappuccino', flavor: 'Coffee'}),
    ...slotRange('E1', 'E6', {item: 'Starbucks Frappuccino', flavor: 'Vanilla'}),
    ...slotRange('E7', 'E9', {item: 'Starbucks Frappuccino', flavor: 'Caramel'}),
  ]
}
