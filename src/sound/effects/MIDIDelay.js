import EventEmitter from "@mohayonao/event-emitter";
import xtend from "xtend";

export default class MIDIDelay extends EventEmitter {
  constructor(timeline, interval) {
    super();

    this.timeline = timeline;
    this.feedback = 0;
    this.ticksPerBeat = 480;
    this.tempo = 120;
    this.interval = interval;
  }

  push(data) {
    this._process(xtend(data, { gain: 1 }));
  }

  _ticksToSeconds(ticks) {
    return (ticks / 120) * (60 / this.tempo);
  }

  _process(data) {
    this.emit("play", data);

    let delayTime = this._ticksToSeconds(this.ticksPerBeat * this.interval);

    this.timeline.insert(data.playbackTime + delayTime, ({ playbackTime }) => {
      let gain = data.gain * this.feedback;

      if (0.05 <= gain) {
        this._process(xtend(data, { playbackTime, gain }));
      }
    });
  }
}
