import MIDIEffect from "../MIDIEffect";
// import utils from "./utils";

export default class MIDIMap extends MIDIEffect {
  constructor(timeline, callback) {
    super(timeline);

    this.timeline = timeline;
    this.callback = callback;
  }

  process(data, next) {
    this.callback(data);
    next(data);
  }
}
