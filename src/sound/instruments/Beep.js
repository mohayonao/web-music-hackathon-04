import Instrument, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "../Instrument";
// import Envelope from "@mohayonao/envelope";
// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";
import utils from "../utils";

const DECAY_TIME = 0.05;
const RELEASE_TIME = 0.01;
const GAIN_UP = 2;

export default class Beep extends Instrument {
  [INITIALIZE]() {}

  [CREATE]() {
    this.duration = DECAY_TIME;

    let frequency = utils.midicps((this.noteNumber % 12) + 60) * 8;

    this.osc = this.audioContext.createOscillator();
    this.osc.frequency.value = frequency;
    this.osc.onended = () => {
      this.emit("ended");
    };

    this.releaseNode = this.audioContext.createGain();

    this.osc.connect(this.releaseNode);

    this.outlet = this.releaseNode;
  }

  [NOTE_ON](t0) {
    this.osc.start(t0);

    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
  }

  [NOTE_OFF](t1) {
    let t2 = t1 + RELEASE_TIME;

    this.osc.stop(t2);

    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
    this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
  }

  [DISPOSE]() {
    this.osc.disconnect();
    this.osc = this.releaseNode = null;
  }
}
