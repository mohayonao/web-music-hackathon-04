import Store from "./Store";
import Sound from "../../../sound";

export default class MIDIKeyboardStore extends Store {
  get name() {
    return "midiKeyboard";
  }

  getInitialState() {
    return {
      deviceName: "",
      connectedDeviceName: "",
      controllers: [],
      presets: Object.keys(Sound.presets),
      presetName: "",
      noteOn: new Uint8Array(128),
      octave: 5,
    };
  }

  ["/midi-keyboard/preset"]({ presetName }) {
    this.data.presetName = presetName;
    this.emitChange();
  }

  ["/midi-keyboard/octave-shift"](data) {
    let octave = this.data.octave + data.value;

    octave = Math.max(0, Math.min(octave, 9));

    if (this.data.octave !== octave) {
      this.data.octave = octave;
      this.emitChange();
    }
  }

  ["/midi-keyboard/noteOn"](data) {
    this.data.noteOn[data.noteNumber] = 1;
    this.emitChange();
  }

  ["/midi-keyboard/noteOff"](data) {
    this.data.noteOn[data.noteNumber] = 0;
    this.emitChange();
  }

  ["/midi-device/request/inputs"]({ inputs }) {
    this.data.controllers = inputs;
    this.emitChange();
  }

  ["/midi-device/select/midi-keyboard"]({ deviceName }) {
    this.data.deviceName = deviceName;
    this.emitChange();
  }

  ["/midi-device/connected/midi-keyboard"]({ deviceName }) {
    this.data.connectedDeviceName = deviceName;
    this.emitChange();
  }
}
