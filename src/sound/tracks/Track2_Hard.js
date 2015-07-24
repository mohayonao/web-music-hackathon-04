import Track from "../Track";
import utils from "./utils";

export default class Track2 extends Track {
  constructor(...args) {
    super(...args);

    this.pipe((data, next) => {
      let program = utils.sample([
        "Distorted",
        "SquareLead",
      ]);

      next(utils.xtend(data, { program }));
    }).pipe(this.output);
  }
}
