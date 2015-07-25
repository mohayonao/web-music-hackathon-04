import Instrument, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "../Instrument";
import Envelope from "@mohayonao/envelope";
import Operator from "@mohayonao/operator";
import FMSynth from "@mohayonao/fm-synth";
import utils from "./utils";

const RELEASE_TIME = 0.050;
const GAIN_UP = 0.5;

export default class FMBass extends Instrument {
  [INITIALIZE]() {}

  [CREATE]() {
    let frequency = utils.midicps(this.noteNumber);
    let opA = new Operator(this.audioContext);
    let opB = new Operator(this.audioContext);

    opA.frequency.value = frequency;
    opA.detune.value = utils.findet(-2);
    opA.setEnvelope(Envelope.asr(0.004, 0, 17.2, utils.dbamp(-0)));

    opB.frequency.value = frequency * 0.5;
    opB.detune.value = utils.findet(3);
    opB.setEnvelope(Envelope.asr(0.008, 0, 10.4, utils.dbamp(-19) * frequency * this.volume * 20));

    this.fmsynth = new FMSynth(7, [ opA, opB, 0, 0 ]);
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
