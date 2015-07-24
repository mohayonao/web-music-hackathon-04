import Instrument, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "../Instrument";
import Envelope from "@mohayonao/envelope";
// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";
import utils from "./utils";

const RELEASE_TIME = 0.125;
const GAIN_UP = 0.75;

export default class SimpleSine extends Instrument {
  static getEnabledParams() {
    return [
      1, 0, 0, 0, 0, 0, 0, 0,
      1, 0, 0, 0, 0, 0, 0, 0,
    ];
  }

  [INITIALIZE]() {}

  [CREATE]() {
    let sustainDb = utils.linlin(this.params[8], 0, 127, -96, 0);
    let frequency = utils.midicps(this.noteNumber);

    this.osc1 = this.audioContext.createOscillator();
    this.osc1.type = "sine";
    this.osc1.frequency.value = frequency;
    this.osc1.onended = () => {
      this.emit("ended");
    };

    this.osc2 = this.audioContext.createOscillator();
    this.osc2.type = "sine";
    this.osc2.frequency.value = frequency;

    this.gain = this.audioContext.createGain();
    this.releaseNode = this.audioContext.createGain();

    this.osc1.connect(this.gain);
    this.osc2.connect(this.gain);
    this.gain.connect(this.releaseNode);
    this.sustainLevel = utils.dbamp(sustainDb);

    this.detune();

    this.outlet = this.releaseNode;
  }

  detune() {
    let fine = utils.linlin(this.params[0], 0, 127, 0.5, 8);

    this.osc1.detune.value = utils.findet(-fine);
    this.osc2.detune.value = utils.findet(+fine);
  }

  ["/param:0"]() {
    this.detune();
  }

  [NOTE_ON](t0) {
    this.osc1.start(t0);
    this.osc2.start(t0);

    Envelope.ads(0.005, 2, this.sustainLevel).applyTo(this.gain.gain, t0);

    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
  }

  [NOTE_OFF](t1) {
    let t2 = t1 + RELEASE_TIME;

    this.osc1.stop(t2);
    this.osc2.stop(t2);

    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
    this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
  }

  [DISPOSE]() {
    this.osc1.disconnect();
    this.osc2.disconnect();
    this.osc1 = this.osc2 = this.releaseNode = null;
  }
}
