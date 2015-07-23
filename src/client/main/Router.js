import fluxx from "@mohayonao/remote-fluxx";
import WorkerTimer from "worker-timer";
import SyncDate from "./SyncDate";
import Timeline from "../../utils/Timeline";
import WebAudioUtils from "../../utils/WebAudioUtils";
import SoundCreator from "../SoundCreator";
import SoundDispatcher from "./SoundDispatcher";
import SoundManager from "../SoundManager";
import actions from "./actions";
import stores from "./stores";
import config from "./config";

export default class Router extends fluxx.Client {
  constructor(...args) {
    super(...args);

    this._syncTimes = [];

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
      this.soundDispatcher.push(instance);
      this.emit("noteOn", instance);
    });

    this.actions = Object.keys(actions).map(className => new actions[className](this));
    this.stores = Object.keys(stores).map(className => new stores[className](this));

    this.addChangeListener(this.updateStateFromStore.bind(this));
  }

  get state() {
    return this.soundManager.state;
  }

  play(data) {
    if (this.state !== "running") {
      return;
    }

    this.soundCreator.push(data);
  }

  updateStateFromStore() {
    let state = this.getStateFromStores();

    if (state.sound.enabled) {
      this.timeline.start();
    } else {
      this.timeline.stop(true);
    }

    this.params = state.launchControl.params;
  }

  syncTime() {
    let beginTime = Date.now();

    this.socket.emit("ping");
    this.socket.once("pong", (serverCurrentTime) => {
      let endTime = Date.now();
      let elapsed = endTime - beginTime;
      let currentTime = endTime - (elapsed * 0.5);
      let deltaTime = serverCurrentTime - currentTime;

      this._syncTimes.push(deltaTime);

      if (this._syncTimes.length < 5) {
        return setTimeout(() => this.syncTime(), 100);
      }

      this._syncTimes.shift();

      let averageDeltaTime = this._syncTimes.reduce((a, b) => a + b, 0) / this._syncTimes.length;

      SyncDate.setDeltaTime(Math.round(averageDeltaTime));

      this._syncTimes = [];

      setTimeout(() => this.syncTime(), 1000 * 30);
    });
  }
}
