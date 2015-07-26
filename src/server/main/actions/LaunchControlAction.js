import fluxx from "@mohayonao/remote-fluxx";
import utils from "../utils";

export default class LaunchControlAction extends fluxx.Action {
  ["/launch-control/knob1"](data) {
    this.doneAction("/launch-control/knob1", data);
  }

  ["/launch-control/knob2"](data) {
    this.doneAction("/launch-control/knob2", data);
  }

  ["/launch-control/pad"](data) {
    this.doneAction("/launch-control/pad", data);
  }

  ["/launch-control/cursor"]({ direction }) {
    switch (direction) {
    case "up":
      this.doneAction("/sequencer/start");
      break;
    case "down":
      this.doneAction("/sequencer/stop");
      break;
    case "left":
      this.doneAction("/sequencer/change/tempo", { delta: -2 });
      break;
    case "right":
      this.doneAction("/sequencer/change/tempo", { delta: +2 });
      break;
    default:
      // do nothing
    }
  }

  ["/osc/launch-control"]({ args }) {
    let [ type, track, value ] = args;

    track = utils.constrain(track, 0, 7);
    value = utils.constrain(value, 0, 127);

    this.doneAction(`/launch-control/${type}`, { track, value });
  }
}
