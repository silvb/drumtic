import type { JSXElement } from "solid-js"
import { useAppState } from "../App"
import type { InstrumentId } from "../types"

interface DrumPadProps {
  instrumentId: InstrumentId
  icon: JSXElement
}

export function DrumPad(props: DrumPadProps) {
  const { state, selectInstrument, playFunctions } = useAppState()
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0

  const trigPlay = (e: TouchEvent | MouseEvent) => {
    e.preventDefault()
    if (!state.isPlaying) {
      playFunctions[props.instrumentId]()
    }
    selectInstrument(props.instrumentId)
  }

  return (
    <button
      type="button"
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
