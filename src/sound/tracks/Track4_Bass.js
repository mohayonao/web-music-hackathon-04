import Track from "../Track";
import xtend from "xtend";
import utils from "../utils";

export default class Track4 extends Track {
  constructor(...args) {
    super(...args);

    this.pipe((data, next) => {
      if (data.track !== 2) {
        return;
      }

      let program = utils.sample([
        "AnalogBass",
        "FMBass",
      ]);

      next(xtend(data, { program }));
    }).pipe(this.output);
  }
}
