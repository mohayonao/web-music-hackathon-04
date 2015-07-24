import MIDIEffect from "../MIDIEffect";

export default class MIDIMap extends MIDIEffect {
  constructor(timeline, map) {
    super(timeline);

    this.timeline = timeline;
    this.map = map;
  }

  process(data, next) {
    let result = this.map(data);

    if (!result || typeof result !== "object") {
      return;
    }

    next(result);
  }
}
