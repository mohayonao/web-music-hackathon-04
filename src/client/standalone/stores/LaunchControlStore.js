import fluxx from "@mohayonao/remote-fluxx";
import sound from "../../../sound";
import utils from "../../utils";
import config from "../config";

export default class LaunchControlStore extends fluxx.Store {
  getInitialState() {
    return {
      deviceName: "",
      connectedDeviceName: "",
      controllers: [],
      params: new Uint8Array(config.DEFAULT_PARAMS),
      enabledParams: new Uint8Array(16),
      activeKnob: -1,
    };
  }

  ["/storage/get"]({ launchControlDeviceName, launchControlParams }) {
    this.data.deviceName = launchControlDeviceName;
    this.data.params = new Uint8Array(launchControlParams);
    this.emitChange(0);
  }

  ["/launch-control/pad"]({ track }) {
    track = utils.constrain(track, 0, 7)|0;

    this.data.params[track + 16] = 1 - this.data.params[track + 16];
    this.emitChange();
  }

  ["/launch-control/knob1"]({ track, value }) {
    track = utils.constrain(track, 0, 7)|0;
    value = utils.constrain(value, 0, 127)|0;

    this.changeParam(track, value);
  }

  ["/launch-control/knob2"]({ track, value }) {
    track = utils.constrain(track, 0, 7)|0;
    value = utils.constrain(value, 0, 127)|0;

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
    let newValue = utils.constrain(oldValue - delta, 0, 127)|0;

    this.changeParam(this.data.activeKnob, newValue);
  }

  ["/launch-control/knob/deactive"]() {
    if (this.data.activeKnob !== -1) {
      this.data.activeKnob = -1;
      this.emitChange();
    }
  }

  ["/midi-keyboard/preset"]({ presetName }) {
    let presets = sound.instruments.presets;

    if (presets.hasOwnProperty(presetName)) {
      this.data.enabledParams = presets[presetName].getEnabledParams();
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

  ["/midi-device/connect/launch-control"]({ deviceName }) {
    this.data.connectedDeviceName = deviceName;
    this.emitChange();
  }

  changeParam(index, value) {
    if (this.data.params[index] === value) {
      return;
    }

    this.data.params[index] = value;

    this.emitChange();

    this.router.createAction("/launch-control/params/update", {
      params: this.data.params,
    });
  }
}
