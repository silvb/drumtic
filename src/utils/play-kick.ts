import type { PlayFunc } from "../types"

export const playKick: PlayFunc = audioContext => {
  if (!audioContext) {
    audioContext = new AudioContext()
  }

  const now = audioContext.currentTime

  // Create oscillator for the kick drum body
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  // Connect nodes
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  // Configure kick drum sound - starts high and drops quickly
  oscillator.type = "sine"
  oscillator.frequency.setValueAtTime(80, now) // Start at 80 Hz
  oscillator.frequency.exponentialRampToValueAtTime(60, now + 0.05) // Drop to 60Hz quickly

  const decay = 0.15

  // Kick drum envelope - sharp attack, quick decay
  gainNode.gain.setValueAtTime(1, now)
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + decay)

  // Start and stop
  oscillator.start(now)
  oscillator.stop(now + decay)
}
