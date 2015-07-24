import MIDIEffect from "../MIDIEffect";
import utils from "./utils";

export default class MIDIDelay extends MIDIEffect {
  constructor(timeline, interval) {
    super(timeline);

    this.timeline = timeline;
    this.feedback = 0;
    this.ticksPerBeat = 480;
    this.tempo = 120;
    this.interval = interval;
  }

  _ticksToSeconds(ticks) {
    return (ticks / this.ticksPerBeat) * (60 / this.tempo);
  }

  process(data, next) {
    data.gain = utils.defaults(data.gain, 1);

    next(data);

    let delayTime = this._ticksToSeconds(this.ticksPerBeat * this.interval);

    this.timeline.insert(data.playbackTime + delayTime, ({ playbackTime }) => {
      let gain = data.gain * this.feedback;

      if (0.05 <= gain) {
        this.process(utils.xtend(data, { playbackTime, gain }), next);
      }
    });
  }
}
