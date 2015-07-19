import EventEmitter from "@mohayonao/event-emitter";
import utils from "../utils";

export const INITIALIZE = utils.symbol("INITIALIZE");
export const NOTE_ON = utils.symbol("NOTE_ON");
export const NOTE_OFF = utils.symbol("NOTE_OFF");
export const DISPOSE = utils.symbol("DISPOSE");

export default class Tone extends EventEmitter {
  constructor(audioContext, timeline, { noteNumber, velocity, duration }) {
    super();

    this.audioContext = audioContext;
    this.timeline = timeline;
    this.noteNumber = noteNumber;
    this.velocity = velocity;
    this.duration = duration;
    this.outlet = null;
    this.inlet = null;
    this.state = "uninitialized";
  }

  connect(destination) {
    if (this.outlet) {
      this.outlet.connect(destination);
    }
  }

  disconnect(destination) {
    if (this.outlet) {
      this.outlet.disconnect(destination);
    }
  }

  initialize() {
    if (this.state !== "uninitialized") {
      return;
    }
    this.state = "initialized";
    this[INITIALIZE]();
  }

  [INITIALIZE]() {}

  noteOn(t0 = this.audioContext.currentTime) {
    if (this.state !== "initialized") {
      return;
    }
    this.state = "noteOn";
    this[NOTE_ON](t0);
  }

  [NOTE_ON]() {}

  noteOff(t0 = this.audioContext.currentTime) {
    if (this.state !== "noteOn") {
      return;
    }
    this.state = "noteOff";
    this[NOTE_OFF](t0);
  }

  [NOTE_OFF]() {}

  dispose() {
    if (this.state !== "noteOff") {
      return;
    }
    this.state = "disposed";
    this[DISPOSE]();
    this.emit("disposed");
    this.inlet = this.outlet = null;
  }

  [DISPOSE]() {}
}
