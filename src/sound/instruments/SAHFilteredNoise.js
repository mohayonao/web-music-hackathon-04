import Instrument, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "../Instrument";
// import Envelope from "@mohayonao/envelope";
// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";
import utils from "./utils";

const RELEASE_TIME = 0.125;
const GAIN_UP = 0.5;

export default class SAHFilteredNoise extends Instrument {
  [INITIALIZE]() {
    this.wave = utils.createWhiteNoise(5);
    this.cutoffValues = new Float32Array(1024);

    for (let i = 0; i < 1024; i++) {
      this.cutoffValues[i] = utils.linexp(Math.random(), 0, 1, 1200, 3600);
    }
  }

  [CREATE]() {
    this.bufSrc = this.audioContext.createBufferSource();
    this.bufSrc.buffer = this.wave;
    this.bufSrc.loop = true;
    this.bufSrc.onended = () => {
      this.emit("ended");
    };

    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = "bandpass";
    this.filter.Q.value = 8;

    this.releaseGain = this.audioContext.createGain();

    this.bufSrc.connect(this.filter);
    this.filter.connect(this.releaseGain);

    this.outlet = this.releaseGain;
  }

  [NOTE_ON](t0) {
    this.bufSrc.start(t0);

    this.filter.frequency.setValueCurveAtTime(this.cutoffValues, t0, 60);
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
    this.filter.disconnect();
    this.bufSrc = this.filter = this.releaseGain = null;
  }
}
