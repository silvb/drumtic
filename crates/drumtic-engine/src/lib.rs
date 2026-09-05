use std::f32::consts::TAU;

pub struct Engine {
    sample_rate: f32,
    phase: f32,
    freq: f32,
}

impl Engine {
    pub fn new(sample_rate: u32) -> Self {
        Self {
            sample_rate: sample_rate as f32,
            phase: 0.0,
            freq: 440.0,
        }
    }

    pub fn process(&mut self, out: &mut [f32]) {
        let inc = self.freq / self.sample_rate;

        for s in out.iter_mut() {
            *s = (self.phase * TAU).sin() * 0.2;
            self.phase += inc;
        }

        if self.phase >= 1.0 {
            self.phase -= 1.0;
        }
    }
}
