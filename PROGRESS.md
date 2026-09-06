# drumtic — progress

**Current slice:** 1.2 — Two-operator FM
**Level:** 1

## Done
- 0.x — workspace (`drumtic-engine` lib + `drumtic` bin), cpal f32 output
  stream, 440Hz sine rendered mono and fanned out to the device channels
- 0.x — callback handles buffers larger than the mono scratch buffer. The
  callback now walks `data` in `MAX_FRAMES`-sized chunks and renders each
  one, instead of truncating via `zip` and letting the oscillator fall
  behind the device clock.
- 1.1 — amplitude envelope. `Envelope` in `crates/drumtic-engine/src/envelope.rs`:
  `Idle`/`Attack`/`Decay`, linear attack ramp, exponential decay. Triggered
  once from `Engine::new` (throwaway — slice 1.4 replaces it).

## Notes to future me
- Phase is normalised 0..1 in `Engine`, multiplied by `TAU` at the sine.
  Keep that convention or the FM maths in 1.2 gets confusing.
- The engine has zero dependencies and must stay ignorant of cpal/crossterm.
- **Envelope decay convention: −60 dB.** `decay_coeff = 0.001^(1/N)` where
  `N = decay_secs * sample_rate`, and the same `DECAY_TARGET_LEVEL` constant
  is the snap-to-`Idle` threshold. Consequence: `decay_secs` means *time
  until silence* exactly, not a time constant. Any second envelope (1.3
  pitch, later filter) must use the same convention or the numbers in the
  UI will lie.
- Output gain is a bare `* 0.5` in `Engine::process`. One voice only. Slice
  2.2 sums four and this needs to become real gain staging.
- Silence on Linux was never a code bug — the machine's sink was muted.
  Verified the signal path by recording the PipeWire monitor: clean 440Hz,
  peak 0.2, RMS 0.141 (= 0.2/√2). Reach for that check before suspecting DSP.
  (Peak is 0.5 now, not 0.2 — the envelope slice changed the output gain.)
- PipeWire hands the callback a 512-frame quantum; macOS asks for something
  else. Never assume a buffer size from one machine.

## Open questions
- Chunking in the callback vs. pinning `BufferSize::Fixed` at stream setup —
  chose chunking; revisit if latency ever needs to be a known constant.
- `Envelope::trigger` hard-resets `level` to 0.0 — the clicky retrigger.
  2.2 asks whether a retrigger should instead re-attack from the current
  level. `Idle` now zeroes `level`, so either choice reads correctly.
- `Envelope::new` guards `attack_secs == 0.0` but not a negative value,
  which would walk `level` downward forever and never leave `Attack`.
  Deliberately not guarded twice: Phase 5's param model owns ranges, and
  nothing unclamped should reach the constructor. Verify that at 5.1.
