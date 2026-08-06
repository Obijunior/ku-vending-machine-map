import { useEffect, useMemo } from 'react'
import { ExtrudeGeometry, Path, Shape } from 'three'
import { FLOOR_HEIGHT } from './projection'

type Props = {
  /** Outer footprint ring in local meters: [east, north] */
  points: [number, number][]
  /** Interior rings in local meters. */
  holes?: [number, number][][]
  elevation: number
  emphasized: boolean
}

function drawRing(path: Shape | Path, points: [number, number][]) {
  points.forEach(([x, y], index) =>
    index === 0 ? path.moveTo(x, y) : path.lineTo(x, y),
  )
  path.closePath()
}

export default function FloorPlate({ points, holes, elevation, emphasized }: Props) {
  const geometry = useMemo(() => {
    const shape = new Shape()
    drawRing(shape, points)
    for (const holePoints of holes ?? []) {
      const hole = new Path()
      drawRing(hole, holePoints)
      shape.holes.push(hole)
    }

    const geo = new ExtrudeGeometry(shape, { depth: FLOOR_HEIGHT, bevelEnabled: false })
    // Shape is in the XY plane (x=east, y=north) extruding along +z.
    // Rotate so it lies flat: north becomes -z, the extrusion points up (+y).
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [points, holes])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} position={[0, elevation, 0]}>
      <meshStandardMaterial
        color="#8aa6cf"
        transparent
        opacity={emphasized ? 0.92 : 0.18}
        depthWrite={emphasized}
        roughness={0.6}
      />
    </mesh>
  )
}
