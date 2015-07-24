import Instrument, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "../Instrument";
import Envelope from "@mohayonao/envelope";
// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";
import utils from "../utils";

const RELEASE_TIME = 0.05;
const GAIN_UP = 0.5;

export default class AnalogBass extends Instrument {
  [INITIALIZE]() {
  }

  [CREATE]() {
    let frequency = utils.midicps(this.noteNumber);

    this.frequency = frequency;

    this.osc = this.audioContext.createOscillator();
    this.osc.type = "sawtooth";
    this.osc.frequency.value = frequency * 0.5;
    this.osc.onended = () => {
      this.emit("ended");
    };

    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 220;
    this.filter.Q.value = 12;

    this.gain = this.audioContext.createGain();
    this.releaseNode = this.audioContext.createGain();

    this.osc.connect(this.filter);
    this.filter.connect(this.gain);
    this.gain.connect(this.releaseNode);

    this.outlet = this.releaseNode;
  }

  [NOTE_ON](t0) {
    this.osc.start(t0);

    Envelope.ads(0.005, 10.5, utils.dbamp(-48)).applyTo(this.gain.gain, t0);

    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
  }

  [NOTE_OFF](t1) {
    let t2 = t1 + RELEASE_TIME;

    this.osc.stop(t2);

    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
    this.releaseNode.gain.linearRampToValueAtTime(0, t2);
  }

  [DISPOSE]() {
    this.osc.disconnect();
    this.filter.disconnect();
    this.gain.disconnect();
    this.osc = this.filter = this.gain = this.releaseNode = null;
  }
}
