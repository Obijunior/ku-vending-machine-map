import type { Slot } from './types'

const CODE_PATTERN = /^([A-Za-z]*)(\d+)$/

/**
 * Expands a same-prefix slot code range into individual slots sharing the
 * same item details, e.g. `slotRange('B1', 'B9', { item: 'Pepsi', category: 'soda' })`
 * for nine slots that all stock the same thing.
 */
export function slotRange(from: string, to: string, details: Omit<Slot, 'code'>): Slot[] {
  const start = CODE_PATTERN.exec(from)
  const end = CODE_PATTERN.exec(to)
  if (!start || !end || start[1] !== end[1]) {
    throw new Error(`slotRange: '${from}' and '${to}' must share a letter prefix, e.g. 'B1' and 'B9'`)
  }

  const prefix = start[1]
  const startNum = Number(start[2])
  const endNum = Number(end[2])
  if (endNum < startNum) {
    throw new Error(`slotRange: '${to}' comes before '${from}'`)
  }

  return Array.from({ length: endNum - startNum + 1 }, (_, i) => ({
    code: `${prefix}${startNum + i}`,
    ...details,
  }))
}
