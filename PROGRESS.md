# drumtic — progress

**Current slice:** 1.2 — Two-operator FM
**Level:** 1

## Done
- 0.x — workspace (`drumtic-engine` lib + `drumtic` bin), cpal f32 output
  stream, 440Hz sine rendered mono and fanned out to the device channels
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

## Open questions
- `main.rs:43` — if cpal ever hands a callback with `frames > MAX_FRAMES`,
  `zip` silently truncates: the tail of `data` keeps stale contents and the
  engine renders fewer samples than the device consumed, so the oscillator
  falls behind the clock. Decide whether to raise `MAX_FRAMES`, chunk the
  callback into `MAX_FRAMES`-sized passes, or assert. Not urgent at 512-frame
  buffers; will matter under load or on a different host.
- `Envelope::trigger` hard-resets `level` to 0.0 — the clicky retrigger.
  2.2 asks whether a retrigger should instead re-attack from the current
  level. `Idle` now zeroes `level`, so either choice reads correctly.
- `Envelope::new` guards `attack_secs == 0.0` but not a negative value,
  which would walk `level` downward forever and never leave `Attack`.
  Deliberately not guarded twice: Phase 5's param model owns ranges, and
  nothing unclamped should reach the constructor. Verify that at 5.1.
