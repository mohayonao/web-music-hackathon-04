import MIDIEffect from "../MIDIEffect";
import xtend from "xtend";

export default class MIDIExtend extends MIDIEffect {
  constructor(timeline, extend) {
    super(timeline);

    this.timeline = timeline;
    this.extend = extend;
  }

  process(data, next) {
    next(xtend(data, this.extend));
  }
}
