import Operator from "@mohayonao/operator";
import FMSynth from "@mohayonao/fm-synth";
import Envelope from "@mohayonao/envelope";
import Tone, { INITIALIZE, NOTE_ON, NOTE_OFF, DISPOSE } from "./Tone";
import utils from "../utils";

let CUTOFF_VALUES = new Float32Array(1024);

for (let i = 0; i < 1024; i++) {
  CUTOFF_VALUES[i] = utils.linexp(Math.random(), 0, 1, 1000, 8000);
}

export default class TwinklePad extends Tone {
  [INITIALIZE]() {
    this.volume = utils.linexp(this.velocity, 0, 127, 0.05, 0.75);

    let frequency = utils.midicps(this.noteNumber);
    let opA = new Operator(this.audioContext);
    let opB = new Operator(this.audioContext);
    let opC = new Operator(this.audioContext);

    opA.type = "triangle";
    opA.frequency.value = frequency * 2;
    opA.setEnvelope(Envelope.ads(0.15, 2.5, 1));

    opB.frequency.value = frequency * 11;
    opB.setEnvelope(Envelope.ads(1.00, 0.50, utils.dbamp(-17) * frequency * 20));

    opC.frequency.value = frequency * 13;
    opC.setEnvelope(Envelope.ads(0.25, 1.25, utils.dbamp(-5.4) * frequency * 20));

    this.fmsynth = new FMSynth(3, [ opA, opB, opC, 0 ]);
    this.fmsynth.onended = () => {
      this.emit("ended");
    };

    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.Q.value = 24;

    this.releaseNode = this.audioContext.createGain();

    this.fmsynth.connect(this.filter);
    this.filter.connect(this.releaseNode);

    this.outlet = this.releaseNode;
  }

  [NOTE_ON](t0) {
    this.fmsynth.start(t0);
    this.filter.frequency.setValueCurveAtTime(CUTOFF_VALUES, t0, 30);
    this.releaseNode.gain.setValueAtTime(this.volume, t0);
  }

  [NOTE_OFF](t1) {
    let t2 = t1 + 5.0;

    this.fmsynth.stop(t2);

    this.releaseNode.gain.setValueAtTime(this.volume, t1);
    this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
  }

  [DISPOSE]() {
    this.fmsynth.disconnect();
    this.fmsynth = this.releaseNode = null;
  }
}
