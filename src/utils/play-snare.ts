import type { PlayFunc } from "../types"

export const playSnare: PlayFunc = audioContext => {
  if (!audioContext) {
    audioContext = new AudioContext()
  }

  const decay = 0.5

  const now = audioContext.currentTime

  // Tone component (body)
  const osc = audioContext.createOscillator()
  const oscGain = audioContext.createGain()

  osc.type = "triangle"
  osc.frequency.setValueAtTime(180, now)

  osc.connect(oscGain)
  oscGain.connect(audioContext.destination)

  oscGain.gain.setValueAtTime(0.7, now)
  oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)

  osc.start(now)
  osc.stop(now + 0.2)

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
  noiseFilter.type = "highpass"
  noiseFilter.frequency.setValueAtTime(1000, now)

  const noiseGain = audioContext.createGain()

  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(audioContext.destination)

  noiseGain.gain.setValueAtTime(1, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + decay)

  noise.start(now)
  noise.stop(now + decay)
}
