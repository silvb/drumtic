use std::f32::consts::TAU;

pub struct Oscillator {
    phase: f32,
    phase_inc: f32,
    sample_rate: f32,
}

impl Oscillator {
    pub fn new(freq: f32, sample_rate: f32) -> Self {
        Self {
            phase: 0.0,
            phase_inc: Self::phase_inc(freq, sample_rate),
            sample_rate,
        }
    }

    fn phase_inc(freq: f32, sample_rate: f32) -> f32 {
        TAU * freq / sample_rate
    }

    pub fn tick(&mut self, phase_mod: f32) -> f32 {
        let current_value = (self.phase + phase_mod).sin();

        self.phase += self.phase_inc;

        if self.phase >= TAU {
            self.phase -= TAU;
        }

        current_value
    }

    pub fn set_freq(&mut self, freq: f32) {
        self.phase_inc = Self::phase_inc(freq, self.sample_rate);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Fixture: SAMPLE_RATE / FREQ must divide evenly, or PERIOD truncates and
    // the references below describe a cycle the oscillator isn't walking.
    const FREQ: f32 = 10.0;
    const SAMPLE_RATE: f32 = 120.0;
    const PERIOD: usize = (SAMPLE_RATE / FREQ) as usize;
    const SAMPLES: usize = PERIOD * 3;

    // Cycles per sample. Deliberately NOT the same unit as
    // `Oscillator::phase_inc`, which is radians per sample — the reference is
    // built from the fixture rather than from the implementation, so a units
    // change in the oscillator can't silently drag the expectation along.
    const CYCLES_PER_SAMPLE: f32 = FREQ / SAMPLE_RATE;

    // ~20 ULP at the argument magnitudes reached here. Loose enough for f32
    // rounding, far tighter than any real bug: a wrong increment or a broken
    // wrap is off by percent, not parts per million.
    const TOLERANCE: f32 = 1e-5;

    fn render(phase_mod: f32) -> [f32; SAMPLES] {
        let mut osc = Oscillator::new(FREQ, SAMPLE_RATE);
        let mut out = [0.0; SAMPLES];
        for s in out.iter_mut() {
            *s = osc.tick(phase_mod);
        }
        out
    }

    fn assert_close(output: &[f32], expected: impl Fn(f32) -> f32) {
        for (i, &actual) in output.iter().enumerate() {
            let radians = i as f32 * TAU * CYCLES_PER_SAMPLE;
            let want = expected(radians);
            let diff = (want - actual).abs();
            assert!(
                diff < TOLERANCE,
                "sample {i}: expected {want}, got {actual} (diff {diff})"
            );
        }
    }

    #[test]
    fn produces_sine_at_requested_freq() {
        assert_close(&render(0.0), f32::sin);
    }

    #[test]
    fn constant_phase_offset_does_not_accumulate() {
        // sin(x + TAU/4) == cos(x). Had the offset leaked into the phase
        // accumulator it would compound every sample and diverge immediately.
        assert_close(&render(TAU / 4.0), f32::cos);
    }
}
