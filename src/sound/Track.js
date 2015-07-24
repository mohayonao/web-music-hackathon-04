import EventEmitter from "@mohayonao/event-emitter";
import config from "../config";
import utils from "./utils";

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
    utils.appendIfNotExists(this._pipe, next);
    return next;
  }

  unpipe(next) {
    utils.removeIfExists(this._pipe, next);
    return next;
  }
}
