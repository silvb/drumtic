import type { JSXElement } from "solid-js"
import type { InstrumentId, PlayFunc } from "../types"

interface DrumPadProps {
  instrumentId: InstrumentId
  playFunc: PlayFunc
  audioContext: AudioContext | null
  icon: JSXElement
}

export function DrumPad(props: DrumPadProps) {
  let touchStarted = false

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault()
    touchStarted = true
    props.playFunc(props.audioContext)
    // Reset flag after a short delay to allow mouse events on desktop
    setTimeout(() => { touchStarted = false }, 300)
  }

  const handleMouseDown = (e: MouseEvent) => {
    if (touchStarted) return
    e.preventDefault()
    props.playFunc(props.audioContext)
  }

  return (
    <button
      type="button"
      data-instrument-id={props.instrumentId}
      class="btn btn-primary btn-square h-20 flex-grow select-none"
      onTouchStart={handleTouchStart}
      onMouseDown={handleMouseDown}
    >
      {props.icon}
    </button>
  )
}
