import EventEmitter from "@mohayonao/event-emitter";
import utils from "../utils";

export const INITIALIZE = utils.symbol("INITIALIZE");
export const CREATE = utils.symbol("CREATE");
export const NOTE_ON = utils.symbol("NOTE_ON");
export const NOTE_OFF = utils.symbol("NOTE_OFF");
export const DISPOSE = utils.symbol("DISPOSE");

export default class Instrument extends EventEmitter {
  constructor({ audioContext, timeline, params, noteNumber, velocity, gain, duration }) {
    super();

    this.audioContext = audioContext;
    this.timeline = timeline;
    this.noteNumber = utils.defaults(noteNumber, 69);
    this.velocity = utils.defaults(velocity, 100);
    this.gain = utils.defaults(gain, 1);
    this.duration = utils.defaults(duration, Infinity);
    this.volume = utils.linexp(this.velocity, 0, 127, 0.25, 1) * this.gain;
    this.outlet = null;
    this.inlet = null;
    this.state = "uninitialized";
    this.params = params;
  }

  static getEnabledParams() {
    return [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ];
  }

  connect(destination) {
    if (this.outlet) {
      this.outlet.connect(destination);
    }
  }

  disconnect() {
    if (this.outlet) {
      this.outlet.disconnect();
    }
  }

  initialize() {
    if (this.state !== "uninitialized") {
      return;
    }

    let sharedParams = this.constructor.sharedParams;

    if (!sharedParams) {
      sharedParams = this.constructor.sharedParams = {};
      this[INITIALIZE].call(sharedParams, this.audioContext);
    }

    Object.keys(sharedParams).forEach((key) => {
      this[key] = sharedParams[key];
    });

    this.state = "initialized";
  }

  [INITIALIZE]() {}

  create() {
    if (this.state !== "initialized") {
      return;
    }
    this.state = "created";
    this[CREATE]();
  }

  [CREATE]() {}

  setParams(params) {
    for (let i = 0, imax = params.length; i < imax; i++) {
      if (params[i] !== this.params[i]) {
        let prevValue = this.params[i];

        this.params[i] = params[i];

        if (typeof this[`/param:${i}`] === "function") {
          this[`/param:${i}`](params[i], prevValue);
        }
      }
    }
  }

  noteOn(t0 = this.audioContext.currentTime) {
    if (this.state !== "created") {
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
