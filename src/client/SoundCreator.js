import EventEmitter from "@mohayonao/event-emitter";
import sound from "../sound";
import config from "./config";
import utils from "./utils";

export default class SoundCreator extends EventEmitter {
  constructor({ audioContext, timeline, offsetTime }) {
    super();

    this.audioContext = audioContext;
    this.timeline = timeline;
    this.offsetTime = utils.defaults(offsetTime, 0);

    this._notes = [];
    this._tracks = [ [], [], [], [], [], [], [], [] ];
    this._params = new Uint8Array(config.DEFAULT_PARAMS);
  }

  push(data) {
    if (data.dataType === "sequence") {
      data = utils.xtend(data, {
        dataType: "noteOn",
        playbackTime: data.playbackTime + this.offsetTime,
      });
    }
    if (data.playbackTime <= 0) {
      data.playbackTime = this.audioContext.currentTime;
    }
    if (data.dataType === "noteOn") {
      this.timeline.insert(data.playbackTime, () => {
        this.noteOn(data);
      });
    }
    if (data.dataType === "noteOff") {
      this.timeline.insert(data.playbackTime, () => {
        this.noteOff(data);
      });
    }
  }

  noteOn(data) {
    let Klass = sound.instruments.getClass(data.program);
    let instance = new Klass(utils.xtend(data, {
      audioContext: this.audioContext,
      timeline: this.timeline,
      params: this._params,
    }));

    instance.initialize();
    instance.create();
    instance.noteOn(data.playbackTime);

    if (instance.duration !== Infinity) {
      instance.noteOff(data.playbackTime + instance.duration);
    } else {
      this._tracks[data.track][data.noteNumber] = instance;
    }

    instance.once("ended", () => {
      instance.dispose();
    });

    instance.once("disposed", () => {
      utils.removeIfExists(this._notes, instance);
      instance.disconnect();
    });

    this.emit("created", instance);

    this._notes.push(instance);
  }

  noteOff({ playbackTime, track, noteNumber }) {
    let instance = this._tracks[track][noteNumber];

    if (!instance) {
      return;
    }

    instance.noteOff(playbackTime);

    this._tracks[track][noteNumber] = null;
  }

  setParams(params) {
    this._params = params;
    this._notes.forEach((note) => {
      note.setParams(params);
    });
  }
}
