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
            phase_inc: freq / sample_rate,
            sample_rate,
        }
    }

    pub fn tick(&mut self) -> f32 {
        let current_value = (self.phase * TAU).sin();

        self.phase += self.phase_inc;

        if self.phase >= 1.0 {
            self.phase -= 1.0;
        }

        current_value
    }

    pub fn set_freq(&mut self, freq: f32) {
        self.phase_inc = freq / self.sample_rate;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn produces_sine_at_requested_freq() {
        const FREQ: f32 = 10.0;
        const SAMPLE_RATE: f32 = 120.0;
        const PERIOD: usize = (SAMPLE_RATE / FREQ) as usize;
        const PHASE_INC: f32 = FREQ / SAMPLE_RATE;
        let mut osc = Oscillator::new(FREQ, SAMPLE_RATE);
        let mut output = [0.0; PERIOD];
        for s in output.iter_mut() {
            *s = osc.tick();
        }

        for (i, output_value) in output.iter().enumerate() {
            let expected_value = (i as f32 * TAU * PHASE_INC).sin();
            // 1e-5 is roughly 20 ULP at this magniture.
            // Tolerant to float noise, tighter than any bug.
            assert!((expected_value - output_value).abs() < 1e-5);
        }
    }
}
