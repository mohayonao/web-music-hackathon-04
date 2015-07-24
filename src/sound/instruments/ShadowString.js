import Instrument, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "../Instrument";
// import Envelope from "@mohayonao/envelope";
// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";
import utils from "../utils";
import ChorusStrings from "@mohayonao/wave-tables/ChorusStrings";

const RELEASE_TIME = 1.25;
const GAIN_UP = 0.75;

export default class ShadowString extends Instrument {
  [INITIALIZE]() {
    this.wave = utils.createWave(ChorusStrings);
  }

  [CREATE]() {
    let frequency = utils.midicps(this.noteNumber);

    this.osc1 = this.audioContext.createOscillator();
    this.osc1.setPeriodicWave(this.wave);
    this.osc1.frequency.value = frequency * 0.5;
    this.osc1.detune.value = utils.finedetune(-2);
    this.osc1.onended = () => {
      this.emit("ended");
    };

    this.osc2 = this.audioContext.createOscillator();
    this.osc2.setPeriodicWave(this.wave);
    this.osc2.frequency.value = frequency * 0.5;
    this.osc2.detune.value = utils.finedetune(+2);

    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = frequency * 2;
    this.filter.Q.value = 12;

    this.releaseNode = this.audioContext.createGain();

    this.osc1.connect(this.filter);
    this.osc2.connect(this.filter);
    this.filter.connect(this.releaseNode);

    this.outlet = this.releaseNode;
  }

  [NOTE_ON](t0) {
    this.osc1.start(t0);
    this.osc2.start(t0);

    this.releaseNode.gain.setValueAtTime(0, t0);
    this.releaseNode.gain.linearRampToValueAtTime(this.volume * GAIN_UP, t0 + 0.25);
  }

  [NOTE_OFF](t1) {
    let t2 = t1 + RELEASE_TIME;

    this.osc1.stop(t2);
    this.osc2.stop(t2);

    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
    this.releaseNode.gain.linearRampToValueAtTime(0, t2);
  }

  [DISPOSE]() {
    this.osc1.disconnect();
    this.osc2.disconnect();
    this.filter.disconnect();
    this.osc1 = this.osc2 = this.filter = this.releaseNode = null;
  }
}
