import Track from "../Track";
import xtend from "xtend";
import MIDISplitter from "../effects/MIDISplitter";
import MIDIGate from "../effects/MIDIGate";
import MIDIFilter from "../effects/MIDIFilter";
import MIDIMap from "../effects/MIDIMap";

export default class IkedaTrack extends Track {
  constructor(...args) {
    super(...args);

    this.splitter = new MIDISplitter(this.timeline, 1 / 12);
    this.gate = new MIDIGate(this.timeline, 2 / 3);
    this.filter = new MIDIFilter(this.timeline, () => Math.random() < 0.25);
    this.map = new MIDIMap(this.timeline, data => xtend(data, {
      noteNumber: (data.noteNumber % 36) + 96,
      program: "SineTone",
    }));

    this.pipe(this.splitter).pipe(this.gate).pipe(this.filter).pipe(this.map).pipe(this.output);
  }

  setState(...args) {
    super.setState(...args);

    this.splitter.ticksPerBeat = this.ticksPerBeat;
    this.splitter.tempo = this.tempo;
  }
}
