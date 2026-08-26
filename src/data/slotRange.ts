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

/**
 * Builds one shelf of a Canteen/Revision-style snack machine from a
 * left-to-right item list, matching the numbering printed on the machine:
 * shelf prefix + a column digit that counts UP from the left, e.g. shelf 11
 * reads 110, 112, 114, 116, 118 left to right.
 *
 * Wide shelves (chip bags) fit 5 slots and step by 2 (the default). The
 * narrow candy-bar shelf fits 9-10 slots and steps by 1 — pass `step: 1`
 * for that one.
 *
 * `snackRow(11, [{item: 'Cheetos'}, {item: 'Doritos'}, ...])` for a shelf
 * read straight off a photo, left column first. Pass `null` for an empty or
 * jammed slot to skip it without shifting the rest of the codes.
 */
export function snackRow(
  prefix: number,
  items: Array<Omit<Slot, 'code'> | null>,
  step = 2,
): Slot[] {
  return items.flatMap((details, i) => {
    if (details === null) return []
    return [{ code: `${prefix}${i * step}`, ...details }]
  })
}
