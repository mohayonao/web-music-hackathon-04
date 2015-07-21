import Action from "./Action";

export default class LaunchControlAction extends Action {
  ["/launch-control"](data) {
    this.router.executeAction(`/launch-control/${data.dataType}`, data);
  }

  ["/launch-control/knob/active"](data) {
    this.router.executeAction("/launch-control/knob/active", data);
  }

  ["/launch-control/knob/update"](data) {
    this.router.executeAction("/launch-control/knob/update", data);
  }

  ["/launch-control/knob/deactive"](data) {
    this.router.executeAction("/launch-control/knob/deactive", data);
  }
}
