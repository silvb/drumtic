import {
  type Component,
  createContext,
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
}

function createStateStore() {
  const [state, setState] = createStore<AppState>({
    activePad: "kick",
    isPlaying: false,
    audioContext: null,
  })

  const toggleIsPlaying = () => setState("isPlaying", prev => !prev)
  const initializeAudioContext = () => {
    if (!state.audioContext || state.audioContext.state === "closed") {
      const audioContext = new AudioContext()
      setState("audioContext", audioContext)
    } else if (state.audioContext.state === "suspended") {
      state.audioContext.resume()
    }
  }

  return { state, toggleIsPlaying, initializeAudioContext }
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
