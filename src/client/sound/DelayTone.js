import Envelope from "@mohayonao/envelope";
import Tone, { INITIALIZE, NOTE_ON, NOTE_OFF, DISPOSE } from "./Tone";
import WebAudioUtils from "../WebAudioUtils";
import utils from "../utils";

const ATTACK_TIME = 0.005;
const DECAY_TIME = 0.005;
const SUSTAIN_LEVEL = 0.75;
const SUSTAIN_TIME = 0.050;
let WAVE = null;

export default class DelayTone extends Tone {
  static getEnabledParams() {
    return [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 1,
    ];
  }

  [INITIALIZE]() {
    if (WAVE === null) {
      WAVE = WebAudioUtils.createColoredWave([ 1, 0, 0.125 ]);
    }

    this.duration = ATTACK_TIME + DECAY_TIME + SUSTAIN_TIME;
    this.volume = utils.linlin(this.velocity, 0, 127, 0, 0.85);

    let frequency = utils.midicps(this.noteNumber);

    this.osc = this.audioContext.createOscillator();
    this.osc.setPeriodicWave(WAVE);
    this.osc.frequency.value = frequency;
    this.osc.detune.value = utils.finedetune(+4);
    this.osc.onended = () => {
      this.emit("ended");
    };

    this.releaseNode = this.audioContext.createGain();

    this.osc.connect(this.releaseNode);

    this.outlet = this.releaseNode;
  }

  [NOTE_ON](t0) {
    this.osc.start(t0);

    Envelope.ads(
      ATTACK_TIME, DECAY_TIME, SUSTAIN_LEVEL, this.volume * 0.5
    ).applyTo(this.releaseNode.gain, t0);
  }

  [NOTE_OFF](t1) {
    let t2 = t1 + utils.linlin(this.params[15], 0, 127, 0.1, 4);

    this.osc.stop(t2);

    this.releaseNode.gain.setValueAtTime(this.volume * 0.5, t1);
    this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
  }

  [DISPOSE]() {
    this.osc.disconnect();
    this.osc = this.releaseNode = null;
  }
}
