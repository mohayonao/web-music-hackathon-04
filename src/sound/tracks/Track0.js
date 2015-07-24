import xtend from "xtend";
import Track, { PROCESS, UPDATE_STATE } from "../Track";
import utils from "../utils";
import MIDIDelay from "../effects/MIDIDelay";

export default class Track0 extends Track {
  constructor(...args) {
    super(...args);

    this.delay = new MIDIDelay(this.timeline, 1 / 12).on("play", (data) => {
      this.emit("play", data);
    });
  }

  [UPDATE_STATE]({ ticksPerBeat, tempo, params }) {
    this.delay.ticksPerBeat = ticksPerBeat;
    this.delay.tempo = tempo;
    this.delay.feedback = utils.linlin(params[0], 0, 127, 0, 0.95);
  }

  [PROCESS](data) {
    this.delay.push(xtend(data, {
      program: "DelayTone",
    }));
  }
}
