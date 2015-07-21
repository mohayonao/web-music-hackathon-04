import xtend from "xtend";
import WorkerTimer from "worker-timer";
import Store from "./Store";
import SoundManager from "../../SoundManager";
import score from "../../../utils/score";
import Timeline from "../../../utils/Timeline";
import Sequencer from "../../../utils/Sequencer";
import WebAudioUtils from "../../../utils/WebAudioUtils";
import config from "../config";

export default class SoundStore extends Store {
  constructor(...args) {
    super(...args);

    let audioContext = WebAudioUtils.getContext();
    let timeline = new Timeline({
      context: audioContext,
      timerAPI: WorkerTimer,
    });

    this.timeline = timeline;
    this.sequencer = new Sequencer(this, score, {
      interval: config.SEQUENCER_INTERVAL,
      ticksPerBeat: config.TICKS_PER_BEAT,
    });
    this.sound = new SoundManager({
      audioContext,
      timeline,
      offsetTime: config.SEQUENCE_OFFSET_TIME,
    });

    this.sequencer.on("play", (events) => {
      this.play(events);
    });

    this._presetName = "";
  }

  getInitialState() {
    return {
      soundState: false,
      sequencerState: false,
    };
  }

  ["/click/sound"]() {
    if (this.sound.state === "suspended") {
      this.sound.chore().start();
      this.timeline.start();
    } else {
      this.sound.stop();
      this.timeline.stop(true);
      this.sequencer.stop();
    }
    this.data.soundState = this.sound.state;
    this.data.sequencerState = this.sequencer.state;
    this.emitChange();
  }

  ["/click/sequencer"]() {
    if (this.sound.state !== "running") {
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

  ["/launch-control/updated/param"]({ params }) {
    this.sound.changeParams(params);
  }

  ["/midi-keyboard/preset"]({ presetName }) {
    this._presetName = presetName;
  }

  ["/midi-keyboard/noteOn"](data) {
    if (this.sound.state !== "running") {
      return;
    }

    this.sound.play({
      dataType: "noteOn",
      playbackTime: 0,
      track: 0,
      program: this._presetName,
      noteNumber: data.noteNumber,
      velocity: data.velocity,
    });
  }

  ["/midi-keyboard/noteOff"](data) {
    if (this.sound.state !== "running") {
      return;
    }

    this.sound.play({
      dataType: "noteOff",
      playbackTime: 0,
      track: 0,
      program: this._presetName,
      noteNumber: data.noteNumber,
      velocity: 0,
    });
  }

  play(events) {
    if (this.sound.state !== "running") {
      return;
    }

    events.forEach((data) => {
      this.sound.play(xtend(data, {
        program: 0,
      }));
    });
  }
}
