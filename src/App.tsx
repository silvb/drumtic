import { type Component, For } from "solid-js"

const App: Component = () => {
  let audioContext: AudioContext | null = null

  const playKick = (e: MouseEvent) => {
    e.preventDefault()

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

  const playSnare = (e: MouseEvent) => {
    e.preventDefault()

    if (!audioContext) {
      audioContext = new AudioContext()
    }

    const decay = 0.9

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
  }

  const playHihat = (e: MouseEvent) => {
    e.preventDefault()

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

  const playGlitch = (e: MouseEvent) => {
    e.preventDefault()

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

  return (
    <div class="flex h-screen flex-col items-stretch justify-end gap-4 p-4">
      <div class="flex items-center justify-center gap-2">
        <button
          type="button"
          class="btn btn-primary btn-xl btn-square flex-grow"
          onClick={playKick}
        >
          <svg
            viewBox="0 0 32 32"
            class="size-8"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>kick drum</title>
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="currentColor"
              stroke-width={2}
            />
            <circle cx="16" cy="16" r="4" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          class="btn btn-primary btn-xl btn-square flex-grow"
          onClick={playSnare}
        >
          <svg
            viewBox="0 0 32 32"
            class="size-8"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>snare drum</title>
            <g fill="none" transform="rotate(45 16 16)">
              <rect
                x="6"
                y="6"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                stroke-width={2}
                stroke-linejoin="round"
              />
              <rect x="11" y="11" width="4" height="4" fill="currentColor" />
              <rect x="17" y="11" width="4" height="4" fill="currentColor" />
              <rect x="11" y="17" width="4" height="4" fill="currentColor" />
              <rect x="17" y="17" width="4" height="4" fill="currentColor" />
            </g>
          </svg>
        </button>
        <button
          type="button"
          class="btn btn-primary btn-xl btn-square flex-grow"
          onClick={playHihat}
        >
          <svg
            viewBox="0 0 32 32"
            class="size-8"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>hihat</title>
            <polygon
              points="16,4 28,22 4,22"
              fill="none"
              stroke="currentColor"
              stroke-width={2}
            />
            <polygon
              points="16,10 28,28 4,28"
              fill="none"
              stroke="currentColor"
              stroke-width={2}
            />
            <polygon points="16,10 24,22 8,22" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          class="btn btn-primary btn-xl btn-square flex-grow"
          onClick={playGlitch}
        >
          <svg
            viewBox="0 0 32 32"
            class="size-8"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>glitch</title>
            <polyline
              points="2,16 8,10 14,22 20,10 26,22 30,16"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <div class="mx-auto grid w-auto grid-cols-8 grid-rows-2 gap-2">
        <For each={Array.from({ length: 16 })}>
          {(item, index) => (
            <button type="button" class="btn btn-outline">
              {`${index() + 1}`}
            </button>
          )}
        </For>
      </div>
    </div>
  )
}

export default App
