pub struct Envelope {
    state: EnvelopeState,
    level: f32,
    attack_inc: f32,
    decay_coeff: f32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum EnvelopeState {
    Idle,
    Attack,
    Decay,
}

// -60 dB decay convention (0.001^(1/N))
const DECAY_TARGET_LEVEL: f32 = 1e-3;

impl Envelope {
    pub fn new(attack_secs: f32, decay_secs: f32, sample_rate: f32) -> Self {
        Self {
            state: EnvelopeState::Idle,
            level: 0.0,
            attack_inc: if attack_secs == 0.0 {
                1.0
            } else {
                1.0 / (attack_secs * sample_rate)
            },
            decay_coeff: DECAY_TARGET_LEVEL.powf(1.0 / (decay_secs * sample_rate)),
        }
    }

    pub fn trigger(&mut self) {
        self.state = EnvelopeState::Attack;
        self.level = 0.0;
    }

    pub fn next(&mut self) -> f32 {
        match self.state {
            EnvelopeState::Idle => 0.0,
            EnvelopeState::Attack => {
                if self.level >= 1.0 {
                    self.state = EnvelopeState::Decay;
                } else {
                    self.level = (self.level + self.attack_inc).min(1.0);
                }
                self.level
            }
            EnvelopeState::Decay => {
                if self.level <= DECAY_TARGET_LEVEL {
                    self.state = EnvelopeState::Idle;
                    self.level = 0.0;
                } else {
                    self.level *= self.decay_coeff;
                }
                self.level
            }
        }
    }
}
