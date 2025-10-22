import { createSignal, type JSXElement } from "solid-js"
import { useAppState } from "../App"
import type { InstrumentId } from "../types"

interface DrumPadProps {
  instrumentId: InstrumentId
  icon: JSXElement
}

export function DrumPad(props: DrumPadProps) {
  const { state, selectInstrument, playFunctions } = useAppState()
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0
  const [isManuallyTriggered, setIsManuallyTriggered] = createSignal(false)

  const trigPlay = (e: TouchEvent | MouseEvent) => {
    e.preventDefault()
    if (!state.isPlaying) {
      playFunctions[props.instrumentId]()
    }
    selectInstrument(props.instrumentId)

    setIsManuallyTriggered(true)
    setTimeout(() => {
      setIsManuallyTriggered(false)
    }, 100)
  }

  return (
    <button
      type="button"
      class="btn btn-primary btn-square h-20 flex-grow select-none border-none transition-colors ease-in-out"
      classList={{
        "pad-active": state.activePad === props.instrumentId,
        "bg-red-300":
          (state.pattern[props.instrumentId][state.currentStep] &&
            state.isPlaying) ||
          isManuallyTriggered(),
      }}
      onTouchStart={isTouchDevice ? trigPlay : undefined}
      onMouseDown={!isTouchDevice ? trigPlay : undefined}
    >
      {props.icon}
    </button>
  )
}
