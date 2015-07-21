import Store from "./Store";
import Sound from "../../../sound";
import config from "../config";

export default class LaunchControlStore extends Store {
  getInitialState() {
    return {
      deviceName: "",
      connectedDeviceName: "",
      controllers: [],
      params: new Uint8Array(config.DEFAULT_PARAMS),
      enabledParams: new Uint8Array(16),
      activeKnob: -1,
      activePad: new Uint8Array(8),
    };
  }

  ["/launch-control/pad"]({ track }) {
    track = Math.max(0, Math.min(track, 7));

    this.data.activePad[track] = 1 - this.data.activePad[track];
    this.emitChange();
  }

  ["/launch-control/knob1"]({ track, value }) {
    track = Math.max(0, Math.min(track, 7));
    value = Math.max(0, Math.min(value, 127));

    this.changeParam(track, value);
  }

  ["/launch-control/knob2"]({ track, value }) {
    track = Math.max(0, Math.min(track, 7));
    value = Math.max(0, Math.min(value, 127));

    this.changeParam(track + 8, value);
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

    this.changeParam(this.data.activeKnob, newValue);
  }

  ["/launch-control/knob/deactive"]() {
    if (this.data.activeKnob !== -1) {
      this.data.activeKnob = -1;
      this.emitChange();
    }
  }

  ["/midi-keyboard/preset"]({ presetName }) {
    if (Sound.presets.hasOwnProperty(presetName)) {
      this.data.enabledParams = Sound.presets[presetName].getEnabledParams();
      this.emitChange();
    }
  }

  ["/midi-device/request/inputs"]({ inputs }) {
    this.data.controllers = inputs;
    this.emitChange();
  }

  ["/midi-device/select/launch-control"]({ deviceName }) {
    this.data.deviceName = deviceName;
    this.emitChange();
  }

  ["/midi-device/connected/launch-control"]({ deviceName }) {
    this.data.connectedDeviceName = deviceName;
    this.emitChange();
  }

  changeParam(index, value) {
    if (this.data.params[index] === value) {
      return;
    }

    this.data.params[index] = value;

    this.emitChange();

    this.dispatch("/launch-control/updated/params", {
      params: this.data.params,
    });
  }
}
