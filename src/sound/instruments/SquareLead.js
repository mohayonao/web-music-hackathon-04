import Instrument, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "../Instrument";
import Envelope from "@mohayonao/envelope";
import Operator from "@mohayonao/operator";
import FMSynth from "@mohayonao/fm-synth";
import utils from "./utils";

const RELEASE_TIME = 0.050;
const GAIN_UP = 0.5;

export default class SquareLead extends Instrument {
  [INITIALIZE]() {}

  [CREATE]() {
    let frequency = utils.midicps(this.noteNumber);
    let opA = new Operator(this.audioContext);
    let opB = new Operator(this.audioContext);
    let opC = new Operator(this.audioContext);
    let opD = new Operator(this.audioContext);

    opA.type = "square";
    opA.frequency.value = frequency;
    opA.detune.value = utils.findet(-6);
    opA.setEnvelope(Envelope.ads(0.060, 0.600, 1, utils.dbamp(0)));

    opB.type = "square";
    opB.frequency.value = frequency;
    opB.detune.value = utils.findet(+6);
    opB.setEnvelope(Envelope.ads(0.112, 0.600, 1, utils.dbamp(0)));

    opC.type = "square";
    opC.frequency.value = frequency;
    opC.detune.value = utils.findet(-10);
    opC.setEnvelope(Envelope.ads(0.004, 0.600, 1, utils.dbamp(0)));

    opD.type = "square";
    opD.frequency.value = frequency;
    opD.detune.value = utils.findet(+10);
    opD.setEnvelope(Envelope.ads(0.006, 0.600, 1, utils.dbamp(0)));

    this.synth = new FMSynth(10, [ opA, opB, opC, opD ]);
    this.synth.onended = () => {
      this.emit("ended");
    };

    this.releaseNode = this.audioContext.createGain();

    this.synth.connect(this.releaseNode);

    this.outlet = this.releaseNode;
  }

  [NOTE_ON](t0) {
    this.synth.start(t0);
    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
  }

  [NOTE_OFF](t1) {
    let t2 = t1 + RELEASE_TIME;

    this.synth.stop(t2);
    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
    this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
  }

  [DISPOSE]() {
    this.synth.disconnect();
    this.synth = this.releaseNode = null;
  }
}
