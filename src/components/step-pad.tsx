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
      class="btn btn-outline border-2"
      classList={{
        "btn-accent outline-2 outline-black outline-offset-0": props.isActive,
        "btn-secondary": !props.isActive && props.hasPattern,
      }}
      onClick={() => {
        toggleStep(props.step - 1)
      }}
    >
      {props.step}
    </button>
  )
}
