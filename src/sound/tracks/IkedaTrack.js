import Track from "../Track";
import xtend from "xtend";

export default class IkedaTrack extends Track {
  constructor(...args) {
    super(...args);

    this.stutter = this.stutter(1 / 12);
    this.gate = this.gate(2 / 3);
    this.filter = this.filter(() => Math.random() < 0.25);
    this.map = this.map((data) => {
      return xtend(data, {
        noteNumber: (data.noteNumber % 36) + 96,
        program: "SineTone",
      });
    });

    this.pipe(this.stutter).pipe(this.gate).pipe(this.filter).pipe(this.map).pipe(this.output);
  }

  setState(...args) {
    super.setState(...args);

    this.stutter.ticksPerBeat = this.ticksPerBeat;
    this.stutter.tempo = this.tempo;
  }
}
