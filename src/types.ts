export type InstrumentId = "kick" | "snare" | "hihat" | "glitch"

export type PlayFunc = (audioContext: AudioContext | null) => void
