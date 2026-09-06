pub(crate) mod envelope;

use envelope::Envelope;
use std::f32::consts::TAU;

pub struct Engine {
    sample_rate: f32,
    phase: f32,
    freq: f32,
    envelope: Envelope,
}

impl Engine {
    pub fn new(sample_rate: u32) -> Self {
        let mut engine = Self {
            sample_rate: sample_rate as f32,
            phase: 0.0,
            freq: 440.0,
            envelope: Envelope::new(0.003, 0.1, sample_rate as f32),
        };

        engine.envelope.trigger();
        engine
    }

    pub fn process(&mut self, out: &mut [f32]) {
        let inc = self.freq / self.sample_rate;

        for s in out.iter_mut() {
            *s = (self.phase * TAU).sin() * self.envelope.tick() * 0.5;
            self.phase += inc;

            if self.phase >= 1.0 {
                self.phase -= 1.0;
            }
        }
    }
}
