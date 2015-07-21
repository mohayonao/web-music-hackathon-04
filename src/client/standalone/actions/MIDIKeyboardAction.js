import Action from "./Action";

export default class MIDIKeyboardAction extends Action {
  ["/midi-keyboard"](data) {
    this.executeAction(`/midi-keyboard/${data.dataType}`, data);
  }

  ["/midi-keyboard/preset"](data) {
    this.executeAction("/midi-keyboard/preset", data);
  }

  ["/midi-keyboard/octave-shift"](data) {
    this.executeAction("/midi-keyboard/octave-shift", data);
  }

  ["/midi-keyboard/noteOn"](data) {
    this.executeAction("/midi-keyboard/noteOn", data);
  }

  ["/midi-keyboard/noteOff"](data) {
    this.executeAction("/midi-keyboard/noteOff", data);
  }
}
