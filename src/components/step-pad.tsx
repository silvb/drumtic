interface StepPadProps {
  step: number
}

export function StepPad(props: StepPadProps) {
  return (
    <button type="button" class="btn btn-outline border-2">
      {props.step}
    </button>
  )
}
