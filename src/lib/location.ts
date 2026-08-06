import type { Coordinates } from '../data/types'

const EARTH_RADIUS_METERS = 6_371_000
const METERS_PER_MILE = 1_609.344
const FEET_PER_METER = 3.28084

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

/** Great-circle distance between two [longitude, latitude] points. */
export function distanceMeters(from: Coordinates, to: Coordinates): number {
  const [fromLng, fromLat] = from.map(toRadians)
  const [toLng, toLat] = to.map(toRadians)
  const deltaLat = toLat - fromLat
  const deltaLng = toLng - fromLng
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine))
}

export function formatDistance(meters: number): string {
  const feet = meters * FEET_PER_METER
  if (feet < 1_000) {
    const roundedFeet = Math.round(feet / 50) * 50
    return `${roundedFeet} ft`
  }

  const miles = meters / METERS_PER_MILE
  return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`
}

export function walkingDirectionsUrl(
  origin: Coordinates,
  destination: Coordinates,
): string {
  const url = new URL('https://www.google.com/maps/dir/')
  url.searchParams.set('api', '1')
  url.searchParams.set('origin', `${origin[1]},${origin[0]}`)
  url.searchParams.set('destination', `${destination[1]},${destination[0]}`)
  url.searchParams.set('travelmode', 'walking')
  return url.toString()
}
