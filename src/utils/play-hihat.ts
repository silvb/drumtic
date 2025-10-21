import type { PlayFunc } from "../types"

export const playHihat: PlayFunc = audioContext => {
  if (!audioContext) {
    audioContext = new AudioContext()
  }

  const now = audioContext.currentTime

  // Create noise buffer
  const bufferSize = audioContext.sampleRate * 0.1
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

  // High-pass filter for metallic sound
  const highpass = audioContext.createBiquadFilter()
  highpass.type = "highpass"
  highpass.frequency.setValueAtTime(7000, now)

  // Band-pass for resonance
  const bandpass = audioContext.createBiquadFilter()
  bandpass.type = "bandpass"
  bandpass.frequency.setValueAtTime(10000, now)
  bandpass.Q.setValueAtTime(1, now)

  const gain = audioContext.createGain()

  noise.connect(highpass)
  highpass.connect(bandpass)
  bandpass.connect(gain)
  gain.connect(audioContext.destination)

  gain.gain.setValueAtTime(0.6, now)
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)

  noise.start(now)
}
