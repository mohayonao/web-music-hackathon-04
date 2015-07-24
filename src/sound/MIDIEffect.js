import utils from "./utils";

export default class MIDIEffect {
  constructor(timeline) {
    this.timeline = timeline;
    this._pipe = [];
  }

  push(data) {
    this.process(data, (data) => {
      this._pipe.forEach((next) => {
        next.push(data);
      });
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

  process() {}
}
