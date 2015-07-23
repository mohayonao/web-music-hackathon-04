export default class SoundDispatcher {
  constructor({ audioContext, timeline }) {
    this.audioContext = audioContext;
    this.timeline = timeline;
    this.outlet = null;
  }

  push(instance) {
    if (this.outlet) {
      instance.connect(this.outlet);
    }
  }

  connect(destination) {
    if (this.outlet) {
      this.outlet.connect(destination);
    }
  }

  disconnect() {
    if (this.outlet) {
      this.outlet.disconnect();
    }
  }

  dispose() {}
}
