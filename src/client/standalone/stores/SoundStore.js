import fluxx from "@mohayonao/remote-fluxx";

export default class SoundStore extends fluxx.Store {
  constructor(...args) {
    super(...args);

    this.soundManager = this.router.soundManager;

    this._presetName = "random";
  }

  getInitialState() {
    return {
      enabled: false,
    };
  }

  ["/toggle-button/click/sound"]() {
    if (this.soundManager.state === "suspended") {
      this.soundManager.start();
    } else {
      this.soundManager.stop();
    }
    this.data.enabled = this.soundManager.state === "running";
    this.emitChange();
  }

  ["/midi-keyboard/preset"]({ presetName }) {
    this._presetName = presetName;
  }

  ["/midi-keyboard/noteOn"](data) {
    this.router.play({
      dataType: "noteOn",
      playbackTime: 0,
      track: 0,
      noteNumber: data.noteNumber,
      velocity: data.velocity,
      program: this._presetName,
    });
  }

  ["/midi-keyboard/noteOff"](data) {
    this.router.play({
      dataType: "noteOff",
      playbackTime: 0,
      track: 0,
      noteNumber: data.noteNumber,
      velocity: 0,
      program: this._presetName,
    });
  }
}
