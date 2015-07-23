import Instrument, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "../Instrument";
import Envelope from "@mohayonao/envelope";
import Operator from "@mohayonao/operator";
import FMSynth from "@mohayonao/fm-synth";
import utils from "../utils";

const GAIN_UP = 1.25;

export default class PureVibes extends Instrument {
  [INITIALIZE]() {}

  [CREATE]() {
    let frequency = utils.midicps(this.noteNumber);
    let opA = new Operator(this.audioContext);
    let opB = new Operator(this.audioContext);
    let opC = new Operator(this.audioContext);

    opA.frequency.value = frequency;
    opA.setEnvelope(Envelope.r(8.31, utils.dbamp(-0.6)));

    opB.frequency.value = frequency * 4;
    opB.setEnvelope(Envelope.r(1.07, utils.dbamp(-3.8)));

    opC.type = "square";
    opC.frequency.value = frequency * 13;
    opC.setEnvelope(Envelope.r(13.9, utils.dbamp(-28) * frequency * 50));

    this.fmsynth = new FMSynth(5, [ opA, opB, opC, null ]);
    this.fmsynth.onended = () => {
      this.emit("ended");
    };

    this.releaseNode = this.audioContext.createGain();

    this.fmsynth.connect(this.releaseNode);

    this.outlet = this.releaseNode;
  }

  [NOTE_ON](t0) {
    this.startTime = t0;
    this.fmsynth.start(t0);
    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
  }

  [NOTE_OFF](t1) {
    let t2 = t1 + 0.5;

    this.fmsynth.stop(t2);

    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
    this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
  }

  [DISPOSE]() {
    this.fmsynth.disconnect();
    this.fmsynth = this.releaseNode = null;
  }
}
