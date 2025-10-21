import type { PlayFunc } from "../types"

export const playGlitch: PlayFunc = audioContext => {
  if (!audioContext) {
    audioContext = new AudioContext()
  }

  const now = audioContext.currentTime

  // Multiple oscillators for chaotic sound
  const freqs = [800, 1200, 2100, 3300, 5500]

  freqs.forEach((freq, i) => {
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()

    osc.type = "square"

    // Random frequency modulation
    osc.frequency.setValueAtTime(freq, now)
    osc.frequency.linearRampToValueAtTime(
      freq * (0.5 + Math.random()),
      now + 0.05,
    )
    osc.frequency.linearRampToValueAtTime(
      freq * (0.3 + Math.random() * 0.5),
      now + 0.1,
    )

    osc.connect(gain)
    gain.connect(audioContext.destination)

    // Choppy envelope
    const offset = i * 0.015
    gain.gain.setValueAtTime(0, now + offset)
    gain.gain.linearRampToValueAtTime(0.15, now + offset + 0.005)
    gain.gain.setValueAtTime(0, now + offset + 0.02)
    gain.gain.linearRampToValueAtTime(0.1, now + offset + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.15)

    osc.start(now + offset)
    osc.stop(now + offset + 0.15)
  })

  // Add noise burst
  const bufferSize = audioContext.sampleRate * 0.15
  const buffer = audioContext.createBuffer(
    1,
    bufferSize,
    audioContext.sampleRate,
  )
  const data = buffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3))
  }

  const noise = audioContext.createBufferSource()
  noise.buffer = buffer

  const noiseGain = audioContext.createGain()
  noise.connect(noiseGain)
  noiseGain.connect(audioContext.destination)

  noiseGain.gain.setValueAtTime(0.3, now)

  noise.start(now)
}
