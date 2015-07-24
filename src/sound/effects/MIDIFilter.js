import MIDIEffect from "../MIDIEffect";

export default class MIDIFilter extends MIDIEffect {
  constructor(timeline, callback) {
    super(timeline);

    this.timeline = timeline;
    this.callback = callback;
  }

  process(data, next) {
    if (this.callback(data)) {
      next(data);
    }
  }
}
