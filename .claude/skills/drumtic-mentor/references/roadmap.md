# drumtic — implementation roadmap

The plan is ordered so that **something is audible or visible at the end of
every slice**. No slice is "build the abstraction, use it next time." That
ordering is deliberate: motivation is the scarce resource in a long solo
project, and a slice that produces no observable change spends motivation
without replacing it.

Each slice also carries a Rust lesson. Where the audio-correct order and
the pedagogically-useful order disagreed, audio-correct won — learning
happens anyway, and wrong architecture is expensive to undo.

## Contents

- [Phase 0 — Foundations](#phase-0--foundations-done) *(done)*
- [Phase 1 — One voice you can hear](#phase-1--one-voice-you-can-hear)
- [Phase 2 — The thread boundary, properly](#phase-2--the-thread-boundary-properly)
- [Phase 3 — The sequencer](#phase-3--the-sequencer)
- [Phase 4 — The TUI](#phase-4--the-tui)
- [Phase 5 — Parameters and p-locks](#phase-5--parameters-and-p-locks)
- [Phase 6 — Persistence](#phase-6--persistence)
- [Phase 7 — Effects](#phase-7--effects)
- [Phase 8 — Ship it](#phase-8--ship-it)
- [PROGRESS.md template](#progressmd-template)

---

## Phase 0 — Foundations *(done)*

Workspace with `drumtic-engine` (lib) and `drumtic` (bin). `cpal` output
stream. A 440Hz sine.

Established: ownership across the thread boundary via `move`, allocation
before the callback starts, `Option`/`Result` at the edges, engine knows
nothing about devices.

---

## Phase 1 — One voice you can hear

Goal of the phase: a kick drum that sounds like a kick drum, triggered by
hand.

### Slice 1.1 — Amplitude envelope

**Goal** The sine becomes a blip instead of a drone. It fires once at
startup and decays to silence.

**Done when** You hear a short tone, then nothing, and the process doesn't
keep humming.

**New Rust ground**
- `enum` with variants as a state machine (`Idle` / `Attack` / `Decay`)
- `match` as an expression that returns a value
- Methods that mutate `&mut self` and return a value in the same call

**Watch out for**
- Linear decay sounds wrong for percussion. Exponential (multiply by a
  coefficient each sample) is what your ear expects. It's also cheaper.
- Decide now whether envelope times are in seconds or in samples. Seconds
  in the API, samples internally, converted once — otherwise you'll be
  multiplying by sample rate in four places.
- An envelope that never quite reaches zero leaves a DC-ish tail. Add a
  threshold below which you snap to `Idle`.

**Where it goes** `drumtic-engine/src/env.rs`, used by `lib.rs`.

### Slice 1.2 — Two-operator FM

**Goal** A modulator oscillator's output offsets the carrier's phase. The
tone gets a metallic, bell-like edge you can dial with an index knob.

**Done when** Changing a hardcoded `mod_index` constant audibly changes
timbre, not pitch.

**New Rust ground**
- Extracting a reusable `Osc` struct — your first real refactor
- Module system: `mod`, `pub(crate)`, and why `lib.rs` needs `mod osc;`

**Watch out for**
- Phase modulation and frequency modulation are different, and what
  everyone calls "FM synthesis" is actually phase modulation. Add the
  modulator's output to the carrier's phase *before* the sine, don't add it
  to the carrier's frequency. Adding to frequency accumulates and drifts.
- The modulator needs its own phase accumulator. Sharing one is a bug that
  sounds almost right.
- Ratio (modulator freq ÷ carrier freq) wants to be a separate param from
  index. Ratio changes the character, index changes the amount.

**Where it goes** `drumtic-engine/src/osc.rs`.

### Slice 1.3 — Pitch envelope, and it becomes a kick

**Goal** A second envelope drives carrier frequency, sweeping down fast.
This is the single thing that turns a tone into a kick drum.

**Done when** It sounds like a kick. You'll know.

**New Rust ground**
- Reusing one type in two roles with different config — composition over
  inheritance, which will feel natural coming from React
- The beginning of a params struct

**Watch out for**
- The pitch sweep is fast. Something like 400Hz down to 50Hz in 30–80ms.
  Slower and it's a tom, much faster and it's a click.
- Pitch envelope depth in semitones or in Hz? Hz is simpler here, but
  decide and write it down.
- Two envelopes with independent times means your `Env` needs config, not
  constants. Good time to introduce an `EnvConfig` or just fields.

### Slice 1.4 — Trigger it from the main thread

**Goal** Press Enter, hear a kick. First actual cross-thread communication.

**Done when** You can play a rhythm badly by hand.

**New Rust ground**
- `Arc<T>` — shared ownership, and why `move` alone can't work here
- `AtomicBool` / `AtomicU32` and `Ordering` — the first real concurrency
- `std::io::stdin().read_line()` blocking the main thread

**Watch out for**
- This is a deliberately temporary solution. An atomic flag can't carry
  which voice, which velocity, or when. Slice 2.1 replaces it. Don't
  over-invest.
- `Ordering::Relaxed` is correct for a standalone flag; `SeqCst` is the
  cargo-cult default. Read what the orderings mean once, now, while the
  example is small.
- `Arc::clone(&x)` rather than `x.clone()` — same thing, but the explicit
  form is convention because it signals "cheap pointer copy" not "deep
  copy".

---

## Phase 2 — The thread boundary, properly

Goal of the phase: a clean lock-free command channel and more than one
voice. This is the architectural spine; everything later hangs off it.

### Slice 2.1 — Command queue

**Goal** Replace the atomic flag with a real single-producer
single-consumer ring buffer carrying an enum of commands.

**Done when** Enter still triggers a kick, but through `Command::Trigger`.

**New Rust ground**
- Adding a dependency to the engine crate (`rtrb`)
- Enums that carry data — the thing TS discriminated unions approximate
- `while let Ok(cmd) = consumer.pop()` — the drain idiom
- Splitting a producer/consumer pair and moving one half across a thread

**Watch out for**
- Drain the *whole* queue at the top of each callback, not one item. A
  partially drained queue means commands arrive late and jittery.
- The queue is fixed-capacity. Decide what happens when it's full — for a
  UI-driven queue, dropping is acceptable and better than blocking. Never
  block on the audio thread, ever, for any reason.
- `Command` must be `Send` and shouldn't own heap data. If a variant ever
  wants a `String` or a `Vec`, that's a design smell: the audio thread
  would have to free it, and freeing allocates a lock.

**Where it goes** `drumtic-engine/src/command.rs`.

### Slice 2.2 — Multiple voices

**Goal** Four voices instead of one. Different keys trigger different
voices. Only kick makes a good sound so far; that's fine.

**Done when** Four keys, four distinguishable sounds, no crosstalk.

**New Rust ground**
- Fixed-size arrays `[Voice; 4]` vs `Vec<Voice>` — and why fixed size is
  right here
- Your first trait, probably, and the `dyn` vs generics decision
- Iterating a collection while mutating its elements

**Watch out for**
- Resist `Box<dyn Voice>` unless you actually need heterogeneous voices.
  An enum with four variants is faster, allocation-free, and simpler. Rust
  makes enums pleasant in a way that OO languages don't; use that.
- Monophonic per voice means a retrigger cuts the previous note. Decide
  whether it cuts hard (click) or re-attacks from the current envelope
  level (no click). The second is right and barely more code.
- Summing four voices at full gain clips. Scale, or you'll design your
  sounds around distortion you didn't intend.

### Slice 2.3 — Noise, for snare and hat

**Goal** A noise source, so snare and hat sound like snare and hat.

**Done when** All four voices sound recognisably like drums.

**New Rust ground**
- Why you can't use the `rand` crate on the audio thread
- Bit manipulation: `^`, `<<`, `>>`, wrapping arithmetic
- `u32` → `f32` conversion and normalizing to -1..1

**Watch out for**
- An xorshift PRNG is ~4 lines and perfect for this. Seed it non-zero or
  it outputs zero forever.
- Snare is noise *plus* a tuned body, not noise alone. Mix an FM tone
  under it.
- Hat wants a bandpass or at least a highpass. A one-pole highpass is two
  lines and gets you 80% there.
- `rand::random()` may lock a thread-local RNG and can allocate on first
  use. This is a good concrete example of why the no-allocation rule
  excludes crates that look innocent.

---

## Phase 3 — The sequencer

Goal of the phase: it plays a pattern by itself, with sample-accurate
timing, and the timing is good enough to dance to.

### Slice 3.1 — Pattern data model

**Goal** A pattern type: steps, per-step trig on/off per voice. No playback
yet — a hardcoded pattern printed to stdout to prove the shape.

**Done when** You can construct a four-on-the-floor pattern in code and
print it as a grid.

**New Rust ground**
- Designing a data model in a language with no `null`
- `Option<T>` for genuinely-absent things vs `bool` for on/off
- `Default` derive and why it's worth having
- Const generics or a plain const for step count

**Watch out for**
- 16 steps now, but the model should not hardcode 16. Elektron patterns
  are up to 64 and you'll want that.
- Steps-per-voice or voices-per-step? Both work. Steps-per-voice matches
  how you'll edit and how you'll p-lock. Pick one and be consistent.
- Don't design p-locks yet. Leave room for them (a step is a struct, not a
  bool) but don't build the sparse map until Phase 5.

**Where it goes** `drumtic-engine/src/pattern.rs`.

### Slice 3.2 — Transport in the callback

**Goal** The sequencer runs inside the audio callback, advancing by frames.
The pattern plays.

**Done when** A loop plays at 120 BPM and stays in time for ten minutes.

**New Rust ground**
- Integer vs float accumulators and where precision goes wrong
- Splitting a buffer into segments: `split_at_mut`, or index arithmetic
- The borrow checker's opinion on mutating `self` inside a loop over
  `self.something`

**Watch out for**
- This is the hardest slice in the project and the most important. Budget
  more than one sitting.
- Samples-per-step is fractional at most BPM values. Keep a float
  accumulator or a fixed-point counter; truncating to an integer every
  step drifts audibly within a minute.
- The step boundary usually falls *inside* a buffer, not at its start. If
  you trigger at buffer boundaries instead, you've quantized everything to
  ~2.7ms and the groove dies. This is the whole reason the transport lives
  here.
- Structure: walk the buffer in segments between step boundaries, render
  each segment, trigger at the seam. Not: render the whole buffer then
  apply triggers.
- The borrow checker will fight you when you try to call `self.trigger()`
  inside a loop that holds `&mut self.buffer`. That fight is real and the
  fix is restructuring, not `RefCell`.

### Slice 3.3 — Tempo, play/stop, and pattern length

**Goal** Commands for transport control. Tempo changes take effect
smoothly.

**Done when** You can start, stop, and change BPM without clicks or drift.

**New Rust ground**
- Extending an enum without breaking exhaustive `match`
- Why the compiler telling you about the unhandled variant is a feature

**Watch out for**
- Stop should let voices ring out, not cut them. Silence-on-stop sounds
  broken.
- Changing tempo mid-step: recompute samples-per-step but keep the
  fractional position within the step. Resetting it stutters.

### Slice 3.4 — Swing and microtiming

**Goal** Swing shifts even-numbered steps late. Per-step microtiming
offsets nudge individual hits.

**Done when** 55% swing makes a straight hat pattern feel different, and
you can hear a single step pushed late.

**New Rust ground**
- Signed arithmetic on sample positions and off-by-one hunting
- Clamping and saturating arithmetic

**Watch out for**
- This is nearly free given 3.2's design, and nearly impossible without
  it. If it feels hard, 3.2 is wrong — go back.
- Microtiming that pushes a hit past the *next* step boundary is a real
  edge case. Clamp the range, e.g. ±50% of a step.
- Swing convention: 50% is straight, 66% is triplet feel. Match that so
  the number means what users expect.

---

## Phase 4 — The TUI

Goal of the phase: it looks like an instrument and you drive it with the
keyboard.

### Slice 4.1 — Raw mode and a clean exit

**Goal** Terminal enters raw mode, a key quits, and the terminal is
restored properly — including after a panic.

**Done when** `q` quits cleanly, and a deliberate `panic!()` doesn't leave
your shell unusable.

**New Rust ground**
- `Result` propagation with `?` — the first time it really pays off
- Custom error types, or `anyhow` for a binary
- `Drop` for cleanup, and why RAII beats `try/finally`
- Panic hooks

**Watch out for**
- A panic in raw mode leaves the terminal wrecked. A `Drop` guard plus a
  `std::panic::set_hook` that restores first is the standard pattern.
  Build it now, before you're debugging something else through a broken
  terminal.
- `anyhow` in the binary, concrete error enums in the library. That split
  is the ecosystem convention and it's a good one.
- `?` needs the function to return `Result`. `main` can — `fn main() ->
  anyhow::Result<()>`.

**Where it goes** `drumtic/src/tui/mod.rs`.

### Slice 4.2 — Draw the grid

**Goal** A 16×4 step grid rendered with ratatui. Static, no interaction.

**Done when** It looks like a drum machine.

**New Rust ground**
- Immediate-mode rendering — same mental model as React, no VDOM
- ratatui's layout constraint system
- Borrowing app state inside a closure passed to `terminal.draw`

**Watch out for**
- The main thread owns the pattern. The audio thread has a copy. The
  render reads the main thread's copy. Getting this wrong here is cheap to
  fix and expensive later.
- Unicode box-drawing and block characters vary by font. Test in your
  actual terminal early.
- Don't redraw at 60fps unconditionally — redraw on event or on playhead
  change. It's a terminal; every frame is a syscall.

### Slice 4.3 — Navigation and toggling

**Goal** hjkl or arrows move a cursor. Space toggles a trig. The pattern
you edit is the pattern that plays.

**Done when** You can program a beat live and hear it change.

**New Rust ground**
- Key event matching, and `KeyEventKind` (press vs release vs repeat)
- Sending pattern edits across the command queue
- Keeping two copies of state in sync without shared mutable state

**Watch out for**
- On some terminals you get both press and release events. Filter to
  `KeyEventKind::Press` or every keystroke fires twice — a classic
  hour-loser.
- Sending the whole pattern on every toggle is fine at this size and much
  simpler than diffing. Do the simple thing; revisit if it ever matters.
- Modifier handling: decide early whether `Shift`+key is a distinct
  binding or ignored.

### Slice 4.4 — Playhead feedback

**Goal** The audio thread reports the current step. The grid highlights it.

**Done when** The playhead moves in time with what you hear.

**New Rust ground**
- A second queue, audio → UI, and why it must also be non-blocking
- Deciding what the UI does when it falls behind

**Watch out for**
- If the UI is slow, the queue backs up. Keep only the latest value —
  either drain to the end, or use a single atomic. Playhead position is
  a "latest wins" value, not a stream of events.
- The audio thread must never block on a full UI queue. Dropping is
  correct.
- Visual latency of one buffer is imperceptible. Don't chase it.

### Slice 4.5 — Modes

**Goal** A modal system. Normal mode navigates, other modes do other
things. The mode is visible in the UI.

**Done when** `Esc` reliably returns to Normal from anywhere.

**New Rust ground**
- A state machine as an enum, with data in the variants
- Exhaustive matching over (mode, key) pairs
- Structuring input handling so it doesn't become a 300-line `match`

**Watch out for**
- This is the "neovim for drum machines" backbone. Get the shape right —
  everything from here on adds modes.
- Modes carrying data (`ParamEdit { voice: usize }`) is where Rust enums
  shine over what you'd write in TS.
- Show the mode. An invisible mode is a bug factory.

---

## Phase 5 — Parameters and p-locks

Goal of the phase: sound design from inside the app, and per-step
parameter locks.

### Slice 5.1 — Parameter model

**Goal** Every voice exposes a named, ranged, editable parameter set.

**Done when** A command can set any param on any voice, by name.

**New Rust ground**
- Enum-as-index, and `strum` or a hand-written `all()` for iteration
- Newtype wrappers for units (`Hz(f32)`, `Semitones(f32)`)
- Normalized 0..1 values vs natural units, and converting between them

**Watch out for**
- Store normalized 0..1 and convert to natural units at use, or store
  natural and convert for display? Both are defensible. Normalized makes
  UI and p-locks uniform; natural makes the DSP readable. Decide once,
  write it in a comment, don't mix.
- Some params want logarithmic mapping (frequency, time), some linear
  (level, pan). Bake the curve into the param definition.
- This is the slice where a bad decision hurts most later. Think before
  typing.

### Slice 5.2 — Parameter editing UI

**Goal** Select a voice, see its params, adjust them with the keyboard.

**Done when** You can design a kick sound without touching the source.

**New Rust ground**
- Rendering derived state without storing it
- Coarse/fine adjustment via modifiers

**Watch out for**
- Smoothing: jumping a param in one sample zippers audibly on anything
  continuous (pitch, filter). A one-pole smoother on the audio thread
  fixes it. Envelope times don't need it; frequencies do.

### Slice 5.3 — Sparse p-locks

**Goal** A step can override any subset of its voice's params.

**Done when** Step 11's snare has a different decay and the others don't.

**New Rust ground**
- `HashMap` vs a sorted `Vec` of pairs, and why `Vec` often wins small
- `Cow`, or just cloning params per step and moving on
- Layering: base params, then overrides applied on top

**Watch out for**
- No allocation on the audio thread means the p-lock storage has to be
  pre-sized or `Copy`. A small fixed-capacity array per step is ugly and
  correct; a `HashMap` is elegant and wrong.
- Apply order: base → p-lock → live-adjusted. Write it down.
- Clearing one lock vs all locks on a step are different operations.

### Slice 5.4 — The p-lock menu

**Goal** Cursor to a trig, press `p`, get a menu of that step's params
showing which are locked.

**Done when** Locking a param takes under three seconds.

**New Rust ground**
- Modal UI with data-carrying state
- Rendering overlays and popups in ratatui

**Watch out for**
- Showing *which* params are locked is the thing hardware can't do. Lean
  into it — this is where drumtic beats the machine it's imitating.
- `Esc` cancels, `Enter` commits, or everything is live? Live is more
  tactile. Pick and be consistent across all modes.

---

## Phase 6 — Persistence

Goal of the phase: work survives closing the app.

### Slice 6.1 — Serialize a kit

**Goal** `serde` derives on the param types. Write a kit to a file, read it
back.

**Done when** Round-trip produces an identical struct.

**New Rust ground**
- `derive(Serialize, Deserialize)` and feature flags on dependencies
- Why the engine gets `serde` but not `serde_json`
- Writing a round-trip test — your first real test

**Watch out for**
- `serde` needs the `derive` feature; forgetting it produces a confusing
  error.
- Add a `version` field now. Not later. You will change the param set
  within two weeks and silent misparsing is a miserable bug.
- Round-trip equality needs `PartialEq`, and floats make that awkward.
  Compare with a tolerance or accept exact for now.

### Slice 6.2 — Project directory

**Goal** A project is a directory: manifest, `patterns/`, `kits/`. Save and
load the whole thing.

**Done when** Quit, relaunch, everything is as you left it.

**New Rust ground**
- `PathBuf` vs `Path` — the `String`/`&str` split again
- Real error handling on I/O, where failure is normal not exceptional
- Atomic writes: temp file, fsync, rename

**Watch out for**
- Atomic writes are ten lines and prevent the worst possible bug. Do them.
- Where does the project live? A CLI arg, a config dir, or the cwd? Decide
  and document.
- Loading a file that doesn't parse should report *which* file and *why*,
  not just fail. You'll be hand-editing these.

### Slice 6.3 — Undo

**Goal** A bounded ring of pattern snapshots. `u` undoes, `Ctrl-r` redoes.

**Done when** You can destroy a pattern and get it back.

**New Rust ground**
- `VecDeque` as a ring buffer
- Snapshot-vs-command undo, and why snapshots are right at this size
- Where the undo boundary sits when a key repeats

**Watch out for**
- Snapshot the whole pattern per edit. It's kilobytes. Command-based undo
  is more elegant and much more code, and you don't need it.
- Held-key repeat shouldn't create fifty undo entries. Coalesce edits
  within a short window.
- Undo belongs to the main thread only. The audio thread never sees it.

---

## Phase 7 — Effects

Goal of the phase: a send bus architecture with delay and reverb.

### Slice 7.1 — Bus architecture

**Goal** Refactor the mixer: voices render once, split by gain into dry,
delay, and reverb buses. No effects yet — buses just sum back together.

**Done when** It sounds identical to before. That's the success condition.

**New Rust ground**
- Refactoring with the compiler's help — the "change the type, follow the
  errors" workflow
- Pre-allocating multiple scratch buffers

**Watch out for**
- Identical output is the test. Any audible change means a gain-staging
  bug.
- Send amounts are per-voice params, which means they're p-lockable for
  free if 5.1 was done right. Verify.

### Slice 7.2 — Delay

**Goal** Tempo-synced delay with feedback and a lowpass in the loop.

**Done when** A snare hit echoes in time, and the echoes darken.

**New Rust ground**
- Circular buffer index arithmetic and wrapping
- Fractional delay and linear interpolation
- Denormal floats, and why silence can spike your CPU

**Watch out for**
- Allocate for maximum delay time at construction. Changing delay time
  moves a read offset; it never resizes.
- Changing delay time discontinuously clicks. Either crossfade or
  interpolate the time (tape-warble). Choose deliberately — doing nothing
  sounds broken.
- Denormals: enable flush-to-zero, or add a tiny DC offset in the feedback
  path. Symptom is CPU spiking when the tail decays.
- Feedback ≥ 1.0 diverges. Clamp it, and consider what "infinite" should
  mean.

### Slice 7.3 — Reverb

**Goal** Freeverb on the reverb bus. Delay output also feeds it.

**Done when** Hits have a tail, and echoes trail into that tail.

**New Rust ground**
- Implementing from a published algorithm rather than an API
- Traits as a swap point (`trait Reverb`) for the later Dattorro upgrade

**Watch out for**
- Freeverb is public domain and about 100 lines. Start there. Its slightly
  metallic character on transients is a known limitation — swap in a
  Dattorro plate later, behind the trait.
- Comb filter delay lengths must stay mutually prime or you get ringing.
  Use the published values.
- Freeverb's constants assume 44.1kHz. Scale them if you're at 48k.

### Slice 7.4 — Send params and p-lockable sends

**Goal** Send amounts editable per voice and lockable per step.

**Done when** One snare hit drowns in reverb and the rest are dry.

**Watch out for**
- If 5.1 and 7.1 were done right this is nearly free. If it isn't, one of
  them is wrong — find out which rather than working around it.
- This is a large part of what makes the Model:Cycles sound like itself.
  Worth the polish.

---

## Phase 8 — Ship it

### Slice 8.1 — The glitch voice

**Goal** The fourth voice: something aggressive and unusual. Ring mod,
sample-and-hold, bitcrush, hard sync — your call.

**New Rust ground** Whatever the algorithm demands. By here you're
choosing your own lessons.

### Slice 8.2 — Trig conditions and retrigs

**Goal** Conditional trigs (1:2, 3:4, probability) and retriggers.

**Watch out for**
- Conditions need a pattern-repeat counter, which the transport doesn't
  have yet. Small addition, easy to bolt on wrong.
- Probability needs an RNG on the audio thread. You have one from 2.3.
- Retrig means a step triggers N times at a subdivision. It composes with
  microtiming in ways worth thinking through before implementing.

### Slice 8.3 — Multiple patterns and chaining

**Goal** Several patterns, switched live, queued to change at the bar.

**Watch out for**
- Pattern switching must land on a boundary, not immediately.
- The audio thread can't allocate a new pattern. Send it pre-built, or
  double-buffer and swap a pointer.

### Slice 8.4 — Hardening

**Goal** Remove every `unwrap` and `expect` from paths that can fail at
runtime. Real error reporting.

**Watch out for**
- `expect` in startup is fine. `unwrap` in the audio callback is a bug
  waiting for a bad buffer size.
- A panic on the audio thread on macOS is an ugly failure. Audit it.

### Slice 8.5 — Tests

**Goal** Unit tests for the sequencer's timing maths, round-trip tests for
persistence, a golden-output test for a voice.

**New Rust ground**
- `#[cfg(test)]` and `mod tests`
- Testing DSP: render N samples, assert on properties not exact bytes
- `cargo test` in a workspace

**Watch out for**
- Don't test the DSP's exact output. Test properties: the envelope reaches
  zero, the transport hits step 4 at the expected sample, the pattern
  round-trips.
- The sequencer timing maths is the highest-value thing to test and the
  easiest to test in isolation.

### Slice 8.6 — Release

**Goal** README, `--help`, license files, CI, a tagged release, a Homebrew
tap and an AUR PKGBUILD.

**Watch out for**
- `Cargo.lock` committed. `--locked` in CI.
- Linux packaging needs `alsa-lib` as a dependency; document it.
- Homebrew core has notability requirements — a personal tap works from
  day one.
- Tag `v0.1.0` when it makes a beat you'd actually use. Not before, not
  much after.

---

## PROGRESS.md template

Keep this at the repo root. Update it at the end of each session.

```markdown
# drumtic — progress

**Current slice:** 1.1 — Amplitude envelope
**Level:** 1

## Done
- 0.x — workspace, cpal output, 440Hz sine

## Notes to future me
- (things that surprised me, decisions I made and why)

## Open questions
- (things I deferred deliberately)
```

The "notes to future me" section matters more than it looks. Decisions made
in Phase 2 get questioned in Phase 6, and by then the reasoning is gone.
