import Track from "../Track";
import xtend from "xtend";
import utils from "../utils";

export default class Track6 extends Track {
  constructor(...args) {
    super(...args);

    this.pipe((data, next) => {
      if (data.track !== 2) {
        return;
      }

      let program = utils.wsample([
        "WindMachine",
        "DecayNoise",
        "ImpulseNoise",
        "SAHFilteredNoise",
      ]);

      next(xtend(data, { program }));
    }).pipe(this.output);
  }
}
