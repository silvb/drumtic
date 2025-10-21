/**
 * Creates a soft saturation waveshaper for Genesis-style warmth and glueyness
 * @param audioContext - The audio context to create the waveshaper in
 * @param threshold - Clipping threshold (0-1, default 0.8)
 * @param intensity - Saturation intensity (1-10, default 5)
 * @returns WaveShaperNode configured for soft saturation
 */
export function createSaturation(
  audioContext: AudioContext,
  threshold: number = 0.8,
  intensity: number = 5,
): WaveShaperNode {
  const saturation = audioContext.createWaveShaper()
  const curve = new Float32Array(1024)

  for (let i = 0; i < 1024; i++) {
    const x = i / 512 - 1

    // Soft clipping with tanh saturation
    if (x > threshold) {
      curve[i] =
        threshold + (1 - threshold) * Math.tanh((x - threshold) * intensity)
    } else if (x < -threshold) {
      curve[i] =
        -threshold - (1 - threshold) * Math.tanh((-x - threshold) * intensity)
    } else {
      curve[i] = x
    }
  }

  saturation.curve = curve
  saturation.oversample = "none"

  return saturation
}
