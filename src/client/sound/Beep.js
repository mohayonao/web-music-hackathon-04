import Tone, { INITIALIZE, NOTE_ON, NOTE_OFF, DISPOSE } from "./Tone";
import utils from "../utils";

const DECAY_TIME = 0.05;
const RELEASE_TIME = 0.01;

export default class Beep extends Tone {
  [INITIALIZE]() {
    this.volume = 1;

    this.osc = this.audioContext.createOscillator();
    this.osc.frequency.value = utils.midicps((this.noteNumber % 12) + 60) * 8;
    this.osc.onended = () => {
      this.emit("ended");
    };

    this.releaseNode = this.audioContext.createGain();

    this.osc.connect(this.releaseNode);

    this.outlet = this.releaseNode;
  }

  [NOTE_ON](t0) {
    let t1 = t0 + DECAY_TIME;
    let t2 = t1 + RELEASE_TIME;

    this.osc.start(t0);
    this.osc.stop(t2);

    this.releaseNode.gain.setValueAtTime(this.volume, t0);
    this.releaseNode.gain.setValueAtTime(this.volume, t1);
    this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
  }

  [NOTE_OFF]() {}

  [DISPOSE]() {
    this.osc.disconnect();
    this.osc = this.releaseNode = null;
  }
}
