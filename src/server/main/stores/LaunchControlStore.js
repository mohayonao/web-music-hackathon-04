import fluxx from "@mohayonao/remote-fluxx";
import config from "../config";

export default class LaunchControlStore extends fluxx.Store {
  getInitialState() {
    return {
      deviceName: "",
      params: new Uint8Array(config.DEFAULT_PARAMS),
    };
  }

  ["/midi-device/connect/launch-control"]({ deviceName }) {
    this.data.deviceName = deviceName;
    this.emitChange();
  }

  ["/launch-control/pad"]({ track }) {
    this.data.params[track + 16] = 1 - this.data.params[track + 16];
    this.emitChange();
  }

  ["/launch-control/knob1"]({ track, value }) {
    this.data.params[track] = value;
    this.emitChange();
  }

  ["/launch-control/knob2"]({ track, value }) {
    this.data.params[track + 8] = value;
    this.emitChange();
  }
}
