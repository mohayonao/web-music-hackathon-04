import xtend from "xtend";
import utils from "./utils";

export default class MIDIDelay {
  constructor(router, delayTicks) {
    this.router = router;
    this.delayTicks = delayTicks;
    this.timeline = router.timeline;
    this.feedback = 0;
    this.clientIndex = 0;

    this.router.on("changeparam", (params) => {
      this.feedback = utils.linlin(params[7], 0, 127, 0, 0.995);
    });
  }

  push(data) {
    this._process(xtend(data, { velocity: 80, program: 0, clientIndex: this.clientIndex++ }));
  }

  _process(data) {
    let client = utils.wrapAt(this.router.shared.enabledClients, data.clientIndex++);

    if (!client) {
      return;
    }

    client.$pendings.push(data);

    let delay = utils.ticksToSeconds(this.delayTicks, this.router.shared.tempo);

    this.timeline.insert(data.playbackTime + delay, ({ playbackTime }) => {
      let velocity = (data.velocity * this.feedback)|0;

      if (velocity !== 0) {
        this._process(xtend(data, { playbackTime, velocity }));
      }
    });
  }
}
