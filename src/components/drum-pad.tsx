import type { JSXElement } from "solid-js"
import type { InstrumentId, PlayFunc } from "../types"

interface DrumPadProps {
  instrumentId: InstrumentId
  playFunc: PlayFunc
  audioContext: AudioContext | null
  icon: JSXElement
}

export function DrumPad(props: DrumPadProps) {
  const handleTouch = (e: MouseEvent | TouchEvent) => {
    e.preventDefault()
    props.playFunc(props.audioContext)
  }
  return (
    <button
      type="button"
      data-instrument-id={props.instrumentId}
      class="btn btn-primary btn-square h-20 flex-grow select-none"
      onTouchStart={handleTouch}
      onMouseDown={handleTouch}
    >
      {props.icon}
    </button>
  )
}
