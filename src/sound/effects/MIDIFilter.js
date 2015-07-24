import MIDIEffect from "../MIDIEffect";

export default class MIDIFilter extends MIDIEffect {
  constructor(timeline, filter) {
    super(timeline);

    this.timeline = timeline;
    this.filter = filter;
  }

  process(data, next) {
    if (this.filter(data)) {
      next(data);
    }
  }
}
