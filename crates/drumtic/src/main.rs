use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use drumtic_engine::Engine;
const MAX_FRAMES: usize = 4096;

fn main() {
    let host = cpal::default_host();

    let device = host
        .default_output_device()
        .expect("no output device found");

    let supported = device
        .default_output_config()
        .expect("no default output config found");

    println!("device: {device}");
    println!("config: {supported:?}");

    assert_eq!(
        supported.sample_format(),
        cpal::SampleFormat::F32,
        "this build only supports f32 sample format"
    );

    let config = supported.config();
    let channels = config.channels as usize;
    let sample_rate = config.sample_rate;

    println!("sample_rate: {sample_rate}");

    let mut engine = Engine::new(sample_rate);
    let mut mono = vec![0.0f32; MAX_FRAMES];

    let stream = device
        .build_output_stream(
            config,
            move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
                for data_slice in data.chunks_mut(mono.len() * channels) {
                    let frames = data_slice.len() / channels;
                    let mono = &mut mono[..frames];

                    engine.process(mono);

                    for (frame, &s) in data_slice.chunks_mut(channels).zip(mono.iter()) {
                        frame.fill(s);
                    }
                }
            },
            |err| eprintln!("stream error: {err}"),
            None,
        )
        .expect("failed to build output stream");

    stream.play().expect("failed to start stream");

    println!("playing 440Hz – ctrl-c to stop");

    std::thread::sleep(std::time::Duration::from_secs(5));
}
