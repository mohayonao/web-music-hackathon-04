import Track from "../Track";
// import utils from "./utils";

export default class Track0 extends Track {
  constructor(...args) {
    super(...args);

    this.pipe(this.extend({
      program: "SimpleSine",
    })).pipe(this.output);
  }
}
