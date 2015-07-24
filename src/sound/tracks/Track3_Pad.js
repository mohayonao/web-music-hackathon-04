import Track from "../Track";
// import utils from "./utils";

export default class Track3 extends Track {
  constructor(...args) {
    super(...args);

    let splitter = this.split((data) => {
      return data.track;
    });

    this.pipe(splitter.channels[1]).pipe(this.extend({
      program: "SweepPad",
    })).pipe(this.output);

    this.pipe(splitter.channels[2]).pipe(this.filter((data) => {
      return this.ticksPerBeat <= data.ticks;
    })).pipe(this.stutter(1 / 2)).pipe(this.extend({
      program: "ShadowString",
    })).pipe(this.output);
  }
}
