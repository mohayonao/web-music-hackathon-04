import Track from "../Track";
import utils from "./utils";

export default class Track5 extends Track {
  constructor(...args) {
    super(...args);

    this.delayNode = this.delay(1 / 8);

    this.pipe(this.delayNode).pipe(this.extend({
      program: "DelayTone",
    })).pipe(this.output);
  }

  setState(...args) {
    super.setState(...args);

    this.delayNode.feedback = utils.linlin(this.params[5], 0, 127, 0, 0.95);
  }
}
