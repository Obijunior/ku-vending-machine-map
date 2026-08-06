import { Crosshair, MapPin, X } from '@phosphor-icons/react'
import type { UserOrigin } from '../data/types'

type Props = {
  origin: UserOrigin | null
  isLocating: boolean
  isPickingOrigin: boolean
  error: string | null
  onUseLocation: () => void
  onStartPin: () => void
  onClear: () => void
}

export default function LocationControls({
  origin,
  isLocating,
  isPickingOrigin,
  error,
  onUseLocation,
  onStartPin,
  onClear,
}: Props) {
  let status = 'Choose a starting point to see the nearest machines.'
  if (isLocating) status = 'Finding your location…'
  else if (isPickingOrigin) status = 'Click the campus map to set your starting point.'
  else if (origin?.source === 'device') status = 'Using your current location.'
  else if (origin?.source === 'pin') status = 'Using your dropped pin.'
  else if (error) status = error

  return (
    <section className="location-controls" aria-label="Starting location">
      <div className="location-actions">
        <button type="button" onClick={onUseLocation} disabled={isLocating}>
          <Crosshair size={17} weight="bold" aria-hidden="true" />
          <span>{origin?.source === 'device' ? 'Update location' : 'Use my location'}</span>
        </button>
        <button
          type="button"
          className={isPickingOrigin ? 'location-action--active' : ''}
          aria-pressed={isPickingOrigin}
          onClick={onStartPin}
        >
          <MapPin size={17} weight="bold" aria-hidden="true" />
          <span>{origin?.source === 'pin' ? 'Move pin' : 'Drop a pin'}</span>
        </button>
        {origin && (
          <button
            type="button"
            className="location-clear"
            aria-label="Clear starting point"
            title="Clear starting point"
            onClick={onClear}
          >
            <X size={16} weight="bold" aria-hidden="true" />
          </button>
        )}
      </div>
      <p className={`location-status${error && !origin ? ' location-status--error' : ''}`} aria-live="polite">
        {status}
      </p>
    </section>
  )
}
