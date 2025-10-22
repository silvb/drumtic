import type { JSXElement } from "solid-js"
import { useAppState } from "../App"
import type { InstrumentId, PlayFunc } from "../types"

interface DrumPadProps {
  instrumentId: InstrumentId
  playFunc: PlayFunc
  icon: JSXElement
}

export function DrumPad(props: DrumPadProps) {
  const { state, selectInstrument } = useAppState()
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0

  const trigPlay = (e: TouchEvent | MouseEvent) => {
    e.preventDefault()
    props.playFunc(state.audioContext)
    selectInstrument(props.instrumentId)
  }

  return (
    <button
      type="button"
      data-instrument-id={props.instrumentId}
      class="btn btn-primary btn-square h-20 flex-grow select-none"
      classList={{
        "outline-2 outline-red-500": state.activePad === props.instrumentId,
      }}
      onTouchStart={isTouchDevice ? trigPlay : undefined}
      onMouseDown={!isTouchDevice ? trigPlay : undefined}
    >
      {props.icon}
    </button>
  )
}
