import BaseSoundDispatcher from "../SoundDispatcher";
import utils from "../utils";

export default class SoundDispatcher extends BaseSoundDispatcher {
  constructor(...args) {
    super(...args);

    this.outlet = this.audioContext.createDynamicsCompressor();
    this.outlet.ratio.value = 9;
    this.outlet.threshold.value = -2;

    let nomOfLocation = 24;

    this.panners = new Array(nomOfLocation);

    for (let i = 0; i < nomOfLocation; i++) {
      let distance = Math.random();
      let x = Math.sin((i / nomOfLocation) * 2 * Math.PI) * distance;
      let z = Math.cos((i / nomOfLocation) * 2 * Math.PI) * distance;
      let y = x * x * z * z;

      this.panners[i] = this.audioContext.createPanner();
      this.panners[i].setPosition(x, y, z);
      this.panners[i].connect(this.outlet);
    }
  }

  push(instance) {
    instance.connect(utils.sample(this.panners));
  }
}
