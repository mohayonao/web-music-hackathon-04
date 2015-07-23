import fluxx from "@mohayonao/remote-fluxx";
import WorkerTimer from "worker-timer";
import SyncDate from "../SyncDate";
import SoundCreator from "../../SoundCreator";
import SoundDispatcher from "./../SoundDispatcher";
import SoundManager from "../../SoundManager";
import Timeline from "../../../utils/Timeline";
import WebAudioUtils from "../../../utils/WebAudioUtils";
import config from "../config";

export default class SoundStore extends fluxx.Store {
  constructor(...args) {
    super(...args);

    this.audioContext = WebAudioUtils.getContext();
    this.timeline = new Timeline({
      context: this.audioContext,
      timerAPI: WorkerTimer,
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

    this.soundCreator.on("created", (instance) => {
      this.soundDispatcher.dispatch(instance);
      this.router.emit("noteOn", instance);
    });
  }

  getInitialState() {
    return {
      sequencerState: "suspended",
      soundState: false,
    };
  }

  ["/toggle-button/click/sound"]() {
    if (this.soundManager.state === "suspended") {
      this.soundManager.start();
      this.timeline.start();
    } else {
      this.soundManager.stop();
      this.timeline.stop(true);
    }
    this.data.soundState = this.soundManager.state;
    this.emitChange();

    this.router.socket.emit("enabled", this.soundManager.state === "running");
  }

  ["/launch-control/params/update"]({ params }) {
    this.soundCreator.setParams(params);
  }

  ["/sound/sequencer/state"]({ state }) {
    this.data.sequencerState = state;
    this.emitChange();
  }

  ["/sound/play"](data) {
    if (this.soundManager.state === "running") {
      let now = SyncDate.now() * 0.001;

      data.sort((a, b) => a.playbackTime - b.playbackTime).forEach((data) => {
        let deltaTime = data.playbackTime - now;

        data.playbackTime = this.audioContext.currentTime + deltaTime;

        this.soundCreator.create(data);
      });
    }
  }
}
