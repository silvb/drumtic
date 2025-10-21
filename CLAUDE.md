# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Drumtic is a browser-based drum machine built with SolidJS. It uses the Web Audio API to synthesize drum sounds in real-time without external audio files. The app features touch-responsive drum pads and a step sequencer grid.

## Development Commands

- `npm run dev` or `npm start` - Start development server (http://localhost:3000)
- `npm run build` - Build for production to `dist/` folder
- `npm run lint` - Run Biome linter and formatter with auto-fix
- `npm run serve` - Preview production build

## Architecture

### Audio System
The core audio functionality is built around Web Audio API synthesis:
- Each drum sound (kick, snare, hihat, glitch) is generated using oscillators, noise buffers, and filters
- Audio functions are typed with `PlayFunc` and accept `AudioContext | null`
- Audio context is lazily initialized on first use for iOS compatibility
- iOS-specific AudioSession API handling for silent mode compatibility

### Component Structure
- **DrumPad**: Reusable drum button component that accepts instrument ID, play function, audio context, and icon
- **StepPad**: Individual step in the 16-step sequencer grid
- **Icon Components**: SVG icons for each instrument (KickIcon, SnareIcon, HihatIcon, GlitchIcon)

### Type System
Core types are defined in `src/types.ts`:
- `InstrumentId`: Union type for drum instruments ("kick" | "snare" | "hihat" | "glitch")
- `PlayFunc`: Function signature for audio synthesis functions

### Key Interactions
- Keyboard shortcuts: 'a' (kick), 's' (snare), 'u' (hihat), 'l' (glitch)
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
- **Kick**: Sine wave oscillator with frequency drop (80Hz → 60Hz)
- **Snare**: Triangle oscillator + high-pass filtered noise
- **Hihat**: Filtered noise with high-pass and band-pass filters
- **Glitch**: Multiple square wave oscillators with random frequency modulation + noise burst

Audio functions should handle null audio context by creating a new one, enabling the app to work without user gesture requirements on first load.