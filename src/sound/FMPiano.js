import Operator from "@mohayonao/operator";
import FMSynth from "@mohayonao/fm-synth";
import Envelope from "@mohayonao/envelope";
import Tone, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "./Tone";
import utils from "../utils";

const RELEASE_TIME = 0.750;
const GAIN_UP = 2.5;

export default class FMPiano extends Tone {
  [INITIALIZE]() {}

  [CREATE]() {
    let frequency = utils.midicps(this.noteNumber);
    let opA = new Operator(this.audioContext);
    let opB = new Operator(this.audioContext);
    let opC = new Operator(this.audioContext);
    let opD = new Operator(this.audioContext);

    opA.frequency.value = frequency;
    opA.detune.value = utils.finedetune(-2);
    opA.setEnvelope(Envelope.r(7.16, utils.dbamp(-7.9)));

    opB.frequency.value = frequency * 14;
    opB.detune.value = utils.finedetune(2);
    opB.setEnvelope(Envelope.r(1.60, utils.dbamp(-40) * frequency * this.volume * 20));

    opC.frequency.value = frequency;
    opC.detune.value = utils.finedetune(3);
    opC.setEnvelope(Envelope.r(7.16, utils.dbamp(-6.7)));

    opD.frequency.value = frequency;
    opD.detune.value = utils.finedetune(1);
    opD.setEnvelope(Envelope.r(7.16, utils.dbamp(-24) * frequency * this.volume * 20));

    this.fmsynth = new FMSynth(7, [ opA, opB, opC, opD ]);
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
