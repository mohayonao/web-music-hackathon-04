import MIDIEffect from "../MIDIEffect";

export default class MIDIMap extends MIDIEffect {
  constructor(timeline, touch) {
    super(timeline);

    this.timeline = timeline;
    this.touch = touch;
  }

  process(data, next) {
    this.touch(data);
    next(data);
  }
}
