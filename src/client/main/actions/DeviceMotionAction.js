import fluxx from "@mohayonao/remote-fluxx";
import utils from "../utils";

export default class DeviceMotionAction extends fluxx.Action {
  constructor(...args) {
    super(...args);

    this.devicemotionEnabled = false;
    this._ondeviceorientation = utils.throttle(this._ondeviceorientation.bind(this), 200).bind(this);
  }

  ["/event/deviceorientation"]({ enabled }) {
    if (this.devicemotionEnabled === enabled) {
      return;
    }
    if (enabled) {
      window.addEventListener("deviceorientation", this._ondeviceorientation, false);
    } else {
      window.removeEventListener("deviceorientation", this._ondeviceorientation, false);
    }
    this.devicemotionEnabled = enabled;
  }

  _ondeviceorientation(event) {
    let { alpha, beta, gamma } = event;

    this.router.sendAction("/devicemotion/update/orientation", {
      alpha, beta, gamma,
    });
  }
}
