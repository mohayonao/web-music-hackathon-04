import fluxx from "@mohayonao/remote-fluxx";
import sound from "../../../sound";
import utils from "../utils";

export default class MIDIKeyboardStore extends fluxx.Store {
  get name() {
    return "midiKeyboard";
  }

  getInitialState() {
    return {
      deviceName: "",
      connectedDeviceName: "",
      controllers: [],
      presets: Object.keys(sound.instruments.presets),
      presetName: "",
      noteOn: new Uint8Array(128),
      octave: 5,
    };
  }

  ["/storage/get"]({ midiKeyboardDeviceName, midiKeyboardPresetName }) {
    this.data.deviceName = midiKeyboardDeviceName;
    this.data.presetName = midiKeyboardPresetName;
    this.emitChange(0);
  }

  ["/midi-keyboard/preset"]({ presetName }) {
    this.data.presetName = presetName;
    this.emitChange();
  }

  ["/midi-keyboard/octave-shift"](data) {
    let octave = this.data.octave + data.value;

    octave = utils.constrain(octave, 0, 9)|0;

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

  ["/midi-device/connect/midi-keyboard"]({ deviceName }) {
    this.data.connectedDeviceName = deviceName;
    this.emitChange();
  }
}
