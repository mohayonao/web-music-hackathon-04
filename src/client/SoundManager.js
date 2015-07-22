export default class SoundManager {
  constructor({ audioContext, timeline }) {
    this.audioContext = audioContext;
    this.timeline = timeline;
    this.inlet = audioContext.createGain();
    this.state = "suspended";
  }

  start() {
    if (this.state === "suspended") {
      this.inlet.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.inlet.gain.linearRampToValueAtTime(0.5, this.audioContext.currentTime + 0.01);
      this.inlet.connect(this.audioContext.destination);
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
}
