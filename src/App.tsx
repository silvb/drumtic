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

interface AppState {
  activePad: InstrumentId
  isPlaying: boolean
  audioContext: AudioContext | null
  currentStep: number
  startTime: number | null
}

function createStateStore() {
  const [state, setState] = createStore<AppState>({
    activePad: "kick",
    isPlaying: false,
    audioContext: null,
    currentStep: 0,
    startTime: null,
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

  createEffect((prev) => {
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

  return { state, toggleIsPlaying, initializeAudioContext, selectInstrument }
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
