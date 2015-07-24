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

  process(data, next) {
    next(data);
  }
}
