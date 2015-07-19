import Operator from "@mohayonao/operator";
import FMSynth from "@mohayonao/fm-synth";
import Envelope from "@mohayonao/envelope";
import Tone, { INITIALIZE, NOTE_ON, NOTE_OFF, DISPOSE } from "./Tone";
import utils from "../utils";
import WebAudioUtils from "../WebAudioUtils";

const RELEASE_TIME = 2.5;

export default class SweepPad extends Tone {
  [INITIALIZE]() {
    this.volume = utils.linexp(this.velocity, 0, 127, 0.25, 1);

    let frequency = utils.midicps(this.noteNumber);
    let opA = new Operator(this.audioContext);
    let opB = new Operator(this.audioContext);
    let opC = new Operator(this.audioContext);
    let opD = new Operator(this.audioContext);

    opA.setPeriodicWave(WebAudioUtils.createColoredWave([
      1.000, 0.022, 0.208, 0.000, 0.073,
    ]));
    opA.frequency.value = frequency;
    opA.setEnvelope(Envelope.a(2.4, 0.25));

    opB.setPeriodicWave(WebAudioUtils.createColoredWave([
      0.086, 0.154, 0.043, 0.000, 0.510,
    ]));
    opB.frequency.value = frequency;
    opB.detune.value = utils.finedetune(3);
    opB.setEnvelope(Envelope.ads(0.01, 1.50, utils.dbamp(-14) * frequency * 50));

    opC.setPeriodicWave(WebAudioUtils.createColoredWave([
      1.000, 0.022, 0.208, 0.000, 0.073,
    ]));
    opC.frequency.value = frequency;
    opC.setEnvelope(Envelope.a(2.4, 0.25));

    opD.setPeriodicWave(WebAudioUtils.createColoredWave([
      0.086, 0.154, 0.043, 0.000, 0.510,
    ]));
    opD.frequency.value = frequency;
    opD.detune.value = utils.finedetune(-7);
    opD.setEnvelope(Envelope.ads(0.01, 1.50, utils.dbamp(-14) * frequency * 50));

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
    this.releaseNode.gain.setValueAtTime(this.volume, t0);
  }

  [NOTE_OFF](t1) {
    let t2 = t1 + RELEASE_TIME;

    this.fmsynth.stop(t2);

    this.releaseNode.gain.setValueAtTime(this.volume, t1);
    this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
  }

  [DISPOSE]() {
    this.fmsynth.disconnect();
    this.fmsynth = this.releaseNode = null;
  }
}
