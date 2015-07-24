import Track from "../Track";
import xtend from "xtend";
import MIDIMap from "../effects/MIDIMap";

export default class Track0 extends Track {
  constructor(...args) {
    super(...args);

    this.pipe(new MIDIMap(this.timeline, data => xtend(data, {
      program: "SimpleSine",
    }))).pipe(this.output);
  }
}
