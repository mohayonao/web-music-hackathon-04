global.AudioContext = global.AudioContext || global.webkitAudioContext;

let audioContext = null;

function getContext() {
  if (audioContext === null) {
    audioContext = new global.AudioContext();
  }
  return audioContext;
}

function createColoredWave(colors) {
  let imag = new Float32Array(16);
  let real = new Float32Array(16);

  imag.set(colors, 1);

  return audioContext.createPeriodicWave(real, imag);
}

function createWave(wave) {
  return audioContext.createPeriodicWave(new Float32Array(wave.real), new Float32Array(wave.imag));
}

function createPinkNoise(duration = 4, rand = Math.random) {
  let noise = new Float32Array(duration * audioContext.sampleRate);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

  for (let i = 0, imax = noise.length; i < imax; i++) {
    let white = rand() * 2 - 1;

    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;

    noise[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    noise[i] *= 0.11;
    b6 = white * 0.115926;
  }

  let buffer = audioContext.createBuffer(1, noise.length, audioContext.sampleRate);

  buffer.getChannelData(0).set(noise);

  return buffer;
}

function createWhiteNoise(duration = 4, rand = Math.random) {
  let noise = new Float32Array(duration * audioContext.sampleRate);

  for (let i = 0, imax = noise.length; i < imax; i++) {
    noise[i] = (rand() * 2) - 1;
  }

  let buffer = audioContext.createBuffer(1, noise.length, audioContext.sampleRate);

  buffer.getChannelData(0).set(noise);

  return buffer;
}

export default {
  getContext,
  createColoredWave,
  createWave,
  createPinkNoise,
  createWhiteNoise,
};
