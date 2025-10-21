import type { JSXElement } from "solid-js"
import type { InstrumentId, PlayFunc } from "../types"

interface DrumPadProps {
  instrumentId: InstrumentId
  playFunc: PlayFunc
  audioContext: AudioContext | null
  icon: JSXElement
}

export function DrumPad(props: DrumPadProps) {
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0

  const trigPlay = (e: TouchEvent | MouseEvent) => {
    e.preventDefault()
    props.playFunc(props.audioContext)
  }

  return (
    <button
      type="button"
      data-instrument-id={props.instrumentId}
      class="btn btn-primary btn-square h-20 flex-grow select-none"
      onTouchStart={isTouchDevice ? trigPlay : undefined}
      onMouseDown={!isTouchDevice ? trigPlay : undefined}
    >
      {props.icon}
    </button>
  )
}
