import EventEmitter from "@mohayonao/event-emitter";
import MIDIEffect from "./MIDIEffect";
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
}
