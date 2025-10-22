import { type Component, For, onMount, Show } from "solid-js"
import { useAppState } from "../App"
import { DrumPad } from "./drum-pad"
import { GlitchIcon } from "./glitch-icon"
import { HihatIcon } from "./hihat-icon"
import { KickIcon } from "./kick-icon"
import { PauseIcon } from "./pause-icon"
import { PlayIcon } from "./play-icon"
import { SnareIcon } from "./snare-icon"
import { StepPad } from "./step-pad"

export const ControlsInterface: Component = () => {
  const { state, toggleIsPlaying, playFunctions, setBpm } = useAppState()
  const setAudioSession = () => {
    // Set audio session to playback mode for iOS silent mode compatibility
    try {
      // biome-ignore lint/suspicious/noExplicitAny: experimental API, only works in Mac/iOS Safari
      if ("audioSession" in navigator && (navigator as any).audioSession) {
        // biome-ignore lint/suspicious/noExplicitAny: experimental API, only works in Mac/iOS Safari
        ;(navigator as any).audioSession.type = "playback"
      }
    } catch (error) {
      console.warn("AudioSession API not available:", error)
    }
  }

  onMount(() => {
    setAudioSession()

    // Handle audio session when page visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setAudioSession()
      } else {
        // Suspend audio context when page becomes hidden to prevent background audio
        if (state.audioContext && state.audioContext.state !== "closed") {
          state.audioContext.suspend()
        }

        // Reset audio session on iOS when hidden
        try {
          // biome-ignore lint/suspicious/noExplicitAny: experimental API, only works in Mac/iOS Safari
          if ("audioSession" in navigator && (navigator as any).audioSession) {
            // biome-ignore lint/suspicious/noExplicitAny: experimental API, only works in Mac/iOS Safari
            ;(navigator as any).audioSession.type = "ambient"
          }
        } catch (error) {
          console.warn("AudioSession API not available:", error)
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  })

  // simulate click on button when pressing keys 1-4
  window.addEventListener("keydown", e => {
    switch (e.key) {
      case "a": {
        playFunctions.kick()
        break
      }
      case "s": {
        playFunctions.snare()
        break
      }
      case "h": {
        playFunctions.hihat()
        break
      }
      case "j": {
        playFunctions.glitch()
        break
      }
      case " ": {
        toggleIsPlaying()
        break
      }
    }
  })
  return (
    <div class="mx-auto flex h-screen max-w-md flex-col items-stretch justify-end gap-4 p-4">
      <div>
        <input
          type="number"
          class="input input-xl border-2 focus-within:border-secondary focus-within:outline-red-300"
          min="1"
          max="400"
          title="Beats per Minute"
          value={state.bpm}
          onChange={e => {
            setBpm(parseFloat(e.target.value))
          }}
        />
      </div>
      <div>
        <button
          type="button"
          class="btn btn-secondary btn-xl"
          onClick={() => toggleIsPlaying()}
        >
          <Show when={state.isPlaying} fallback={<PlayIcon />}>
            <PauseIcon />
          </Show>
        </button>
      </div>
      <div class="flex items-center justify-center gap-1">
        <DrumPad instrumentId="kick" icon={<KickIcon />} />
        <DrumPad instrumentId="snare" icon={<SnareIcon />} />
        <DrumPad instrumentId="hihat" icon={<HihatIcon />} />
        <DrumPad instrumentId="glitch" icon={<GlitchIcon />} />
      </div>

      <div class="mx-auto grid w-auto grid-cols-8 grid-rows-2 gap-1">
        <For each={Array.from({ length: 16 })}>
          {(_item, index) => (
            <StepPad
              step={index() + 1}
              isActive={state.isPlaying && state.currentStep === index()}
              hasPattern={state.pattern[state.activePad][index()]}
            />
          )}
        </For>
      </div>
    </div>
  )
}
