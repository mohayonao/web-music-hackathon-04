import Operator from "@mohayonao/operator";
import FMSynth from "@mohayonao/fm-synth";
import Envelope from "@mohayonao/envelope";
import Tone, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "./Tone";
import utils from "../utils";

const RELEASE_TIME = 0.25;
const GAIN_UP = 0.6;

export default class Distorted extends Tone {
  [INITIALIZE]() {}

  [CREATE]() {
    let frequency = utils.midicps(this.noteNumber);
    let opA = new Operator(this.audioContext);
    let opB = new Operator(this.audioContext);
    let opC = new Operator(this.audioContext);

    opA.frequency.value = frequency * 0.5;
    opA.setEnvelope(Envelope.ads(0.005, 0.100, utils.dbamp(-2)));

    opB.frequency.value = frequency;
    opB.detune.value = utils.finedetune(-2);
    opB.setEnvelope(Envelope.ads(0.250, 0.500, utils.dbamp(-12), utils.dbamp(-18) * frequency * 50));

    opC.frequency.value = frequency;
    opC.setEnvelope(Envelope.ads(0.005, 2.500, utils.dbamp(-12), utils.dbamp(-10) * frequency * 50));

    this.fmsynth = new FMSynth(3, [ opA, opB, opC, null ]);
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
  }
}
