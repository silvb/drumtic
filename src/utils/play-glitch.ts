import type { PlayFunc } from "../types"
import { createSaturation } from "./create-saturation"

export const playGlitch: PlayFunc = audioContext => {
  if (!audioContext) {
    audioContext = new AudioContext()
  }

  const now = audioContext.currentTime
  const masterGain = audioContext.createGain()

  // Randomization for organic feel (per-trigger variations)
  const pitchVariation = -150 + Math.random() * 300 // ±150 cents
  const lengthVariation = 0.6 + Math.random() * 0.8 // ±40%
  const ampVariation = 0.85 + Math.random() * 0.3 // ±3dB
  const filterVariation = -800 + Math.random() * 1600 // ±800Hz
  const feedbackVariation = 0.9 + Math.random() * 0.2 // ±10%

  // Genesis-style post-processing chain
  const genesisFilter = audioContext.createBiquadFilter()
  genesisFilter.type = "lowpass"
  genesisFilter.frequency.setValueAtTime(14000, now) // Genesis bandwidth
  genesisFilter.Q.setValueAtTime(1.2, now)

  const characterFilter = audioContext.createBiquadFilter()
  characterFilter.type = "peaking"
  characterFilter.frequency.setValueAtTime(5000 + filterVariation, now) // 4-6kHz character boost
  characterFilter.Q.setValueAtTime(2, now)
  characterFilter.gain.setValueAtTime(3, now)

  const highpass = audioContext.createBiquadFilter()
  highpass.type = "highpass"
  highpass.frequency.setValueAtTime(90, now) // Remove rumble

  // Soft saturation for Genesis-style warmth
  const saturation = createSaturation(audioContext, 0.2, 10)

  // Connect post-processing chain
  masterGain.connect(saturation)
  saturation.connect(highpass)
  highpass.connect(characterFilter)
  characterFilter.connect(genesisFilter)
  genesisFilter.connect(audioContext.destination)

  // LAYER 1: FM Body (40% mix) - The main Genesis FM character
  const fmGain = audioContext.createGain()
  fmGain.gain.setValueAtTime(0.4 * ampVariation, now)
  fmGain.connect(masterGain)

  // Create 3 FM operators with different extreme settings
  const operators = [
    { ratio: 7.3, modIndex: 12, feedback: 0.8 * feedbackVariation },
    { ratio: 11.2, modIndex: 9, feedback: 0.65 * feedbackVariation },
    { ratio: 13.7, modIndex: 15, feedback: 0.9 * feedbackVariation },
  ]

  operators.forEach((op, i) => {
    const carrier = audioContext.createOscillator()
    const modulator = audioContext.createOscillator()
    const modulatorGain = audioContext.createGain()
    const operatorGain = audioContext.createGain()

    // High-frequency carriers (3-8kHz range)
    const baseFreq = 1200 + i * 800 + pitchVariation * 5 // Reduced base freq and pitch variation impact
    const pitchFactor = 2 ** (pitchVariation / 1200)
    const carrierFreq = Math.min(baseFreq * pitchFactor, 8000) // Cap carrier at 8kHz
    const modFreq = Math.min(carrierFreq * op.ratio, 20000) // Cap modulator at 20kHz (below Nyquist)

    // Extreme feedback setup (the secret sauce!)
    const feedbackGain = audioContext.createGain()
    feedbackGain.gain.setValueAtTime(op.feedback, now)
    carrier.connect(feedbackGain)
    feedbackGain.connect(carrier.frequency)

    // Standard FM connections
    modulator.connect(modulatorGain)
    modulatorGain.connect(carrier.frequency)
    carrier.connect(operatorGain)
    operatorGain.connect(fmGain)

    carrier.type = "sine"
    modulator.type = "sine"
    carrier.frequency.setValueAtTime(carrierFreq, now)
    modulator.frequency.setValueAtTime(modFreq, now)

    // Pitch envelope - brief wobble
    const pitchSweep = 200 + Math.random() * 100
    carrier.frequency.linearRampToValueAtTime(
      carrierFreq + pitchSweep,
      now + 0.015,
    )
    carrier.frequency.exponentialRampToValueAtTime(
      carrierFreq - 100,
      now + 0.045,
    )

    // High mod index for dense overtones
    const modIndex = op.modIndex * 20 // Convert to Hz
    modulatorGain.gain.setValueAtTime(modIndex, now)
    modulatorGain.gain.exponentialRampToValueAtTime(
      0.1,
      now + 0.05 * lengthVariation,
    )

    const decay = i * 0.02

    // Sharp FM envelope
    const opLength = (0.02 + Math.random() * 0.08) * lengthVariation
    operatorGain.gain.setValueAtTime(0.33, now + decay) // Slight time offset
    operatorGain.gain.exponentialRampToValueAtTime(
      0.001,
      now + decay + opLength,
    )

    carrier.start(now + decay)
    carrier.stop(now + decay + opLength)
    modulator.start(now + decay)
    modulator.stop(now + decay + opLength)
  })

  // 9-bit bitcrusher for FM layer (YM2612 DAC emulation)
  const fmBitCrusher = audioContext.createWaveShaper()
  const fmCurve = new Float32Array(1024)
  const fmLevels = 511 // 9-bit
  for (let i = 0; i < 1024; i++) {
    const x = i / 512 - 1
    // Enhanced ladder effect - more aggressive quantization at low volumes
    const ladderFactor = Math.abs(x) < 0.3 ? 0.5 : 1.0
    fmCurve[i] =
      Math.round(x * fmLevels * ladderFactor) / (fmLevels * ladderFactor)
  }
  fmBitCrusher.curve = fmCurve
  fmBitCrusher.oversample = "none"

  fmGain.disconnect()
  fmGain.connect(fmBitCrusher)
  fmBitCrusher.connect(masterGain)

  // LAYER 2: Transient Click (20% mix) - Digital spike attack
  const clickGain = audioContext.createGain()
  clickGain.gain.setValueAtTime(0.2 * ampVariation, now)

  const clickOsc = audioContext.createOscillator()
  clickOsc.type = "square"
  clickOsc.frequency.setValueAtTime(10000, now) // High-frequency burst

  // 6-bit crushing for harsh digital spike
  const clickBitCrusher = audioContext.createWaveShaper()
  const clickCurve = new Float32Array(1024)
  const clickLevels = 63 // 6-bit
  for (let i = 0; i < 1024; i++) {
    const x = i / 512 - 1
    clickCurve[i] = Math.round(x * clickLevels) / clickLevels
  }
  clickBitCrusher.curve = clickCurve
  clickBitCrusher.oversample = "none"

  clickOsc.connect(clickBitCrusher)
  clickBitCrusher.connect(clickGain)
  clickGain.connect(masterGain)

  // Very short click envelope
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.005)

  clickOsc.start(now)
  clickOsc.stop(now + 0.005)

  // LAYER 3: Noise Texture (30% mix) - Filtered noise component
  const noiseGain = audioContext.createGain()
  noiseGain.gain.setValueAtTime(0.3 * ampVariation, now)

  const noiseLength = (3.03 + Math.random() * 0.03) * lengthVariation
  const noiseBuffer = audioContext.createBuffer(
    1,
    audioContext.sampleRate * noiseLength,
    audioContext.sampleRate,
  )
  const noiseData = noiseBuffer.getChannelData(0)

  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = Math.random() * 2 - 1
  }

  const noiseSource = audioContext.createBufferSource()
  noiseSource.buffer = noiseBuffer

  // Bandpass filter for noise texture
  const noiseBandpass = audioContext.createBiquadFilter()
  noiseBandpass.type = "bandpass"
  noiseBandpass.frequency.setValueAtTime(4000 + filterVariation, now)
  noiseBandpass.Q.setValueAtTime(3, now)

  // 8-bit crushing for noise
  const noiseBitCrusher = audioContext.createWaveShaper()
  const noiseCurve = new Float32Array(1024)
  const noiseLevels = 255 // 8-bit
  for (let i = 0; i < 1024; i++) {
    const x = i / 512 - 1
    noiseCurve[i] = Math.round(x * noiseLevels) / noiseLevels
  }
  noiseBitCrusher.curve = noiseCurve
  noiseBitCrusher.oversample = "none"

  noiseSource.connect(noiseBandpass)
  noiseBandpass.connect(noiseBitCrusher)
  noiseBitCrusher.connect(noiseGain)
  noiseGain.connect(masterGain)

  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseLength)

  noiseSource.start(now + 0.003) // Slight offset
  noiseSource.stop(now + 0.003 + noiseLength)

  // LAYER 4: Sub Thump (10% mix) - Low-end weight
  const subGain = audioContext.createGain()
  subGain.gain.setValueAtTime(0.1 * ampVariation, now)

  const subOsc = audioContext.createOscillator()
  subOsc.type = "sine"
  subOsc.frequency.setValueAtTime(80 + Math.random() * 40, now) // 60-120Hz

  subOsc.connect(subGain)
  subGain.connect(masterGain)

  // Quick sub decay
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02)

  subOsc.start(now + 0.005) // Slight offset
  subOsc.stop(now + 0.025)

  // Master envelope
  masterGain.gain.setValueAtTime(0.7, now)
  masterGain.gain.exponentialRampToValueAtTime(
    0.001,
    now + 0.1 * lengthVariation,
  )
}
