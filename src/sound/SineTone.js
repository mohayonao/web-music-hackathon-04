import Tone, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "./Tone";
import utils from "../utils";

const RELEASE_TIME = 0.025;
const GAIN_UP = 1;

export default class SineTone extends Tone {
  [INITIALIZE]() {}

  [CREATE]() {
    let frequency = utils.midicps(this.noteNumber);

    this.osc1 = this.audioContext.createOscillator();
    this.osc1.frequency.value = frequency;

    this.osc2 = this.audioContext.createOscillator();
    this.osc2.frequency.value = frequency;

    this.osc1.onended = () => {
      this.emit("ended");
    };

    this.releaseNode = this.audioContext.createGain();

    this.osc1.connect(this.releaseNode);
    this.osc2.connect(this.releaseNode);

    this.outlet = this.releaseNode;
  }

  [NOTE_ON](t0) {
    this.osc1.start(t0);
    this.osc2.start(t0);

    this.osc1.detune.setValueAtTime(utils.finedetune(+10), t0);
    this.osc1.detune.linearRampToValueAtTime(0, t0 + 4);

    this.osc2.detune.setValueAtTime(utils.finedetune(-10), t0);
    this.osc2.detune.linearRampToValueAtTime(0, t0 + 4);

    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
  }

  [NOTE_OFF](t1) {
    let t2 = t1 + RELEASE_TIME;

    this.osc1.stop(t2);
    this.osc2.stop(t2);

    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
    this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
  }

  [DISPOSE]() {
    this.osc1.disconnect();
    this.osc2.disconnect();
    this.osc1 = this.osc2 = this.releaseNode = null;
  }
}
