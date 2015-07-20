import { Duplex } from "@mohayonao/dispatcher";
import WorkerTimer from "worker-timer";
import xtend from "xtend";
import SoundManager from "../../SoundManager";
import score from "../../../utils/score";
import Timeline from "../../../utils/Timeline";
import Sequencer from "../../../utils/Sequencer";
import WebAudioUtils from "../../WebAudioUtils";
import actions from "./actions";
import stores from "./stores";
import config from "./config";

let CHANGE_EVENT = "change";

export default class Router extends Duplex {
  constructor() {
    super();

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

    this.actions = Object.keys(actions).map(className => new actions[className](this));
    this.stores = Object.keys(stores).map(className => new stores[className](this));

    this.createAction("/midi-device/request");

    this.sequencer.on("play", (events) => {
      this._onplay(events);
    });
  }

  getStateFromStores() {
    let state = {};

    this.stores.forEach((store) => {
      let name = store.name.replace(/Store$/, "");

      name = name.charAt(0).toLowerCase() + name.substr(1);

      state[name] = store.get();
    });

    return state;
  }

  createAction(address, data = {}) {
    this.actions.forEach((action) => {
      if (typeof action.delegate === "function") {
        action.delegate(address, data);
      }
    });
  }

  executeAction(address, data = {}) {
    this.stores.forEach((store) => {
      if (typeof store.delegate === "function") {
        store.delegate(address, data);
      }
    });
    this.delegate(address, data);
  }

  emitChange() {
    this.emit(CHANGE_EVENT);
  }

  addChangeListener(listener) {
    this.on(CHANGE_EVENT, listener);
  }

  removeChangeListener(listener) {
    this.removeListener(CHANGE_EVENT, listener);
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
    this.executeAction("/sound/statechange", {
      soundState: this.sound.state,
      sequencerState: this.sequencer.state,
    });
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
    this.executeAction("/sound/statechange", {
      soundState: this.sound.state,
      sequencerState: this.sequencer.state,
    });
  }

  changeParams(params) {
    this.sound.changeParams(params);
  }

  _onplay(events) {
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
