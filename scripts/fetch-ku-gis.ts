// Snapshots KU Smart Campus districts and floor polygons for static hosting.
// Regenerate with: bun run fetch-ku-gis
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildings } from '../src/data/buildings'

const MAP_SERVER =
  'https://opsmaps.ku.edu:6443/arcgis/rest/services/homePagewmProd/MapServer'
const OUTPUT_ROOT = 'public/data'
const FLOOR_OUTPUT = join(OUTPUT_ROOT, 'ku-floors')
const FLOOR_LOCATION_FIELD = 'SDE.FloorAll.BUILDINGLOCATION'
const FLOOR_LEVEL_FIELD = 'SDE.FloorAll.FLOORLOCATION'

type FeatureCollection = {
  type: 'FeatureCollection'
  features: unknown[]
}

function isFeatureCollection(value: unknown): value is FeatureCollection {
  if (typeof value !== 'object' || value === null) return false
  const collection = value as { type?: unknown; features?: unknown }
  return collection.type === 'FeatureCollection' && Array.isArray(collection.features)
}

async function queryGeoJson(layerId: number, parameters: Record<string, string>) {
  const url = new URL(`${MAP_SERVER}/${layerId}/query`)
  url.search = new URLSearchParams({
    ...parameters,
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson',
  }).toString()

  let lastError: unknown
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`${url.pathname} returned ${response.status} ${response.statusText}`)
      }
      const data = (await response.json()) as unknown
      if (!isFeatureCollection(data)) {
        throw new Error(`${url.pathname} did not return a GeoJSON FeatureCollection`)
      }
      return data
    } catch (error) {
      lastError = error
      if (attempt < 3) {
        console.warn(`${url.pathname} failed (attempt ${attempt}/3); retrying`)
        await new Promise((resolve) => setTimeout(resolve, attempt * 500))
      }
    }
  }
  throw lastError
}

function writeGeoJson(path: string, data: FeatureCollection) {
  writeFileSync(path, `${JSON.stringify(data)}\n`)
}

async function main() {
  mkdirSync(OUTPUT_ROOT, { recursive: true })
  rmSync(FLOOR_OUTPUT, { recursive: true, force: true })
  mkdirSync(FLOOR_OUTPUT, { recursive: true })

  const districts = await queryGeoJson(0, {
    where: '1=1',
    outFields: 'OBJECTID,DISTRICT',
  })
  writeGeoJson(join(OUTPUT_ROOT, 'ku-districts.geojson'), districts)
  console.log(`ku-districts: ${districts.features.length} features`)

  for (const building of buildings) {
    if (!building.gisLocationId) {
      console.log(`${building.id}: skipped (no unambiguous KU GIS location id)`)
      continue
    }
    const floors = await queryGeoJson(4, {
      where: `${FLOOR_LOCATION_FIELD}='${building.gisLocationId}'`,
      outFields: FLOOR_LEVEL_FIELD,
      orderByFields: FLOOR_LEVEL_FIELD,
      resultRecordCount: '2000',
    })
    if (floors.features.length === 0) {
      throw new Error(`No KU floor polygons found for ${building.id} (${building.gisLocationId})`)
    }
    writeGeoJson(join(FLOOR_OUTPUT, `${building.id}.geojson`), floors)
    console.log(`${building.id}: ${floors.features.length} floor features`)
  }
}

await main()
