pub(crate) mod envelope;
pub(crate) mod oscillator;

use envelope::Envelope;
use oscillator::Oscillator;

pub struct Engine {
    envelope: Envelope,
    carrier: Oscillator,
    modulator: Oscillator,
}

const MOD_INDEX: f32 = 0.7;
const MOD_RATIO: f32 = 3.5;
const CARRIER_FREQ: f32 = 60.0;
const AMPLITUDE: f32 = 0.5;

impl Engine {
    pub fn new(sample_rate: u32) -> Self {
        let mut engine = Self {
            envelope: Envelope::new(0.003, 0.6, sample_rate as f32),
            carrier: Oscillator::new(CARRIER_FREQ, sample_rate as f32),
            modulator: Oscillator::new(CARRIER_FREQ * MOD_RATIO, sample_rate as f32),
        };

        engine.envelope.trigger();
        engine
    }

    pub fn process(&mut self, out: &mut [f32]) {
        for s in out.iter_mut() {
            let phase_mod = self.modulator.tick(0.0) * MOD_INDEX;
            *s = self.carrier.tick(phase_mod) * self.envelope.tick() * AMPLITUDE;
        }
    }
}
