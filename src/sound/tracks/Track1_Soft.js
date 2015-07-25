import Track from "../Track";
import utils from "./utils";

export default class Track1 extends Track {
  constructor(...args) {
    super(...args);

    this.pipe((data, next) => {
      let program = utils.sample([
        "FMPiano",
        "PlasticHarp",
        "PureVibes",
        "FMPiano",
        "PlasticHarp",
        "PureVibes",
        "FMPiano",
        "PlasticHarp",
        "PureVibes",
        "Beep",
      ]);

      next(utils.xtend(data, { program }));
    }).pipe(this.output);
  }
}
