import Track from "../Track";
import utils from "./utils";

export default class IkedaTrack extends Track {
  constructor(...args) {
    super(...args);

    this.stutterNode = this.stutter(1 / 12);
    this.gateNode = this.gate(2 / 3);
    this.filterNode = this.filter(() => Math.random() < 0.25);
    this.mapNode = this.map((data) => {
      return utils.xtend(data, {
        noteNumber: (data.noteNumber % 36) + 96,
        program: "SineTone",
      });
    });

    this.pipe(this.stutterNode).pipe(this.gateNode).pipe(this.filterNode).pipe(this.mapNode).pipe(this.output);
  }

  setState(...args) {
    super.setState(...args);

    this.stutterNode.ticksPerBeat = this.ticksPerBeat;
    this.stutterNode.tempo = this.tempo;
  }
}
