import Envelope from "@mohayonao/envelope";
import Tone, { INITIALIZE, NOTE_ON, NOTE_OFF, DISPOSE } from "./Tone";
import WebAudioUtils from "../WebAudioUtils";
import utils from "../utils";

let NOISE = null;

export default class WindMachine extends Tone {
  [INITIALIZE]() {
    if (NOISE === null) {
      NOISE = WebAudioUtils.createWhiteNoise();
    }

    this.bufSrc = this.audioContext.createBufferSource();
    this.bufSrc.buffer = NOISE;
    this.bufSrc.loop = true;
    this.bufSrc.onended = () => {
      this.emit("ended");
    };

    this.filter1 = this.audioContext.createBiquadFilter();
    this.filter1.type = "lowpass";
    this.filter1.frequency.value = 80;
    this.filter1.Q.value = 8;

    this.filter2 = this.audioContext.createBiquadFilter();
    this.filter1.type = "bandpass";
    this.filter2.frequency.value = utils.midicps(this.noteNumber);
    this.filter2.Q.value = 24;

    this.filter3 = this.audioContext.createBiquadFilter();
    this.filter1.type = "highpass";
    this.filter3.frequency.value = utils.midicps(this.noteNumber) * 11;
    this.filter3.Q.value = 12.5;

    this.filter4 = this.audioContext.createBiquadFilter();

    this.gain = this.audioContext.createGain();

    this.bufSrc.connect(this.filter1);
    this.bufSrc.connect(this.filter2);
    this.bufSrc.connect(this.filter3);
    this.filter1.connect(this.filter4);
    this.filter2.connect(this.filter4);
    this.filter3.connect(this.filter4);
    this.filter4.connect(this.gain);

    this.outlet = this.gain;
  }

  [NOTE_ON](t0) {
    this.bufSrc.start(t0);

    new Envelope([
      [ 0, 80 ],
      [ 2.5, 2400 ],
      [ 5.0, 8000 ],
      [ 7.5, 1200 ],
    ]).applyTo(this.filter4.frequency, t0);

    this.filter4.Q.setValueAtTime(2, t0);
    this.gain.gain.setValueAtTime(0.1, t0);
  }

  [NOTE_OFF](t1) {
    let t2 = t1 + 2.5;

    this.bufSrc.stop(t2);

    this.filter4.Q.setValueAtTime(12, t1);

    this.gain.gain.setValueAtTime(0.1, t1);
    this.gain.gain.exponentialRampToValueAtTime(1e-3, t2);
  }

  [DISPOSE]() {
    this.bufSrc.disconnect();
    this.filter1.disconnect();
    this.filter2.disconnect();
    this.filter3.disconnect();
    this.filter4.disconnect();
    this.bufSrc = this.filter1 = this.filter2 = this.filter3 = this.filter4 = this.gain = null;
  }
}
