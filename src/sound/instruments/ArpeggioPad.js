import Instrument, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "../Instrument";
// import Envelope from "@mohayonao/envelope";
// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";
import utils from "./utils";

const RELEASE_TIME = 1.25;
const GAIN_UP = 0.5;

export default class ArpeggioPad extends Instrument {
  [INITIALIZE]() {}

  [CREATE]() {
    let frequency = utils.midicps(this.noteNumber);
    let valueCurve = new Float32Array(512);
    let octaves = [ 1, 2, 4, 1, 2, 4, 1, 2 ];

    for (let i = 0; i < 512; i++) {
      valueCurve[i] = frequency * utils.wrapAt(octaves, i);
    }

    this.valueCurve = valueCurve;

    this.osc = this.audioContext.createOscillator();
    this.osc.type = "triangle";
    this.osc.onended = () => {
      this.emit("ended");
    };

    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = "highpass";
    this.filter.frequency.value = frequency * 2;
    this.filter.Q.value = utils.linlin(this.params[7], 0, 127, 0.5, 24);

    this.releaseNode = this.audioContext.createGain();

    this.osc.connect(this.filter);
    this.filter.connect(this.releaseNode);

    this.outlet = this.releaseNode;
  }

  [NOTE_ON](t0) {
    this.osc.start(t0);

    let speed = utils.linlin(this.params[15], 0, 127, 120, 30);

    this.osc.frequency.setValueCurveAtTime(this.valueCurve, t0, speed);

    this.releaseNode.gain.setValueAtTime(0, t0);
    this.releaseNode.gain.linearRampToValueAtTime(this.volume * GAIN_UP, t0 + 0.25);
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
    this.osc = this.filter = this.releaseNode = null;
  }
}
