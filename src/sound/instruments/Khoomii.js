import Instrument, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "../Instrument";
import Envelope from "@mohayonao/envelope";
// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";
import utils from "./utils";

const RELEASE_TIME = 0.025;
const GAIN_UP = 1;

const FORMANT_PARAMS = {
  a: [ 700, 1200, 2900 ],
  i: [ 300, 2700, 2700 ],
  u: [ 390, 1200, 2500 ],
  e: [ 450, 1750, 2750 ],
  o: [ 460, 880, 2800 ],
};

export default class Template extends Instrument {
  [INITIALIZE]() {}

  [CREATE]() {
    let koe = utils.wrapAt([ "a", "i", "u", "e", "o" ], this.noteNumber);
    let frequency = utils.midicps(this.noteNumber);
    let formants = FORMANT_PARAMS[koe];

    this.voice1 = this.audioContext.createOscillator();
    this.voice1.type = "sawtooth";
    this.voice1.frequency.value = frequency * 0.5;
    this.voice1.detune.value = utils.findet(-1);
    this.voice1.onended = () => {
      this.emit("ended");
    };

    this.voice2 = this.audioContext.createOscillator();
    this.voice2.type = "sawtooth";
    this.voice2.frequency.value = frequency * 0.5;
    this.voice1.detune.value = utils.findet(+1);

    this.bpf1 = this.audioContext.createBiquadFilter();
    this.bpf1.type = "bandpass";
    this.bpf1.frequency.value = formants[0];
    this.bpf1.Q.value = 24;

    this.bpf2 = this.audioContext.createBiquadFilter();
    this.bpf2.type = "bandpass";
    this.bpf2.frequency.value = formants[1];
    this.bpf2.Q.value = 24;

    this.bpf3 = this.audioContext.createBiquadFilter();
    this.bpf3.type = "bandpass";
    this.bpf3.frequency.value = formants[2];
    this.bpf3.Q.value = 24;

    this.band = this.audioContext.createBiquadFilter();
    this.band.type = "bandpass";
    this.band.frequency.value = frequency * 2;
    this.band.Q.value = 0.45;

    this.gain = this.audioContext.createGain();
    this.releaseNode = this.audioContext.createGain();

    this.voice1.connect(this.bpf1);
    this.voice1.connect(this.bpf2);
    this.voice1.connect(this.bpf3);
    this.voice2.connect(this.bpf1);
    this.voice2.connect(this.bpf2);
    this.voice2.connect(this.bpf3);
    this.bpf1.connect(this.band);
    this.bpf2.connect(this.band);
    this.bpf3.connect(this.band);
    this.band.connect(this.gain);
    this.gain.connect(this.releaseNode);

    this.outlet = this.releaseNode;
  }

  [NOTE_ON](t0) {
    this.voice1.start(t0);
    this.voice2.start(t0);

    Envelope.ads(0.125, 10.2, utils.dbamp(-24)).applyTo(this.gain.gain, t0);

    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
  }

  [NOTE_OFF](t1) {
    let t2 = t1 + RELEASE_TIME;

    this.voice1.stop(t2);
    this.voice2.stop(t2);

    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
    this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
  }

  [DISPOSE]() {
    this.voice1.disconnect();
    this.voice2.disconnect();
    this.bpf1.disconnect();
    this.bpf2.disconnect();
    this.bpf3.disconnect();
    this.band.disconnect();
    this.gain.disconnect();
    this.voice1 = this.voice2 = this.bpf1 = this.bpf2 = this.bpf3 = null;
    this.band = this.gain = null;
  }
}
