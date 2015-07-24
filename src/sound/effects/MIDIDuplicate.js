import MIDIEffect from "../MIDIEffect";
import xtend from "xtend";

export default class MIDIDuplicate extends MIDIEffect {
  constructor(timeline, count) {
    super(timeline);

    this.timeline = timeline;
    this.count = count;
  }

  process(data, next) {
    for (let i = 0, imax = this.count; i < imax; i++) {
      next(xtend(data));
    }
  }
}
