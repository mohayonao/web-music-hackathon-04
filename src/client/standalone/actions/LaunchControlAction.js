import fluxx from "@mohayonao/remote-fluxx";

export default class LaunchControlAction extends fluxx.Action {
  ["/launch-control"](data) {
    this.doneAction(`/launch-control/${data.dataType}`, data);
  }

  ["/launch-control/knob/active"](data) {
    this.doneAction("/launch-control/knob/active", data);
  }

  ["/launch-control/knob/update"](data) {
    this.doneAction("/launch-control/knob/update", data);
  }

  ["/launch-control/knob/deactive"](data) {
    this.doneAction("/launch-control/knob/deactive", data);
  }

  ["/launch-control/params/update"](data) {
    this.doneAction("/launch-control/params/update", data);
  }
}
