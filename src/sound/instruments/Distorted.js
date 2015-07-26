import Instrument, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "../Instrument";
import Envelope from "@mohayonao/envelope";
import Operator from "@mohayonao/operator";
import FMSynth from "@mohayonao/fm-synth";
import utils from "./utils";

const RELEASE_TIME = 0.25;
const GAIN_UP = 0.6;

export default class Distorted extends Instrument {
  [INITIALIZE]() {}

  [CREATE]() {
    let frequency = utils.midicps(this.noteNumber);
    let opA = new Operator(this.audioContext);
    let opB = new Operator(this.audioContext);
    let opC = new Operator(this.audioContext);

    opA.frequency.value = frequency * 0.5;
    opA.setEnvelope(Envelope.ads(0.005, 0.100, utils.dbamp(-2)));

    opB.frequency.value = frequency;
    opB.detune.value = utils.findet(-2);
    opB.setEnvelope(Envelope.ads(0.250, 0.500, utils.dbamp(-12), utils.dbamp(-18) * frequency * 50));

    opC.frequency.value = frequency;
    opC.setEnvelope(Envelope.ads(0.005, 2.500, utils.dbamp(-12), utils.dbamp(-10) * frequency * 50));

    this.fmsynth = new FMSynth(3, [ opA, opB, opC, null ]);
    this.fmsynth.onended = () => {
      this.emit("ended");
    };

    this.frequency = frequency;
    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = "lowpass";
    this.updateFilter();

    this.releaseNode = this.audioContext.createGain();

    this.fmsynth.connect(this.filter);
    this.filter.connect(this.releaseNode);

    this.outlet = this.releaseNode;
  }

  updateFilter() {
    let x = this.params[2];
    let y = this.params[10];

    this.filter.frequency.value = this.frequency * utils.linexp(x, 0, 127, 0.5, 12);
    this.filter.Q.value = utils.linlin(y, 0, 127, 16, 80);
  }

  ["/param:2"]() {
    this.updateFilter();
  }

  ["/param:10"]() {
    this.updateFilter();
  }

  [NOTE_ON](t0) {
    this.fmsynth.start(t0);
    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
  }

  [NOTE_OFF](t1) {
    let t2 = t1 + RELEASE_TIME;

    this.fmsynth.stop(t2);

    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
    this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
  }

  [DISPOSE]() {
  }
}
