import type { JSXElement } from "solid-js"
import { useAppState } from "../App"
import type { InstrumentId, PlayFunc } from "../types"

interface DrumPadProps {
  instrumentId: InstrumentId
  playFunc: PlayFunc
  icon: JSXElement
}

export function DrumPad(props: DrumPadProps) {
  const { state } = useAppState()
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0

  const trigPlay = (e: TouchEvent | MouseEvent) => {
    e.preventDefault()
    props.playFunc(state.audioContext)
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
