import Instrument, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "../Instrument";
import Envelope from "@mohayonao/envelope";
// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";
import utils from "./utils";

const ATTACK_TIME = 0.005;
const DECAY_TIME = 0.005;
const SUSTAIN_LEVEL = 0.75;
const SUSTAIN_TIME = 0.050;
const GAIN_UP = 2;

export default class DelayTone extends Instrument {
  static getEnabledParams() {
    return [
      0, 0, 0, 0, 0, 0, 0, 0,
      1, 0, 0, 0, 0, 0, 0, 0,
    ];
  }

  [INITIALIZE]() {
    this.wave = utils.createColoredWave("#fa240000000");
  }

  [CREATE]() {
    let frequency = utils.midicps(this.noteNumber);

    this.duration = ATTACK_TIME + DECAY_TIME + SUSTAIN_TIME;
    this.osc = this.audioContext.createOscillator();
    this.osc.setPeriodicWave(this.wave);
    this.osc.frequency.value = frequency;
    this.osc.detune.value = utils.findet(+4);
    this.osc.onended = () => {
      this.emit("ended");
    };

    this.releaseNode = this.audioContext.createGain();

    this.osc.connect(this.releaseNode);

    this.outlet = this.releaseNode;
  }

  [NOTE_ON](t0) {
    this.osc.start(t0);

    Envelope.ads(
      ATTACK_TIME, DECAY_TIME, SUSTAIN_LEVEL, this.volume * GAIN_UP
    ).applyTo(this.releaseNode.gain, t0);
  }

  [NOTE_OFF](t1) {
    let t2 = t1 + utils.linlin(this.params[8], 0, 127, 0.1, 4);

    this.osc.stop(t2);

    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
    this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
  }

  [DISPOSE]() {
    this.osc.disconnect();
    this.osc = this.releaseNode = null;
  }
}
