import { type Component, For, onMount } from "solid-js"
import { DrumPad } from "./components/drum-pad"
import { GlitchIcon } from "./components/glitch-icon"
import { HihatIcon } from "./components/hihat-icon"
import { KickIcon } from "./components/kick-icon"
import { SnareIcon } from "./components/snare-icon"
import { StepPad } from "./components/step-pad"
import { playGlitch } from "./utils/play-glitch"
import { playHihat } from "./utils/play-hihat"
import { playKick } from "./utils/play-kick"
import { playSnare } from "./utils/play-snare"

const App: Component = () => {
  let audioContext: AudioContext | null = null

  const getAudioContext = () => {
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new AudioContext()
    } else if (audioContext.state === "suspended") {
      audioContext.resume()
    }
    return audioContext
  }

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
        if (audioContext && audioContext.state !== "closed") {
          audioContext.suspend()
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
        playKick(getAudioContext())
        break
      }
      case "s": {
        playSnare(getAudioContext())
        break
      }
      case "h": {
        playHihat(getAudioContext())
        break
      }
      case "j": {
        playGlitch(getAudioContext())
        break
      }
    }
  })

  return (
    <div class="mx-auto flex h-screen max-w-md flex-col items-stretch justify-end gap-4 p-4">
      <div class="flex items-center justify-center gap-1">
        <DrumPad
          instrumentId="kick"
          playFunc={playKick}
          audioContext={getAudioContext()}
          icon={<KickIcon />}
        />
        <DrumPad
          instrumentId="snare"
          playFunc={playSnare}
          audioContext={getAudioContext()}
          icon={<SnareIcon />}
        />
        <DrumPad
          instrumentId="hihat"
          playFunc={playHihat}
          audioContext={getAudioContext()}
          icon={<HihatIcon />}
        />
        <DrumPad
          instrumentId="glitch"
          playFunc={playGlitch}
          audioContext={getAudioContext()}
          icon={<GlitchIcon />}
        />
      </div>

      <div class="mx-auto grid w-auto grid-cols-8 grid-rows-2 gap-1">
        <For each={Array.from({ length: 16 })}>
          {(_item, index) => <StepPad step={index() + 1} />}
        </For>
      </div>
    </div>
  )
}

export default App
