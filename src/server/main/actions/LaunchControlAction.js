import fluxx from "@mohayonao/remote-fluxx";

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

  ["/launch-control/cursor"](data) {
    this.doneAction("/launch-control/cursor", data);
  }
}
