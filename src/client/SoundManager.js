import Sound from "./sound";
import config from "../config";
import utils from "./utils";

global.AudioContext = global.AudioContext || global.webkitAudioContext;

export default class SoundManager {
  constructor({ audioContext, timeline }) {
    this.audioContext = audioContext;
    this.timeline = timeline;

    this.inlet = audioContext.createDynamicsCompressor();
    this.outlet = audioContext.createGain();

    this._state = "suspended";
    this._chored = false;
    this._notes = [];
    this._channels = [ [], [], [], [], [], [], [], [] ];
  }

  get state() {
    return this._state;
  }

  get currentTime() {
    return this.audioContext.currentTime;
  }

  get destination() {
    return this.inlet;
  }

  chore() {
    if (!this._chored) {
      let bufSrc = this.audioContext.createBufferSource();

      bufSrc.start(this.audioContext.currentTime);
      bufSrc.stop(this.audioContext.currentTime + 0.001);
      bufSrc.connect(this.audioContext.destination);
      bufSrc.onended = () => {
        bufSrc.disconnect();
      };

      this._chored = bufSrc;
    }

    return this;
  }

  start() {
    if (this.state === "suspended") {
      this.inlet.connect(this.outlet);
      this.outlet.connect(this.audioContext.destination);
      this._state = "running";
    }

    return this;
  }

  stop() {
    if (this.state === "running") {
      this.inlet.disconnect();
      this.outlet.disconnect();
      this._state = "suspended";
    }

    return this;
  }

  play(data, target = this) {
    if (data.dataType === "noteOn") {
      this.timeline.insert(data.playbackTime, () => {
        this.noteOn(data, target);
      });
    }
    if (data.dataType === "noteOff") {
      this.timeline.insert(data.playbackTime, () => {
        this.noteOff(data, target);
      });
    }
  }

  noteOn(data, target) {
    let { noteNumber, channel, playbackTime, duration } = data;

    let note = utils.getItem(this._channels, [ channel, noteNumber ]);

    if (note) {
      note.noteOff();
      note.dispose();
    }

    if (config.MAX_NOTES <= this._notes.length) {
      this._notes[0].noteOff();
      this._notes[0].dispose();
    }

    let Klass = Sound.getClass(channel);
    let instance = new Klass(this.audioContext, data);

    instance.initialize();
    instance.noteOn(playbackTime);

    if (typeof duration === "number" && isFinite(duration)) {
      instance.noteOff(playbackTime + duration);
    }

    instance.once("ended", () => {
      instance.noteOff();
      instance.dispose();
    });
    instance.once("disposed", () => {
      utils.removeIfExists(this._notes, instance);
      instance.disconnect();
    });

    instance.connect(target.inlet);

    if (target === this) {
      this._notes.push(instance);
    }

    utils.setItem(this._channels, instance, [ channel, noteNumber ]);
  }

  noteOff(data) {
    let { noteNumber, channel, playbackTime } = data;

    let instance = utils.getItem(this._channels, [ channel, noteNumber ]);

    if (!instance) {
      return;
    }

    this.timeline.insert(playbackTime, ({ playbackTime }) => {
      instance.noteOff(playbackTime);
    });
  }
}
