# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

drumtic is a terminal FM drum machine written in Rust. It is also a deliberate
Rust-learning project: the owner is a senior frontend engineer (React/TS) who is
a beginner at Rust, DSP, and real-time systems.

**Because of that, the default mode in this repo is coaching, not implementing.**
Whenever the request is about building the next piece of drumtic — "what's next",
"I'm stuck", "review this slice", roadmap or architecture questions, or Rust help
in the context of this repo — invoke the `drumtic-mentor` skill
(`.claude/skills/drumtic-mentor/`) and follow it. Its core rule: do not write his
implementation code. Ordinary chores (fixing tooling, updating docs, reading code
to answer a question) are exempt; producing the implementation of a roadmap slice
is not.

The mentor skill's references are the project's real planning documents:
- `.claude/skills/drumtic-mentor/references/roadmap.md` — the slice curriculum,
  Phases 0–8, plus the `PROGRESS.md` template. The roadmap is a plan, not a
  contract; when it disagrees with the code, the code wins and the roadmap gets
  edited.
- `.claude/skills/drumtic-mentor/references/coaching.md` — how much to give away
  at each level.
- `PROGRESS.md` at the repo root (create from the roadmap template if missing)
  records the current slice and level. Update it at the end of a session.

## Commands

```bash
cargo run -p drumtic          # build + run the binary (plays audio for 5s, then exits)
cargo check                   # fast feedback loop; the compiler is the primary teacher here
cargo clippy --all-targets    # run before calling a slice done
cargo fmt
cargo test                    # workspace tests
cargo test -p drumtic-engine  # engine only
cargo test -p drumtic-engine env::tests::decays_to_zero   # a single test by path
```

`cargo run` opens the default output device and asserts an f32 sample format —
on a machine whose default device reports something else, the binary panics at
startup by design rather than silently converting.

## Architecture

Cargo workspace, edition 2024, two crates:

- `crates/drumtic-engine` — the entire synth and sequencer. Pure DSP and state.
  Has **no dependencies** today and is `publish = false`.
- `crates/drumtic` — the binary. Owns the platform: `cpal` output stream today,
  `crossterm`/`ratatui` TUI later. Constructs an `Engine`, moves it into the
  audio callback, and forwards commands to it.

### The boundary that must be defended

`drumtic-engine` must never learn about the terminal or the audio host. It does
not depend on `cpal`, `crossterm`, or `ratatui`, and it must not start. That
boundary is what keeps a plugin build or a GUI possible later. Anything that
touches devices, keys, or the screen belongs in `crates/drumtic`.

The engine's contract with the host is `Engine::process(&mut self, out: &mut [f32])`
— mono, host-agnostic. `crates/drumtic/src/main.rs` renders into a
pre-allocated mono scratch buffer (`MAX_FRAMES`) and fans it out to the device's
channel count.

### Real-time rules on the audio thread

`Engine::process` and everything it calls run on the audio callback. In that path
the following are bugs, not style notes, because they surface as clicks and
dropouts: allocation, locks, syscalls, unbounded loops, and panic paths
(`unwrap`/`expect` on anything that can fail at runtime). Allocate before the
stream starts. `expect` during startup in `main` is fine.

Cross-thread communication goes one way, lock-free: the main thread produces
commands, the audio thread drains them. The current `Engine` predates that
channel; the roadmap introduces an SPSC ring buffer (`rtrb`) carrying a
`Command` enum in Phase 2, and everything after hangs off it.

### Conventions worth keeping consistent

- Times are in seconds at API boundaries and in samples internally, converted
  once at construction — not multiplied by the sample rate at each use site.
- FM here means phase modulation: the modulator's output is added to the
  carrier's *phase* before the sine, never to its frequency.
- DSP tests assert properties (the envelope reaches zero, the transport hits a
  step at the expected sample, a pattern round-trips), never exact sample bytes.
