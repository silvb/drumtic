pub(crate) mod envelope;
pub(crate) mod oscillator;

use envelope::Envelope;
use oscillator::Oscillator;

pub struct Engine {
    envelope: Envelope,
    carrier: Oscillator,
    modulator: Oscillator,
}

impl Engine {
    pub fn new(sample_rate: u32) -> Self {
        let mut engine = Self {
            envelope: Envelope::new(0.003, 0.1, sample_rate as f32),
            carrier: Oscillator::new(440.0, sample_rate as f32),
            modulator: Oscillator::new(880.0, sample_rate as f32),
        };

        engine.envelope.trigger();
        engine
    }

    pub fn process(&mut self, out: &mut [f32]) {
        for s in out.iter_mut() {
            *s = self.carrier.tick() * self.envelope.tick() * 0.5;
        }
    }
}
