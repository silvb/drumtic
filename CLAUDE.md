# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Drumtic is a browser-based drum machine built with SolidJS. It uses the Web Audio API to synthesize drum sounds in real-time without external audio files. The app features touch-responsive drum pads and a step sequencer grid.

## Development Commands

- `npm run dev` or `npm start` - Start development server (http://localhost:3000)
- `npm run build` - Build for production to `dist/` folder
- `npm run lint` - Run Biome linter and formatter with auto-fix
- `npm run serve` - Preview production build

## Technology Stack

- **Framework**: SolidJS 1.9+ with TypeScript
- **Build Tool**: Vite 7+ with ESNext target
- **Styling**: TailwindCSS 4+ with DaisyUI theme (wireframe)
- **Audio**: Web Audio API for real-time synthesis
- **Development**: Biome for linting/formatting, Solid DevTools

## File Structure

```
src/
├── App.tsx                 # Root component with state management
├── index.tsx              # App entry point
├── index.css              # Global styles (TailwindCSS imports)
├── types.ts               # Core TypeScript types
├── components/
│   ├── controls-interface.tsx  # Main UI component
│   ├── drum-pad.tsx           # Individual drum pad component
│   ├── step-pad.tsx           # Step sequencer pad component
│   └── [instrument]-icon.tsx  # SVG icon components
└── utils/
    ├── play-[instrument].ts   # Audio synthesis functions
    ├── create-saturation.ts   # Audio saturation utility
    └── convert-pitch.ts       # Pitch conversion helper
```

## Architecture

### Audio System
The core audio functionality is built around Web Audio API synthesis:
- Each drum sound (kick, snare, hihat, glitch) is generated using oscillators, noise buffers, and filters
- Audio functions are typed with `PlayFunc` and accept `AudioContext | null`
- Audio context is lazily initialized on first use for iOS compatibility
- iOS-specific AudioSession API handling for silent mode compatibility

### Component Structure
- **App.tsx**: Root component with state management via `AppProvider` and `AppContext`
- **ControlsInterface**: Main interface component handling keyboard events, drum pads, and step sequencer
- **DrumPad**: Reusable drum button component that accepts instrument ID, play function, and icon
- **StepPad**: Individual step in the 16-step sequencer grid (currently display-only)
- **Icon Components**: SVG icons for each instrument (KickIcon, SnareIcon, HihatIcon, GlitchIcon, PlayIcon)

### Type System
Core types are defined in `src/types.ts`:
- `InstrumentId`: Union type for drum instruments ("kick" | "snare" | "hihat" | "glitch")
- `PlayFunc`: Function signature for audio synthesis functions

### Key Interactions
- Keyboard shortcuts: 'a' (kick), 's' (snare), 'h' (hihat), 'j' (glitch)
- Touch/click events trigger drum sounds via `onTouchStart` for mobile compatibility
- Each drum pad uses `data-instrument-id` attributes for identification

## Code Style

This project uses Biome for linting and formatting with these conventions:
- Double quotes for strings
- Semicolons only as needed
- Arrow parentheses only as needed
- Space indentation
- TailwindCSS class sorting enabled

## Audio Implementation Notes

Each drum sound uses different synthesis techniques:
- **Kick**: Sine wave oscillator with frequency drop (80Hz → 60Hz) + FM modulation + saturation
- **Snare**: FM synthesis (sine carrier + modulator) + bandpass filtered noise + saturation
- **Hihat**: Complex FM synthesis with multiple detuned carriers, randomized parameters, bitcrushing, and filtered noise
- **Glitch**: Multi-layer synthesis with FM operators, noise bursts, transient clicks, and sub bass + extensive bitcrushing and filtering

Audio functions should handle null audio context by creating a new one, enabling the app to work without user gesture requirements on first load.

### State Management
The app uses SolidJS's `createStore` for state management with:
- `AppContext` providing global state via React-style context pattern
- `useAppState` hook for accessing state and actions
- State includes: `activePad`, `isPlaying`, and `audioContext`
- Audio context is lazily initialized and managed for iOS compatibility

### Audio Context Management
Special handling for iOS and mobile browsers:
- AudioSession API usage for iOS silent mode compatibility
- Page visibility change handling to suspend/resume audio context
- Proper cleanup and context state management

### Mobile & Touch Optimization
- Touch detection using `"ontouchstart" in window || navigator.maxTouchPoints > 0`
- Conditional event handlers: `onTouchStart` for touch devices, `onMouseDown` for desktop
- CSS: `touch-manipulation` and `select-none` for optimal mobile experience
- Responsive design optimized for mobile-first drum machine usage