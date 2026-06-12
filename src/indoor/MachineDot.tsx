import { useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import { machineLabel } from '../lib/format'
import { lngLatToLocal, type LngLat } from './projection'
import type { ThreeEvent } from '@react-three/fiber'
import type { VendingMachine } from '../data/types'

type Props = {
  machine: VendingMachine
  origin: LngLat
  elevation: number
  selected: boolean
  dimmed: boolean
  /** Spreads unpositioned machines sharing a floor centroid apart */
  offsetX: number
  dotRadius: number
  onSelect: (id: string) => void
}

export default function MachineDot({
  machine,
  origin,
  elevation,
  selected,
  dimmed,
  offsetX,
  dotRadius,
  onSelect,
}: Props) {
  const [hovered, setHovered] = useState(false)
  const positioned = machine.position !== undefined
  const [east, north] = positioned ? lngLatToLocal(machine.position!, origin) : [0, 0]
  const color = selected ? '#e8000d' : '#0051ba'

  useEffect(() => () => {
    document.body.style.cursor = ''
  }, [])

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onSelect(machine.id)
    document.body.style.cursor = ''
  }

  return (
    <group position={[east + offsetX, elevation + dotRadius + 0.5, -north]}>
      <mesh
        rotation={positioned ? [0, 0, 0] : [Math.PI / 2, 0, 0]}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = ''
        }}
      >
        {positioned ? (
          <sphereGeometry args={[dotRadius, 24, 24]} />
        ) : (
          <torusGeometry args={[dotRadius, dotRadius * 0.24, 12, 32]} />
        )}
        <meshStandardMaterial color={color} transparent opacity={dimmed ? 0.25 : 1} />
      </mesh>
      {hovered && (
        <Html center distanceFactor={30} style={{ pointerEvents: 'none' }}>
          <div className="indoor-label">
            {machineLabel(machine)} · F{machine.floor}
            {!positioned && ' · approx. location'}
          </div>
        </Html>
      )}
    </group>
  )
}
