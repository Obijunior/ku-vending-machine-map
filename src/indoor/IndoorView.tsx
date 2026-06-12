import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useNavigate } from 'react-router-dom'
import BuildingScene from './BuildingScene'
import type { Building, VendingMachine } from '../data/types'

type Props = {
  building: Building
  machines: VendingMachine[]
  selectedMachineId: string | null
}

export default function IndoorView({ building, machines, selectedMachineId }: Props) {
  const navigate = useNavigate()
  const selectedFloor = machines.find((m) => m.id === selectedMachineId)?.floor
  const [activeFloor, setActiveFloor] = useState<number | 'all'>(selectedFloor ?? 'all')

  useEffect(() => {
    if (selectedFloor !== undefined) setActiveFloor(selectedFloor)
  }, [selectedFloor])

  return (
    <div className="indoor-view">
      <Canvas camera={{ position: [35, 30, 35], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[50, 80, 30]} intensity={1.4} />
        <BuildingScene
          building={building}
          machines={machines}
          selectedMachineId={selectedMachineId}
          emphasizedFloor={activeFloor === 'all' ? null : activeFloor}
          onSelectMachine={(id) => navigate(`/machine/${id}`)}
        />
        <OrbitControls enableDamping minDistance={8} maxDistance={150} target={[0, 5, 0]} />
      </Canvas>
      <div className="floor-chips">
        <button
          type="button"
          className={activeFloor === 'all' ? 'floor-chip floor-chip--active' : 'floor-chip'}
          onClick={() => setActiveFloor('all')}
        >
          All
        </button>
        {building.floors.map((floor) => (
          <button
            key={floor}
            type="button"
            className={activeFloor === floor ? 'floor-chip floor-chip--active' : 'floor-chip'}
            onClick={() => setActiveFloor(floor)}
          >
            {floor}
          </button>
        ))}
      </div>
    </div>
  )
}
