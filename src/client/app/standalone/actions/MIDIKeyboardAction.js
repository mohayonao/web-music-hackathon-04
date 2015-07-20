import Action from "./Action";

export default class MIDIKeyboardAction extends Action {
  ["/midi-keyboard"](data) {
    this.router.executeAction(`/midi-keyboard/${data.dataType}`, data);
  }

  ["/midi-keyboard/preset"](data) {
    this.router.executeAction("/midi-keyboard/preset", data);
  }

  ["/midi-keyboard/octave-shift"](data) {
    this.router.executeAction("/midi-keyboard/octave-shift", data);
  }

  ["/midi-keyboard/noteOn"](data) {
    this.router.executeAction("/midi-keyboard/noteOn", data);
  }

  ["/midi-keyboard/noteOff"](data) {
    this.router.executeAction("/midi-keyboard/noteOff", data);
  }
}
