import fluxx from "@mohayonao/remote-fluxx";
import WorkerTimer from "worker-timer";
import Timeline from "../../utils/Timeline";
import WebAudioUtils from "../../utils/WebAudioUtils";
import SoundCreator from "../SoundCreator";
import SoundDispatcher from "./SoundDispatcher";
import SoundManager from "../SoundManager";
import actions from "./actions";
import stores from "./stores";
import config from "./config";
import sound from "../../sound";

export default class Router extends fluxx.Router {
  constructor() {
    super();

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
    });

    this.tracks = sound.tracks.tracks.map((Track) => {
      return new Track(this).on("play", (data) => {
        this.soundCreator.push(data);
      });
    });

    this.params = new Uint8Array(config.DEFAULT_PARAMS);
    this.actions = Object.keys(actions).map(className => new actions[className](this));
    this.stores = Object.keys(stores).map(className => new stores[className](this));

    this.addChangeListener(this.updateStateFromStore.bind(this));
  }

  get state() {
    return this.soundManager.state;
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

  play(data) {
    if (this.state !== "running") {
      return;
    }

    if (data.program) {
      this.soundCreator.push(data);
      return;
    }

    let params = this.params;

    for (let i = 0; i < 8; i++) {
      if (params[i + 16]) {
        this.tracks[i].push(data);
      }
    }
  }
}
