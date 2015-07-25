import Instrument, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "../Instrument";
import Envelope from "@mohayonao/envelope";
import Operator from "@mohayonao/operator";
import FMSynth from "@mohayonao/fm-synth";
import utils from "./utils";

const RELEASE_TIME = 13.000;
const GAIN_UP = 1;

export default class TublarBell extends Instrument {
  [INITIALIZE]() {}

  [CREATE]() {
    this.duration = 1;

    let frequency = utils.midicps(this.noteNumber - 2);
    let opA = new Operator(this.audioContext);
    let opB = new Operator(this.audioContext);
    let opC = new Operator(this.audioContext);
    let opD = new Operator(this.audioContext);

    opA.frequency.value = frequency * 3;
    opA.detune.value = utils.findet(500);
    opA.setEnvelope(Envelope.ds(0.004, utils.dbamp(0), utils.dbamp(0)));

    opB.frequency.value = frequency;
    opB.detune.value = utils.findet(250);
    opB.setEnvelope(Envelope.ds(0.031, utils.dbamp(-14), utils.dbamp(0)));

    opC.detune.value = 0;
    opC.frequency.value = 100;
    opC.setEnvelope(Envelope.ds(0.026, utils.dbamp(-28), utils.dbamp(0)));

    opD.frequency.value = frequency * 2;
    opD.detune.value = utils.findet(63);
    opD.setEnvelope(Envelope.ds(3.230, utils.dbamp(-13), utils.dbamp(-17) * frequency * this.volume * 20));

    this.fmsynth = new FMSynth(8, [ opA, opB, opC, opD ]);
    this.fmsynth.onended = () => {
      this.emit("ended");
    };

    this.releaseNode = this.audioContext.createGain();

    this.fmsynth.connect(this.releaseNode);

    this.outlet = this.releaseNode;
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
    this.fmsynth.disconnect();
    this.fmsynth = this.releaseNode = null;
  }
}
