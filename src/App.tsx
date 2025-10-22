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

const STORAGE_KEY = "drumtic-state"

type PersistableState = Omit<
  AppState,
  "audioContext" | "startTime" | "currentStep" | "isPlaying"
>

const loadStateFromStorage = (): Partial<AppState> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as PersistableState
      return {
        ...parsed,
        audioContext: null,
        startTime: null,
        currentStep: 0,
        isPlaying: false,
      }
    }
  } catch (error) {
    console.warn("Failed to load state from localStorage:", error)
  }
  return {}
}

const saveStateToStorage = (state: AppState) => {
  try {
    const toSave: PersistableState = {
      activePad: state.activePad,
      pattern: state.pattern,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch (error) {
    console.warn("Failed to save state to localStorage:", error)
  }
}

function createStateStore() {
  const defaultState: AppState = {
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
  }

  const initialState = { ...defaultState, ...loadStateFromStorage() }
  const [state, setState] = createStore<AppState>(initialState)

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

  const createManagedPlayFunction = (
    playFunc: (audioContext: AudioContext | null) => void,
  ) => {
    return () => {
      initializeAudioContext()
      playFunc(state.audioContext)
    }
  }

  const playFunctions = {
    kick: createManagedPlayFunction(playKick),
    snare: createManagedPlayFunction(playSnare),
    hihat: createManagedPlayFunction(playHihat),
    glitch: createManagedPlayFunction(playGlitch),
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
          playFunctions[instrument as InstrumentId]()
        }
      })
    }

    return currentStep
  })

  createEffect(() => {
    saveStateToStorage(state)
  })

  return {
    state,
    toggleIsPlaying,
    initializeAudioContext,
    selectInstrument,
    toggleStep,
    playFunctions,
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
