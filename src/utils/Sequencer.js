import EventEmitter from "@mohayonao/event-emitter";
import utils from "./";

export default class Sequencer extends EventEmitter {
  constructor(timeline, opts={}) {
    super();

    this.timeline = timeline;
    this.state = "suspended";

    this._events = utils.defaults(opts.events, []);
    this._tempo = utils.defaults(opts.tempo, 120);
    this._ticksPerBeat = utils.defaults(opts.ticksPerBeat, 120);
    this._interval = utils.defaults(opts.interval, 1);
    this._schedId = 0;
    this._index = 0;
    this._ticks = 0;
    this._process = this._process.bind(this);
  }

  get events() {
    return this._events;
  }

  set events(value) {
    this._events = value;
  }

  get tempo() {
    return this._tempo;
  }

  set tempo(value) {
    this._tempo = utils.constrain(value, 10, 1000);
  }

  get ticksPerBeat() {
    return this._ticksPerBeat;
  }

  set ticksPerBeat(value) {
    this._ticksPerBeat = utils.constrain(value, 15, 1920)|0;
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

  reset() {
    this._index = 0;
    this._ticks = 0;
  }

  _ticksToSeconds(ticks) {
    return (ticks / this._ticksPerBeat) * (60 / this._tempo);
  }

  _process({ playbackTime }) {
    let ticks = (this._tempo / 60) * this._ticksPerBeat * this._interval;
    let t0 = this._ticks;
    let t1 = t0 + ticks;
    let events = [];

    while (this._index < this._events.length) {
      let item = this._events[this._index];

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

    if (this._events.length <= this._index) {
      this._index = 0;
      this._ticks = 0;
    }

    this.emit("processed");

    this._schedId = this.timeline.insert(playbackTime + this._interval, this._process);
  }
}
