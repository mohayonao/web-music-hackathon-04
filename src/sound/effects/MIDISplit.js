import MIDIEffect from "../MIDIEffect";
// import utils from "./utils";

export default class MIDISplit extends MIDIEffect {
  constructor(timeline, callback) {
    super(timeline);

    this.timeline = timeline;
    this.callback = callback;
    this.channels = new Array(8);

    for (let i = 0; i < this.channels.length; i++) {
      this.channels[i] = new MIDIEffect(this.timeline);
    }
  }

  process(data) {
    let channel = this.callback(data);

    if (this.channels[channel]) {
      this.channels[channel].push(data);
    }
  }
}
