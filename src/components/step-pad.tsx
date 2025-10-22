import { useAppState } from "../App"

interface StepPadProps {
  step: number
  isActive?: boolean
  hasPattern?: boolean
}

export function StepPad(props: StepPadProps) {
  const { toggleStep } = useAppState()

  return (
    <button
      type="button"
      class="btn btn-outline border-2 border-secondary hover:bg-red-300"
      classList={{
        "pad-active": props.isActive,
        "bg-red-300": props.hasPattern,
      }}
      onClick={() => {
        toggleStep(props.step - 1)
      }}
    >
      {props.step}
    </button>
  )
}
