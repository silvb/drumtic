export function convertSemitonesToPitchFactor(pitch: number): number {
  return 2 ** (pitch / 12)
}
