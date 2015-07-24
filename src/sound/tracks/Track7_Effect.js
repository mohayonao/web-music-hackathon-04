import Track from "../Track";
import utils from "./utils";

export default class Track7 extends Track {
  constructor(...args) {
    super(...args);

    this.pipe((data, next) => {
      if (Math.random() < 0.8) {
        return;
      }

      let program = utils.sample([
        "TwinklePad",
      ]);

      next(utils.xtend(data, { program }));
    }).pipe(this.output);
  }
}
