// ~0.05° ≈ 5 km of slack around the outermost building. Tight enough that you
// can't pan off to Kansas City and pull down tiles for a map nobody asked for,
// wide enough that the fence stays off-screen: MapLibre draws nothing outside
// maxBounds, and at pitch 45 the near edge of the viewport reaches a couple of
// km past the map centre. Padding under ~0.04 puts that blank wedge on screen.
export const CAMPUS_PADDING_DEG = 0.05

/** South-west and north-east corners of a padded box around every point. */
export function campusBounds(
  points: [number, number][],
): [[number, number], [number, number]] {
  const lngs = points.map(([lng]) => lng)
  const lats = points.map(([, lat]) => lat)
  return [
    [Math.min(...lngs) - CAMPUS_PADDING_DEG, Math.min(...lats) - CAMPUS_PADDING_DEG],
    [Math.max(...lngs) + CAMPUS_PADDING_DEG, Math.max(...lats) + CAMPUS_PADDING_DEG],
  ]
}
