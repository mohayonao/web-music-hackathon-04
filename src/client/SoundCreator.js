import EventEmitter from "@mohayonao/event-emitter";
import xtend from "xtend";
import Sound from "../sound";
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

  create(data) {
    if (data.dataType === "sequence") {
      data = xtend(data, {
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
    let { noteNumber, track, program, playbackTime } = data;
    let params = this._params;

    let Klass = Sound.getClass({ track, program });
    let instance = new Klass({
      audioContext: this.audioContext,
      timeline: this.timeline,
      params: params,
      noteNumber: data.noteNumber,
      velocity: data.velocity,
      duration: data.duration,
    });

    instance.initialize();
    instance.create();
    instance.noteOn(playbackTime);

    if (instance.duration !== Infinity) {
      instance.noteOff(playbackTime + instance.duration);
    } else {
      this._tracks[track][noteNumber] = instance;
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

  noteOff(data) {
    let { noteNumber, track, playbackTime } = data;

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
