# drumtic — progress

**Current slice:** 1.3 — Pitch envelope, and it becomes a kick
**Level:** 1 (promotion signals noted at the bottom — re-assess after 1.3)

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
- 1.2 — two-operator FM. `Oscillator` extracted to
  `crates/drumtic-engine/src/oscillator.rs` (note: roadmap says `osc.rs`;
  the code wins). `Engine` owns a carrier and a modulator plus the
  `MOD_INDEX` / `MOD_RATIO` / `CARRIER_FREQ` / `AMPLITUDE` constants. Two
  tests, mutation-checked.

## Notes to future me

### Phase is in RADIANS, not 0..1
Reversed during 1.2 — the old "normalised 0..1, multiply by TAU at the
sine" note is dead, delete it from memory. `phase_inc = TAU * freq /
sample_rate`, wrap at `TAU`, and `tick` calls `.sin()` on the sum
directly.

Chose it for one less conversion per sample and because the code then
reads like the FM literature, which is what I'll be debugging against at
midnight. Cost, knowingly accepted: the accumulator now sits where f32's
ULP is ~4.8e-7 instead of ~1.2e-7, four times coarser. It doesn't matter
because the wrap bounds the error to one cycle's worth — micro-Hertz of
pitch error. It *would* matter for an accumulator that runs free. The
transport in 3.2 is exactly that kind of accumulator: don't copy this
decision there without re-deriving it.

### The wrap is a precision measure, not a correctness one
`if phase >= TAU { phase -= TAU }` cannot be caught by any test I can
afford to write. Sine is periodic, so removing the wrap entirely produces
mathematically identical output — it only shows up as drift after millions
of samples, when the accumulator has climbed into the sparse part of the
float range and the increment loses digits. Held by understanding, not by
the test suite. Don't "simplify" it away.

### Modulation index is in RADIANS (peak phase deviation)
Matches the literature directly now. Calibration: below 1 is subtle, 1–3
is unmistakable FM character, 5–10 is aggressive and starts to alias.
Before the radians refactor the same constant meant *cycles*, so old
settings are ~6.3× stronger than the number suggests.

### Ratio is the stored quantity, not the modulator's frequency
`modulator_freq = CARRIER_FREQ * MOD_RATIO`. 1.3 sweeps the carrier 400→50
Hz, and the modulator has to follow it or the timbre changes as the pitch
falls. `Oscillator::set_freq` exists and is uncalled until then — that's
what the two dead-code warnings are.

### The rule that settled the Oscillator refactor
First attempt moved the whole voice into `Oscillator` — envelope, output
gain, buffer loop. The test that fixed the scope: **"if I had two of these
and wanted FM, would the modulator need this?"** Everything that survives
belongs in the oscillator; everything else goes back up to whoever owns
the voice. Reach for that question again in 2.2 when `Voice` appears.

### FM is additive at the *read*, and the identity element proves it
`(self.phase + phase_mod).sin()`, then `self.phase += self.phase_inc`
untouched by the offset. The offset is transient — computed fresh each
sample, never written back. Two failed attempts before this landed:
`set_phase` (overwrote the accumulator — output became a waveshaped
modulator at the modulator's pitch, carrier frequency had no effect), then
multiplication (`phase * phase_mod`, which made 1.0 the neutral value).

**The tell: if the "no modulation" value isn't 0.0, it isn't addition.**
Discomfort about having to pass a magic neutral was the bug announcing
itself as an ergonomics complaint.

### Test conventions established here
- Reference computed from the fixture (`CYCLES_PER_SAMPLE`), never from
  the implementation's internals — that's why the tests survived the
  radians refactor unchanged.
- Tolerance is a named const with the ULP reasoning written down. ~20 ULP.
  Never tune an epsilon to "smallest that passes": `sin` isn't bit-identical
  across platforms and it'll flake elsewhere.
- Both tests were mutation-checked (leak the offset into the accumulator /
  wrong wrap amount / `*` instead of `+`). The sine test alone does NOT
  catch an accumulator leak, because at `phase_mod = 0.0` a leak adds
  nothing. That's what the cosine test is for.
- Fixture assumes `SAMPLE_RATE / FREQ` divides evenly. Break that and
  `PERIOD` truncates silently.

### Tooling
`bacon.toml` sets `default_job = "clippy-all"`. Bare `cargo clippy` builds
the lib *without* `cfg(test)`, so test-module errors and lints are
invisible to it. This bit once already — a test that didn't compile while
clippy reported a clean build. The `pedantic` job (`cargo clippy -- -W
clippy::pedantic`) is a good occasional teacher.

### Still true from before
- The engine has zero dependencies and must stay ignorant of
  cpal/crossterm.
- **Envelope decay convention: −60 dB.** `decay_coeff = 0.001^(1/N)` where
  `N = decay_secs * sample_rate`, and the same `DECAY_TARGET_LEVEL` constant
  is the snap-to-`Idle` threshold. Consequence: `decay_secs` means *time
  until silence* exactly, not a time constant. The 1.3 pitch envelope must
  use the same convention or the numbers in the UI will lie.
- Output gain is a bare `AMPLITUDE * 0.5` in `Engine::process`. One voice
  only. Slice 2.2 sums four and this needs to become real gain staging.
- Silence on Linux was never a code bug — the machine's sink was muted.
  Verified the signal path by recording the PipeWire monitor: clean 440Hz,
  peak 0.2, RMS 0.141 (= 0.2/√2). Reach for that check before suspecting DSP.
- PipeWire hands the callback a 512-frame quantum; macOS asks for something
  else. Never assume a buffer size from one machine.

## Architecture decisions deferred on purpose
- **Waveforms** (sine/triangle/square/saw) want an **enum field on
  `Oscillator`**, matched in `tick` — not a trait, not `Box<dyn>`. The set
  is closed, exhaustive matching turns "add a variant" into a compile
  error, and there's no allocation or vtable. Land it in 2.2/2.3 when the
  hat actually needs it. Domain caveat: naive saw/square alias badly at
  high pitches; triangle less so; sine is the only trivially alias-free
  one. Band-limiting is a Phase 7-shaped problem.
- **Noise is not an oscillator.** No phase, no frequency, cannot be phase
  modulated. The only shared surface with `Oscillator` is
  `fn next(&mut self) -> f32`, which is too thin to be worth a trait. Keep
  the distinction as file organisation, not as a type.
- **Don't abstract over instruments before Phase 5.** What separates a kick
  from a hat isn't behaviour — both render samples after a trigger — it's
  *parameters*. Any voice abstraction has to answer "what is a parameter,
  generically," and that's the 5.x question including normalized-vs-natural
  units. Write the second and third instrument (2.3) before designing the
  abstraction over the first.
- Cheap to get wrong: all of the above. Expensive to reverse: the
  engine/host boundary, and the Phase 5 parameter representation. Spend the
  worry there.

## Borrow-checker ground covered (will matter in 2.2)
`self.carrier.tick(...)` and `self.modulator.tick(...)` in one expression
compile because the checker works on **places**: distinct named fields are
provably disjoint, so two `&mut` borrows coexist. The nested form also
leans on **two-phase borrows** (the receiver's `&mut` is only "reserved"
while arguments evaluate — same rule that lets `vec.push(vec.len())` work).

Two shapes that will *stop* compiling in Phase 2:
- Calling a `&mut self` **method** while a field is borrowed
  (`for v in self.voices.iter_mut() { self.mix_into(v) }`) — a method is
  opaque, so assume it touches everything. Fix by narrowing the borrow, not
  with `RefCell` (runtime check, can panic, wrong on the audio thread).
- Two elements of the same collection (`&mut self.voices[0]` and
  `&mut self.voices[1]`) — indices are runtime values, the checker can't
  prove them distinct. That's what `split_at_mut` is for.

Rule of thumb: different field names → provable. Different runtime indices
→ not provable. A `&mut self` method → opaque.

## Open questions
- **A static index sounds static.** Real FM percussion envelopes the
  modulation index so the attack is bright and the tail dulls. Phase 1 has
  no slice for it (1.3 is the *pitch* envelope). Decide after 1.3 whether
  that's a roadmap gap or a Phase 5 param-model thing.
- `Oscillator::compute_phase_inc` factors out the **expression**, not the
  **operation** — `new` and `set_freq` share the arithmetic but not any
  policy. Fine while there is no policy. The moment `set_freq` grows a
  guard (clamp to > 0, refuse above Nyquist), `new` will bypass it. Revisit
  then; the alternative is `new` constructing with a placeholder and
  calling `set_freq`.
- Chunking in the callback vs. pinning `BufferSize::Fixed` at stream setup —
  chose chunking; revisit if latency ever needs to be a known constant.
- `Envelope::trigger` hard-resets `level` to 0.0 — the clicky retrigger.
  2.2 asks whether a retrigger should instead re-attack from the current
  level. `Idle` now zeroes `level`, so either choice reads correctly.
- `Envelope::new` guards `attack_secs == 0.0` but not a negative value,
  which would walk `level` downward forever and never leave `Attack`.
  Deliberately not guarded twice: Phase 5's param model owns ranges, and
  nothing unclamped should reach the constructor. Verify that at 5.1.
- `Oscillator` phase reset on trigger — a drum voice usually wants a
  consistent attack, which means zeroing phase on each hit. Not needed
  while nothing retriggers. 2.2.

## Level notes
Level 1 held for the 1.3 brief. Promotion signals in 1.2: pushed back on
the phase-representation recommendation with a reason, and the reason was
good; questions were about tradeoffs (premature abstraction, optional
arguments, unit conventions) rather than syntax; read and fixed an E0277
unaided; caught the over-wide `Oscillator` refactor before it compiled.

Against: still needed pointing at the concept and the location several
times during the extraction, and two conceptual FM errors before the
additive form landed. That's one slice of evidence, not three. If 1.3 goes
without rung-3 hints, brief 1.4 at Level 2 — requirement and constraints,
no signatures.
