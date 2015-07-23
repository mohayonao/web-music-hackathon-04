import Operator from "@mohayonao/operator";
import FMSynth from "@mohayonao/fm-synth";
import Envelope from "@mohayonao/envelope";
import Tone, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "./Tone";
import utils from "../utils";

const DECAY_TIME = 2.0;
const RELEASE_TIME = 0.5;
const GAIN_UP = 1;

export default class PlasticHarp extends Tone {
  [INITIALIZE]() {}

  [CREATE]() {
    this.duration = DECAY_TIME;

    let frequency = utils.midicps(this.noteNumber);
    let opA = new Operator(this.audioContext);
    let opB = new Operator(this.audioContext);
    let opC = new Operator(this.audioContext);
    let opD = new Operator(this.audioContext);

    opA.type = "triangle";
    opA.frequency.value = frequency;
    opA.detune.value = utils.finedetune(-8);
    opA.setEnvelope(Envelope.r(2.500));

    opB.type = "sine";
    opB.frequency.value = frequency * 4;
    opB.setEnvelope(Envelope.r(0.500, utils.dbamp(-14) * frequency * 50));

    opC.type = "triangle";
    opC.frequency.value = frequency;
    opC.detune.value = utils.finedetune(+8);
    opC.setEnvelope(Envelope.r(2.500));

    opD.type = "sine";
    opD.frequency.value = frequency * 4;
    opD.setEnvelope(Envelope.r(0.500, utils.dbamp(-14) * frequency * 50));

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

    this.releaseNode.gain.setValueAtTime(0, t0);
    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0 + 0.005);
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
