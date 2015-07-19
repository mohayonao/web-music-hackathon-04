import { Delegator } from "@mohayonao/dispatcher";

const INTERVAL = 1;
const TICKS_PER_BEAT = 120;

export default class Sequencer extends Delegator {
  constructor(score, timeline) {
    super();

    this.score = score;
    this.timeline = timeline;
    this.state = "suspended";

    this._schedId = 0;
    this._index = 0;
    this._ticks = 0;
    this._tempo = 60;
    this._process = this._process.bind(this);
  }

  get tempo() {
    return this._tempo;
  }

  set tempo(value) {
    this._tempo = value;
  }

  start() {
    if (this.state === "running") {
      return;
    }
    this._schedId = this.timeline.insert(this.timeline.currentTime, this._process);
    this.state = "running";
  }

  stop() {
    if (this.state === "suspended") {
      return;
    }
    this.timeline.remove(this._schedId);
    this.state = "suspended";
  }

  _ticksToSeconds(ticks) {
    return (ticks / TICKS_PER_BEAT) * (60 / this._tempo);
  }

  _process({ playbackTime }) {
    let ticks = Math.round((this._tempo / 60) * TICKS_PER_BEAT);
    let t0 = this._ticks;
    let t1 = t0 + ticks;
    let events = [];

    while (this._index < this.score.length) {
      let item = this.score[this._index];

      if (t1 <= item.time) {
        break;
      }

      events.push(item);

      this._index += 1;
    }

    if (events.length) {
      this.emit("play", events.map((item) => {
        return {
          dataType: "noteOn",
          playbackTime: playbackTime + this._ticksToSeconds(item.time - t0),
          track: item.track,
          noteNumber: item.noteNumber,
          velocity: item.velocity,
          duration: this._ticksToSeconds(item.duration),
        };
      }));
    }

    this._ticks = t1;

    if (this.score.length <= this._index) {
      this._index = 0;
      this._ticks = 0;
    }

    this._schedId = this.timeline.insert(playbackTime + INTERVAL, this._process);
  }
}
