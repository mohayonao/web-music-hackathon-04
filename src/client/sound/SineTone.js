import Envelope from "@mohayonao/envelope";
import Tone, { INITIALIZE, NOTE_ON, NOTE_OFF, DISPOSE } from "./Tone";
import utils from "../utils";

const [ A, D, S, R ] = [ 0.01, 0.1, 0.15, 0.2 ];

export default class SineTone extends Tone {
  [INITIALIZE]() {
    this.volume = utils.linexp(this.velocity, 0, 127, 1e-3, 1);
    this.envelope = Envelope.ads(A, D, S);

    this.osc1 = this.audioContext.createOscillator();
    this.osc1.frequency.value = utils.midicps(this.noteNumber);
    this.osc1.onended = () => {
      this.emit("ended");
    };

    this.gain = this.audioContext.createGain();
    this.releaseNode = this.audioContext.createGain();

    this.outlet = this.releaseNode;
  }

  [NOTE_ON](t0) {
    this.startTime = t0;
    this.osc1.start(t0);

    this.envelope.applyTo(this.gain.gain, t0);
    this.releaseNode.gain.setValueAtTime(this.volume, t0);

    this.osc1.connect(this.gain);
    this.gain.connect(this.releaseNode);
  }

  [NOTE_OFF](t0) {
    let t1 = t0 + R;

    this.osc1.stop(t1);

    this.releaseNode.gain.setValueAtTime(this.volume, t0);
    this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t1);
  }

  [DISPOSE]() {
    this.osc1.disconnect();
    this.osc1 = this.gain = this.releaseNode = null;
  }
}
