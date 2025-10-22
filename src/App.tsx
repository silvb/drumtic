import {
  type Component,
  createContext,
  createEffect,
  type ParentComponent,
  useContext,
} from "solid-js"
import { createStore } from "solid-js/store"
import { ControlsInterface } from "./components/controls-interface"
import type { InstrumentId } from "./types"
import { playGlitch } from "./utils/play-glitch"
import { playHihat } from "./utils/play-hihat"
import { playKick } from "./utils/play-kick"
import { playSnare } from "./utils/play-snare"

interface AppState {
  activePad: InstrumentId
  isPlaying: boolean
  audioContext: AudioContext | null
  currentStep: number
  startTime: number | null
  pattern: Record<InstrumentId, boolean[]>
}

function createStateStore() {
  const [state, setState] = createStore<AppState>({
    activePad: "kick",
    isPlaying: false,
    audioContext: null,
    currentStep: 0,
    startTime: null,
    pattern: {
      kick: Array(16).fill(false),
      snare: Array(16).fill(false),
      hihat: Array(16).fill(false),
      glitch: Array(16).fill(false),
    },
  })

  const calculateCurrentStep = (
    currentTime: number,
    startTime: number,
  ): number => {
    const bpm = 120
    const stepDurationMs = (60 / bpm / 4) * 1000 // 16th notes at 120 BPM
    const elapsedMs = currentTime - startTime
    return Math.floor(elapsedMs / stepDurationMs) % 16
  }

  let animationFrame: number | null = null

  const updateStep = () => {
    if (state.isPlaying && state.startTime !== null) {
      const currentTime = performance.now()
      const newStep = calculateCurrentStep(currentTime, state.startTime)
      if (newStep !== state.currentStep) {
        setState("currentStep", newStep)
      }
      animationFrame = requestAnimationFrame(updateStep)
    }
  }

  const toggleIsPlaying = () => setState("isPlaying", prev => !prev)

  const initializeAudioContext = () => {
    if (!state.audioContext || state.audioContext.state === "closed") {
      const audioContext = new AudioContext()
      setState("audioContext", audioContext)
    } else if (state.audioContext.state === "suspended") {
      state.audioContext.resume()
    }
  }

  const selectInstrument = (instrumentId: InstrumentId) => {
    setState("activePad", instrumentId)
  }

  const toggleStep = (stepIndex: number) => {
    setState("pattern", state.activePad, stepIndex, prev => !prev)
  }

  const playFunctions = {
    kick: playKick,
    snare: playSnare,
    hihat: playHihat,
    glitch: playGlitch,
  }

  createEffect(prev => {
    const isPlaying = state.isPlaying
    if (prev !== undefined && prev !== isPlaying) {
      if (isPlaying) {
        setState("startTime", performance.now())
        setState("currentStep", 0)
        updateStep()
      } else {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame)
          animationFrame = null
        }
      }
    }
    return isPlaying
  })

  createEffect(prev => {
    const currentStep = state.currentStep
    const isPlaying = state.isPlaying

    if (isPlaying && prev !== undefined && prev !== currentStep) {
      Object.entries(state.pattern).forEach(([instrument, pattern]) => {
        if (pattern[currentStep]) {
          playFunctions[instrument as InstrumentId](state.audioContext)
        }
      })
    }

    return currentStep
  })

  return {
    state,
    toggleIsPlaying,
    initializeAudioContext,
    selectInstrument,
    toggleStep,
  }
}

export type AppContextType = ReturnType<typeof createStateStore>

export const AppContext = createContext<AppContextType>()

export const useAppState = () => {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error("useAppState must be used within a AppProvider")
  }

  return context
}

const AppProvider: ParentComponent = props => {
  const store = createStateStore()
  store.initializeAudioContext()
  return (
    <AppContext.Provider value={store}>{props.children}</AppContext.Provider>
  )
}

const App: Component = () => {
  return (
    <AppProvider>
      <ControlsInterface />
    </AppProvider>
  )
}

export default App
