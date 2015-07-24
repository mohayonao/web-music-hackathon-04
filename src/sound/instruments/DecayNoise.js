import Instrument, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "../Instrument";
// import Envelope from "@mohayonao/envelope";
// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";
import utils from "./utils";

const RELEASE_TIME = 0.125;
const GAIN_UP = 1;

export default class DecayNoise extends Instrument {
  [INITIALIZE]() {
    this.wave = utils.createWhiteNoise(5);
  }

  [CREATE]() {
    let frequency = utils.midicps(this.noteNumber);

    this.bufSrc = this.audioContext.createBufferSource();
    this.bufSrc.buffer = this.wave;
    this.bufSrc.loop = true;
    this.bufSrc.onended = () => {
      this.emit("ended");
    };

    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = "highpass";
    this.filter.frequency.value = frequency * 4;
    this.filter.Q.value = 36;

    this.releaseGain = this.audioContext.createGain();

    this.bufSrc.connect(this.filter);
    this.filter.connect(this.releaseGain);

    this.outlet = this.releaseGain;
  }

  [NOTE_ON](t0) {
    let t1 = t0;
    let t2 = t1 + RELEASE_TIME;

    this.bufSrc.start(t0);
    this.bufSrc.stop(t2);

    this.releaseGain.gain.setValueAtTime(this.volume * GAIN_UP, t0);
    this.releaseGain.gain.exponentialRampToValueAtTime(1e-2, t2);
  }

  [NOTE_OFF]() {}

  [DISPOSE]() {
    this.bufSrc.disconnect();
    this.filter.disconnect();
    this.bufSrc = this.filter = this.releaseGain = null;
  }
}
