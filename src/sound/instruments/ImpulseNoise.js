import Instrument, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "../Instrument";
// import Envelope from "@mohayonao/envelope";
// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";
import utils from "./utils";

const RELEASE_TIME = 0.125;
const GAIN_UP = 2;

export default class ImpulseNoise extends Instrument {
  [INITIALIZE]() {
    this.wave = utils.createPinkNoise(5);
    this.dust = new Float32Array(8192);

    for (let i = 0; i < this.dust.length; i++) {
      this.dust[i] = Math.random() < 0.0625 ? 1 : 0;
    }
  }

  [CREATE]() {
    this.bufSrc = this.audioContext.createBufferSource();
    this.bufSrc.buffer = this.wave;
    this.bufSrc.loop = true;
    this.bufSrc.onended = () => {
      this.emit("ended");
    };

    this.gain = this.audioContext.createGain();
    this.releaseGain = this.audioContext.createGain();

    this.bufSrc.connect(this.gain);
    this.gain.connect(this.releaseGain);

    this.outlet = this.releaseGain;
  }

  [NOTE_ON](t0) {
    this.bufSrc.start(t0);

    this.gain.gain.setValueCurveAtTime(this.dust, t0, 60);
    this.releaseGain.gain.setValueAtTime(this.volume * GAIN_UP, t0);
  }

  [NOTE_OFF](t1) {
    let t2 = t1 + RELEASE_TIME;

    this.bufSrc.stop(t2);

    this.releaseGain.gain.setValueAtTime(this.volume * GAIN_UP, t1);
    this.releaseGain.gain.exponentialRampToValueAtTime(1e-2, t2);
  }

  [DISPOSE]() {
    this.bufSrc.disconnect();
    this.gain.disconnect();
    this.bufSrc = this.gain = this.releaseGain = null;
  }
}
