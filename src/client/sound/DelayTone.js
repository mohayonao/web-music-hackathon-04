import Tone, { INITIALIZE, NOTE_ON, NOTE_OFF, DISPOSE } from "./Tone";
import utils from "../utils";

const RELEASE_TIME = 0.025;

export default class DelayTone extends Tone {
  [INITIALIZE]() {
    this.volume = utils.linexp(this.velocity, 0, 127, 1e-3, 0.75);

    let frequency = utils.midicps(this.noteNumber);

    this.osc1 = this.audioContext.createOscillator();
    this.osc1.type = "triangle";
    this.osc1.frequency.value = frequency * 2;
    this.osc1.detune.value = utils.finedetune(+4);

    this.osc2 = this.audioContext.createOscillator();
    this.osc2.type = "triangle";
    this.osc2.frequency.value = frequency * 2;
    this.osc2.detune.value = utils.finedetune(-4);

    this.osc1.onended = () => {
      this.emit("ended");
    };

    this.gain = this.audioContext.createGain();
    this.releaseNode = this.audioContext.createGain();

    this.osc1.connect(this.gain);
    this.osc2.connect(this.gain);
    this.gain.connect(this.releaseNode);

    this.outlet = this.releaseNode;
  }

  [NOTE_ON](t0) {
    this.osc1.start(t0);
    this.osc2.start(t0);

    this.gain.gain.setValueAtTime(1, t0);
    this.gain.gain.exponentialRampToValueAtTime(1e-3, t0 + 1.5);

    this.releaseNode.gain.setValueAtTime(this.volume, t0);
  }

  [NOTE_OFF](t1) {
    let t2 = t1 + RELEASE_TIME;

    this.osc1.stop(t2);
    this.osc2.stop(t2);

    this.releaseNode.gain.setValueAtTime(this.volume, t1);
    this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
  }

  [DISPOSE]() {
    this.osc1.disconnect();
    this.osc2.disconnect();
    this.gain.disconnect();
    this.osc1 = this.osc2 = this.gain = this.releaseNode = null;
  }
}
