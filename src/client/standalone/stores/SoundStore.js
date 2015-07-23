import fluxx from "@mohayonao/remote-fluxx";
import xtend from "xtend";
import SoundCreator from "../../SoundCreator";
import SoundDispatcher from "../SoundDispatcher";
import SoundManager from "../../SoundManager";
import Sequencer from "../../../utils/Sequencer";
import config from "../config";

export default class SoundStore extends fluxx.Store {
  constructor(...args) {
    super(...args);

    this.audioContext = this.router.audioContext;
    this.timeline = this.router.timeline;
    this.sequencer = new Sequencer(this.timeline, {
      interval: config.SEQUENCER_INTERVAL,
    });

    let soundOpts = {
      audioContext: this.audioContext,
      timeline: this.timeline,
      offsetTime: config.SEQUENCE_OFFSET_TIME,
    };

    this.soundCreator = new SoundCreator(soundOpts);
    this.soundDispatcher = new SoundDispatcher(soundOpts);
    this.soundManager = new SoundManager(soundOpts);
    this.soundDispatcher.connect(this.soundManager.inlet);

    this.sequencer.on("play", (events) => {
      this.play(events);
    });
    this.soundCreator.on("created", (instance) => {
      this.soundDispatcher.dispatch(instance);
    });

    this._presetName = "";
  }

  getInitialState() {
    return {
      song: config.DEFAULT_SONG,
      songs: config.SONGS,
      soundState: false,
      sequencerState: false,
    };
  }

  ["/sound/load/score"]({ data }) {
    this.sequencer.setData(data);
    this.data.song = data.name;
    this.emitChange();
  }

  ["/toggle-button/click/sound"]() {
    if (this.soundManager.state === "suspended") {
      this.soundManager.start();
      this.timeline.start();
    } else {
      this.soundManager.stop();
      this.timeline.stop(true);
      this.sequencer.stop();
    }
    this.data.soundState = this.soundManager.state;
    this.data.sequencerState = this.sequencer.state;
    this.emitChange();
  }

  ["/toggle-button/click/sequencer"]() {
    if (this.soundManager.state !== "running") {
      return;
    }
    if (this.sequencer.state === "suspended") {
      this.sequencer.start();
    } else {
      this.sequencer.stop();
    }
    this.data.sequencerState = this.sequencer.state;
    this.emitChange();
  }

  ["/launch-control/params/update"]({ params }) {
    this.soundCreator.setParams(params);
  }

  ["/midi-keyboard/preset"]({ presetName }) {
    this._presetName = presetName;
  }

  ["/midi-keyboard/noteOn"](data) {
    if (this.soundManager.state !== "running") {
      return;
    }

    this.soundCreator.create({
      dataType: "noteOn",
      playbackTime: 0,
      track: 0,
      program: this._presetName,
      noteNumber: data.noteNumber,
      velocity: data.velocity,
    });
  }

  ["/midi-keyboard/noteOff"](data) {
    if (this.soundManager.state !== "running") {
      return;
    }

    this.soundCreator.create({
      dataType: "noteOff",
      playbackTime: 0,
      track: 0,
      program: this._presetName,
      noteNumber: data.noteNumber,
      velocity: 0,
    });
  }

  play(events) {
    if (this.soundManager.state !== "running") {
      return;
    }

    events.forEach((data) => {
      this.soundCreator.create(xtend(data, {
        program: 0,
      }));
    });
  }
}
