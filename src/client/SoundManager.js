const BUF_SIZE = 1024;

export default class SoundManager {
  constructor({ audioContext, timeline }) {
    this.audioContext = audioContext;
    this.timeline = timeline;
    this.inlet = audioContext.createGain();
    this.state = "suspended";

    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = BUF_SIZE;
    this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
    this.timeDomainData = new Float32Array(this.analyser.fftSize);
  }

  start() {
    if (this.state === "suspended") {
      this.inlet.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.inlet.gain.linearRampToValueAtTime(0.5, this.audioContext.currentTime + 0.01);

      this.inlet.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.state = "running";
    }

    return this;
  }

  stop() {
    if (this.state === "running") {
      this.inlet.gain.setValueAtTime(0.5, this.audioContext.currentTime);
      this.inlet.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.01);
      this.timeline.nextTick(() => {
        this.inlet.disconnect();
      });
      this.state = "suspended";
    }

    return this;
  }

  getFloatFrequencyData() {
    this.analyser.getFloatFrequencyData(this.frequencyData);

    return this.frequencyData;
  }

  getFloatTimeDomainData() {
    this.analyser.getFloatTimeDomainData(this.timeDomainData);

    return this.timeDomainData;
  }
}
