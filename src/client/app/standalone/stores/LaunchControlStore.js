import Store from "./Store";
import config from "../config";

export default class LaunchControlStore extends Store {
  getInitialState() {
    return {
      deviceName: "",
      connectedDeviceName: "",
      controllers: [],
      params: new Uint8Array(config.DEFAULT_PARAMS),
      activeKnob: -1,
      activePad: new Uint8Array(8),
    };
  }

  _changeParams(index, value) {
    if (this.data.params[index] === value) {
      return;
    }

    this.data.params[index] = value;

    this.emitChange();
    this.router.changeParams(this.data.params);
  }

  ["/launch-control/pad"]({ track }) {
    track = Math.max(0, Math.min(track, 7));

    this.data.activePad[track] = 1 - this.data.activePad[track];
    this.emitChange();
  }

  ["/launch-control/knob1"]({ track, value }) {
    track = Math.max(0, Math.min(track, 7));
    value = Math.max(0, Math.min(value, 127));

    this._changeParams(track, value);
  }

  ["/launch-control/knob2"]({ track, value }) {
    track = Math.max(0, Math.min(track, 7));
    value = Math.max(0, Math.min(value, 127));

    this._changeParams(track + 8, value);
  }

  ["/launch-control/knob/active"]({ track, index }) {
    this.data.activeKnob = track + index * 8;
    this.emitChange();
  }

  ["/launch-control/knob/update"]({ delta }) {
    if (this.data.activeKnob === -1) {
      return;
    }

    let oldValue = this.data.params[this.data.activeKnob];
    let newValue = Math.max(0, Math.min(oldValue - delta, 127));

    this._changeParams(this.data.activeKnob, newValue);
  }

  ["/launch-control/knob/deactive"]() {
    if (this.data.activeKnob !== -1) {
      this.data.activeKnob = -1;
      this.emitChange();
    }
  }

  ["/launch-control/connected"]({ deviceName }) {
    this.data.connectedDeviceName = deviceName;
    this.emitChange();
  }

  ["/midi-device/request/inputs"]({ inputs }) {
    this.data.controllers = inputs;
    this.emitChange();
  }

  ["/midi-device/select/launch-control"]({ deviceName }) {
    this.data.deviceName = deviceName;
    this.emitChange();
  }
}
