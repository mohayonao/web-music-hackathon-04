import BaseSoundDispatcher from "../SoundDispatcher";

export default class SoundDispatcher extends BaseSoundDispatcher {
  constructor(...args) {
    super(...args);

    this.outlet = this.audioContext.createDynamicsCompressor();
    this.outlet.ratio.value = 9;
    this.outlet.threshold.value = -2;
  }

  push(instance) {
    instance.connect(this.outlet);
  }
}
