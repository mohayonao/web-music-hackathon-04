import MIDIEffect from "../MIDIEffect";
import xtend from "xtend";

export default class MIDIGate extends MIDIEffect {
  constructor(timeline, gate) {
    super(timeline);

    this.timeline = timeline;
    this.gate = gate;
  }

  process(data, next) {
    if (typeof data.ticks !== "number") {
      return next(data);
    }

    let ticks = data.ticks * this.gate;
    let duration = data.duration * this.gate;

    next(xtend(data, { ticks, duration }));
  }
}
