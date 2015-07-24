import EventEmitter from "@mohayonao/event-emitter";
import MIDIEffect from "./MIDIEffect";
import MIDIDelay from "./effects/MIDIDelay";
import MIDIDuplicate from "./effects/MIDIDuplicate";
import MIDIExtend from "./effects/MIDIExtend";
import MIDIFilter from "./effects/MIDIFilter";
import MIDIGate from "./effects/MIDIGate";
import MIDIMap from "./effects/MIDIMap";
import MIDISplit from "./effects/MIDISplit";
import MIDIStutter from "./effects/MIDIStutter";
import MIDITouch from "./effects/MIDITouch";
import config from "../config";

export default class Track extends EventEmitter {
  constructor(timeline) {
    super();

    this.timeline = timeline;
    this.ticksPerBeat = 480;
    this.tempo = 120;
    this.params = new Uint8Array(config.DEFAULT_PARAMS);
    this.output = {
      push: (data) => {
        this.emit("play", data);
      },
    };

    this._pipe = [];
  }

  setState({ ticksPerBeat, tempo, params }) {
    this.ticksPerBeat = ticksPerBeat;
    this.tempo = tempo;
    this.params = params;
  }

  push(data) {
    this._pipe.forEach((next) => {
      next.push(data);
    });
  }

  pipe(next) {
    let has = this._pipe.some((pipe) => {
      return pipe === next || pipe.$callback === next;
    });

    if (has) {
      return next;
    }

    if (typeof next === "function") {
      let callback = next;

      next = new MIDIEffect(this.timeline);
      next.process = (data, next) => {
        callback(data, next);
      };
      next.$callback = callback;
    }

    this._pipe.push(next);

    return next;
  }

  unpipe(next) {
    for (let i = 0; i < this._pipe.length; i++) {
      if (this._pipe[i] === next || this._pipe[i].$callback === next) {
        this._pipe.splice(i, 1);
        break;
      }
    }
    return next;
  }

  delay(interval = 1 / 8) {
    return new MIDIDelay(this.timeline, interval);
  }

  duplicate(count = 2) {
    return new MIDIDuplicate(this.timeline, count);
  }

  extend(extend = {}) {
    return new MIDIExtend(this.timeline, extend);
  }

  filter(callback) {
    return new MIDIFilter(this.timeline, callback);
  }

  gate(gate) {
    return new MIDIGate(this.timeline, gate);
  }

  map(callback) {
    return new MIDIMap(this.timeline, callback);
  }

  split(callback) {
    return new MIDISplit(this.timeline, callback);
  }

  stutter(interval = 1 / 2) {
    return new MIDIStutter(this.timeline, interval);
  }

  touch(callback) {
    return new MIDITouch(this.timeline, callback);
  }
}
