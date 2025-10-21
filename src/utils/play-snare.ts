import type { PlayFunc } from "../types"
import { createSaturation } from "./create-saturation"

export const playSnare: PlayFunc = audioContext => {
  if (!audioContext) {
    audioContext = new AudioContext()
  }

  const decay = 0.15
  const bodyDecay = 0.12

  const now = audioContext.currentTime

  // FM Body component (clangy/metallic tone)
  const carrier = audioContext.createOscillator()
  const modulator = audioContext.createOscillator()
  const modulatorGain = audioContext.createGain()
  const bodyGain = audioContext.createGain()

  const saturation = createSaturation(audioContext, 0.5, 10)
  // Connect FM synthesis chain
  modulator.connect(modulatorGain)
  modulatorGain.connect(carrier.frequency)
  carrier.connect(bodyGain)
  bodyGain.connect(saturation)
  saturation.connect(audioContext.destination)

  // Configure carrier (body frequency)
  carrier.type = "sine"
  carrier.frequency.setValueAtTime(200, now)
  carrier.frequency.exponentialRampToValueAtTime(180, now + 0.02) // Brief downward sweep

  // Configure modulator (inharmonic ratio 2.3:1 for metallic clang)
  modulator.type = "sine"
  modulator.frequency.setValueAtTime(460, now) // 2.3 * 200Hz

  // Aggressive modulation index: starts high, decays fast
  modulatorGain.gain.setValueAtTime(180, now) // High mod index (9-10)
  modulatorGain.gain.exponentialRampToValueAtTime(0.1, now + bodyDecay)

  // Body envelope: fast attack, quick decay
  bodyGain.gain.setValueAtTime(0.6, now)
  bodyGain.gain.exponentialRampToValueAtTime(0.01, now + bodyDecay)

  carrier.start(now)
  carrier.stop(now + bodyDecay)
  modulator.start(now)
  modulator.stop(now + bodyDecay)

  // Noise component (snares)
  const bufferSize = audioContext.sampleRate * 0.2
  const buffer = audioContext.createBuffer(
    1,
    bufferSize,
    audioContext.sampleRate,
  )
  const data = buffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const noise = audioContext.createBufferSource()
  noise.buffer = buffer

  const noiseFilter = audioContext.createBiquadFilter()
  noiseFilter.type = "bandpass"
  noiseFilter.frequency.setValueAtTime(3000, now) // Center of 1-8kHz range
  noiseFilter.Q.setValueAtTime(2, now) // Bandpass Q factor

  const noiseGain = audioContext.createGain()

  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(saturation)
  saturation.connect(audioContext.destination)

  noiseGain.gain.setValueAtTime(0.8, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1) // Shorter noise decay

  noise.start(now)
  noise.stop(now + 0.15)
}
