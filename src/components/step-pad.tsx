interface StepPadProps {
  step: number
  isActive?: boolean
}

export function StepPad(props: StepPadProps) {
  return (
    <button
      type="button"
      class={`btn btn-outline border-2 ${props.isActive ? "btn-primary" : ""}`}
    >
      {props.step}
    </button>
  )
}
