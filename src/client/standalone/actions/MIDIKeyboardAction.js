import fluxx from "@mohayonao/remote-fluxx";

export default class MIDIKeyboardAction extends fluxx.Action {
  ["/midi-keyboard"](data) {
    this.doneAction(`/midi-keyboard/${data.dataType}`, data);
  }

  ["/midi-keyboard/preset"](data) {
    this.doneAction("/midi-keyboard/preset", data);
  }

  ["/midi-keyboard/octave-shift"](data) {
    this.doneAction("/midi-keyboard/octave-shift", data);
  }

  ["/midi-keyboard/noteOn"](data) {
    this.doneAction("/midi-keyboard/noteOn", data);
  }

  ["/midi-keyboard/noteOff"](data) {
    this.doneAction("/midi-keyboard/noteOff", data);
  }
}
