import type { PlayFunc } from "../types"
import { createSaturation } from "./create-saturation"

export const playHihat: PlayFunc = audioContext => {
  if (!audioContext) {
    audioContext = new AudioContext()
  }

  const now = audioContext.currentTime

  // Randomization for human feel
  const decayVariation = 0.85 + Math.random() * 0.3 // ±15% decay time
  const decay = (0.12 + Math.random() * 0.08) * decayVariation // 80-200ms range with variation
  const masterGain = audioContext.createGain()
  const saturation = createSaturation(audioContext, 0.2, 10)

  // Randomized bitcrushing for varied grit
  const bitDepth = 10 + Math.floor(Math.random() * 3) // 10-12 bits randomly
  const bitLevels = 2 ** bitDepth - 1

  // Overall pitch variation per hit (±3% for natural drift)
  const globalPitchShift = 0.97 + Math.random() * 0.06

  masterGain.connect(saturation)
  saturation.connect(audioContext.destination)

  // Detuned carrier pairs with randomized spacing for varied beating
  const baseDetuning = 0.95 + Math.random() * 0.1 // ±5% detuning variation
  const carrierPairs = [
    [2800 * globalPitchShift, 2950 * globalPitchShift * baseDetuning],
    [4100 * globalPitchShift, 4300 * globalPitchShift * baseDetuning],
    [5700 * globalPitchShift, 6000 * globalPitchShift * baseDetuning],
  ]

  // "Ugly" modulator ratios for wonky character
  const modulatorRatios = [1.83, 2.41, 3.67, 4.92]

  carrierPairs.forEach((pair, pairIndex) => {
    pair.forEach((baseFreq, carrierIndex) => {
      const carrier = audioContext.createOscillator()
      const modulator = audioContext.createOscillator()
      const modulatorGain = audioContext.createGain()
      const carrierGain = audioContext.createGain()

      // Bitcrushing waveshaper for lo-fi grit
      const bitCrusher = audioContext.createWaveShaper()
      const curve = new Float32Array(1024)
      for (let i = 0; i < 1024; i++) {
        const x = i / 512 - 1
        curve[i] = Math.round(x * bitLevels) / bitLevels
      }
      bitCrusher.curve = curve
      bitCrusher.oversample = "none"

      // Phase offset for carrier pairs (out of phase beating)
      const _phaseOffset = carrierIndex * Math.PI * 0.3

      // Enhanced pitch wobble for tape flutter (±5-15 cents per oscillator)
      const wobbleCents = -15 + Math.random() * 30
      const wobbleFactor = 2 ** (wobbleCents / 1200)
      const freq = baseFreq * wobbleFactor

      // Randomized pitch droop over decay (5-25Hz variation)
      const pitchSag = 5 + Math.random() * 20

      // Connect FM chain with bitcrusher
      modulator.connect(modulatorGain)
      modulatorGain.connect(carrier.frequency)
      carrier.connect(bitCrusher)
      bitCrusher.connect(carrierGain)
      carrierGain.connect(masterGain)

      // Configure oscillators
      carrier.type = "sine"
      modulator.type = "sine"
      carrier.frequency.setValueAtTime(freq, now)
      carrier.frequency.exponentialRampToValueAtTime(
        freq - pitchSag,
        now + decay,
      )

      // Randomized modulator ratio selection and slight detuning
      const baseModRatio = modulatorRatios[pairIndex % modulatorRatios.length]
      const modRatioVariation = 0.98 + Math.random() * 0.04 // ±2% mod ratio variation
      const modRatio = baseModRatio * modRatioVariation
      modulator.frequency.setValueAtTime(freq * modRatio, now)

      // Randomized mod index for varied texture (2-5 range with more variation)
      const modIndex = 30 + Math.random() * 80 // Maps to ~1.5-5 effective mod index
      const modDecayVariation = 0.6 + Math.random() * 0.6 // Varied decay speed
      modulatorGain.gain.setValueAtTime(modIndex, now)
      modulatorGain.gain.exponentialRampToValueAtTime(
        3,
        now + decay * modDecayVariation,
      )

      // Individual carrier envelope
      const gain = 0.08 / (carrierPairs.length * 2) // Balance all carriers
      carrierGain.gain.setValueAtTime(gain, now)
      carrierGain.gain.exponentialRampToValueAtTime(0.001, now + decay)

      carrier.start(now)
      carrier.stop(now + decay)
      modulator.start(now)
      modulator.stop(now + decay)
    })
  })

  // Randomized vintage bandpass filter (3-9kHz, cut super-highs)
  const vintageFilter = audioContext.createBiquadFilter()
  vintageFilter.type = "bandpass"
  const filterCenter = 5500 + Math.random() * 1000 // 5.5-6.5kHz center variation
  const filterQ = 1.2 + Math.random() * 0.6 // 1.2-1.8 Q variation
  vintageFilter.frequency.setValueAtTime(filterCenter, now)
  vintageFilter.Q.setValueAtTime(filterQ, now)

  // High-frequency roll-off (-6dB above 10kHz)
  const highCut = audioContext.createBiquadFilter()
  highCut.type = "lowpass"
  highCut.frequency.setValueAtTime(10000, now)
  highCut.Q.setValueAtTime(0.7, now)

  // Connect vintage filtering to master
  masterGain.disconnect()
  masterGain.connect(vintageFilter)
  vintageFilter.connect(highCut)
  highCut.connect(audioContext.destination)

  // Darker noise component (2-6kHz bandpass, less hissy)
  const bufferSize = audioContext.sampleRate * decay
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

  // Randomized darker bandpass for "shh" not "tsss" character
  const noiseBandpass = audioContext.createBiquadFilter()
  noiseBandpass.type = "bandpass"
  const noiseCenter = 3500 + Math.random() * 1000 // 3.5-4.5kHz center variation
  const noiseQ = 1.0 + Math.random() * 0.5 // 1.0-1.5 Q variation
  noiseBandpass.frequency.setValueAtTime(noiseCenter, now)
  noiseBandpass.Q.setValueAtTime(noiseQ, now)

  const noiseGain = audioContext.createGain()

  noise.connect(noiseBandpass)
  noiseBandpass.connect(noiseGain)
  noiseGain.connect(highCut) // Through vintage filtering

  // Randomized noise mix (25-40% variation)
  const noiseMix = 0.2 + Math.random() * 0.15
  const noiseDecayVariation = 0.6 + Math.random() * 0.4
  noiseGain.gain.setValueAtTime(noiseMix, now)
  noiseGain.gain.exponentialRampToValueAtTime(
    0.001,
    now + decay * noiseDecayVariation,
  )

  noise.start(now)
  noise.stop(now + decay)

  // Randomized master envelope for varied dynamics
  const masterLevel = 0.5 + Math.random() * 0.2 // 0.5-0.7 level variation
  masterGain.gain.setValueAtTime(masterLevel, now)
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + decay)

  // Cleanup all nodes after decay
  setTimeout(() => {
    try {
      masterGain.disconnect()
      saturation.disconnect()
      vintageFilter.disconnect()
      highCut.disconnect()
      noise.disconnect()
      noiseBandpass.disconnect()
      noiseGain.disconnect()
    } catch (e) {
      // Nodes may already be garbage collected
    }
  }, (decay + 0.1) * 1000)
}
