import Track from "../Track";
import MIDISplitter from "../effects/MIDISplitter";
import MIDIFilter from "../effects/MIDIFilter";
import MIDIStutter from "../effects/MIDIStutter";
import MIDIExtend from "../effects/MIDIExtend";

export default class Track3 extends Track {
  constructor(...args) {
    super(...args);

    let splitter = new MIDISplitter(this.timeline, (data) => {
      return data.track;
    });

    this.pipe(splitter.channels[1]).pipe(new MIDIExtend(this.timeline, {
      program: "SweepPad",
    })).pipe(this.output);

    this.pipe(splitter.channels[2]).pipe(new MIDIFilter(this.timeline, (data) => {
      return this.ticksPerBeat <= data.ticks;
    })).pipe(new MIDIStutter(this.timeline, 1 / 2)).pipe(new MIDIExtend(this.timeline, {
      program: "ShadowString",
    })).pipe(this.output);
  }
}
