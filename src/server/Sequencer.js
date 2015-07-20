import { Delegator } from "@mohayonao/dispatcher";
import utils from "./utils";
import config from "./config";

const INTERVAL = config.SEQUENCER_INTERVAL;
const TICKS_PER_BEAT = config.TICKS_PER_BEAT;

export default class Sequencer extends Delegator {
  constructor(router, score) {
    super();

    this.router = router;
    this.score = score;
    this.timeline = router.timeline;
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
    this._tempo = Math.max(10, Math.min(value, 1000));
  }

  start() {
    if (this.state === "running") {
      return;
    }
    this._schedId = this.timeline.insert(this.timeline.currentTime, this._process);
    this.state = "running";
    this.emit("statechange", this.state);
  }

  stop() {
    if (this.state === "suspended") {
      return;
    }
    this._index = 0;
    this._ticks = 0;
    this.timeline.remove(this._schedId);
    this.state = "suspended";
    this.emit("statechange", this.state);
  }

  _ticksToSeconds(ticks) {
    return utils.ticksToSeconds(ticks, this._tempo);
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
          dataType: "sequence",
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

    this.emit("processed");

    this._schedId = this.timeline.insert(playbackTime + INTERVAL, this._process);
  }
}
