import type { PlayFunc } from "../types"
import { convertSemitonesToPitchFactor } from "./convert-pitch"
import { createSaturation } from "./create-saturation"

export const playKick: PlayFunc = audioContext => {
  if (!audioContext) {
    audioContext = new AudioContext()
  }

  const pitch = convertSemitonesToPitchFactor(-4)
  const modDepth = 50
  const modFreq = 320 * pitch
  const sweepLength = 0.05
  const sweep = 150 * pitch
  const baseFreq = 60 * pitch
  const decay = 0.15

  const now = audioContext.currentTime

  // Create carrier oscillator for the kick drum body
  const carrier = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  // Create FM modulator for texture
  const modulator = audioContext.createOscillator()
  const modulatorGain = audioContext.createGain()

  const saturation = createSaturation(audioContext, 0.5, 7)

  // Connect nodes - modulator modulates carrier frequency
  modulator.connect(modulatorGain)
  modulatorGain.connect(carrier.frequency)
  carrier.connect(gainNode)
  gainNode.connect(saturation)
  saturation.connect(audioContext.destination)

  // Configure carrier - starts high and drops quickly
  carrier.type = "sine"
  carrier.frequency.setValueAtTime(baseFreq + sweep, now)
  carrier.frequency.exponentialRampToValueAtTime(baseFreq, now + sweepLength) // Drop quickly

  // Configure FM modulator for texture
  modulator.type = "sine"
  modulator.frequency.setValueAtTime(modFreq, now) // Half the carrier frequency
  modulatorGain.gain.setValueAtTime(modDepth, now) // Modulation depth

  // Kick drum envelope - sharp attack, quick decay
  gainNode.gain.setValueAtTime(1, now)
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + decay)

  // Start and stop
  carrier.start(now)
  carrier.stop(now + decay)
  modulator.start(now)
  modulator.stop(now + decay)
}
