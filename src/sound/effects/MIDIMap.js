import MIDIEffect from "../MIDIEffect";

export default class MIDIMap extends MIDIEffect {
  constructor(timeline, callback) {
    super(timeline);

    this.timeline = timeline;
    this.callback = callback;
  }

  process(data, next) {
    let result = this.callback(data);

    if (!result || typeof result !== "object") {
      return;
    }

    next(result);
  }
}
