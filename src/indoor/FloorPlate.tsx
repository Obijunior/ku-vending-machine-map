import { useEffect, useMemo } from 'react'
import { ExtrudeGeometry, Shape } from 'three'
import { FLOOR_HEIGHT } from './projection'

type Props = {
  /** Footprint in local meters: [east, north] */
  points: [number, number][]
  elevation: number
  emphasized: boolean
}

export default function FloorPlate({ points, elevation, emphasized }: Props) {
  const geometry = useMemo(() => {
    const shape = new Shape()
    points.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)))
    shape.closePath()
    const geo = new ExtrudeGeometry(shape, { depth: FLOOR_HEIGHT, bevelEnabled: false })
    // Shape is in the XY plane (x=east, y=north) extruding along +z.
    // Rotate so it lies flat: north becomes -z, the extrusion points up (+y).
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [points])

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
