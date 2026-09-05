# drumtic — progress

**Current slice:** 1.1 — Amplitude envelope
**Level:** 1

## Done
- 0.x — workspace, cpal output, 440Hz sine
- 0.x — callback handles buffers larger than the mono scratch buffer (chunked fan-out)

## Notes to future me
- Silence on Linux was never a code bug — the machine's sink was muted.
  Verified the signal path by recording the PipeWire monitor: clean 440Hz,
  peak 0.2, RMS 0.141 (= 0.2/√2). Reach for that check before suspecting DSP.
- PipeWire hands the callback a 512-frame quantum; macOS asks for something
  else. Never assume a buffer size from one machine.

## Open questions
- Chunking in the callback vs. pinning `BufferSize::Fixed` at stream setup —
  chose chunking; revisit if latency ever needs to be a known constant.
