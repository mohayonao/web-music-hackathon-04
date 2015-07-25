import MIDIEffect from "../MIDIEffect";
import utils from "./utils";

export default class MIDIExtend extends MIDIEffect {
  constructor(timeline, extend) {
    super(timeline);

    this.timeline = timeline;
    this.extend = extend;
  }

  process(data, next) {
    next(utils.xtend(data, this.extend));
  }
}
