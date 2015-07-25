import fluxx from "@mohayonao/remote-fluxx";
import logger from "../logger";
import actions from "./actions";
import stores from "./stores";
import utils from "./utils";
import config from "./config";
import sound from "../../sound";
import Timeline from "../../utils/Timeline";

export default class Router extends fluxx.Server {
  constructor(...args) {
    super(...args);

    this.timeline = new Timeline({
      interval: 1, aheadTime: 1.25, offsetTime: 0.0,
    });
    this.timeline.on("process", this.resetSoundPlay.bind(this));
    this.timeline.on("processed", this.sendSoundPlay.bind(this));

    this.tracks = sound.tracks.tracks.map((Track) => {
      return new Track(this.timeline).on("play", (data) => {
        this.pushSoundPlay(data);
      });
    });

    this.params = new Uint8Array(config.DEFAULT_PARAMS);
    this.actions = Object.keys(actions).map(className => new actions[className](this));
    this.stores = Object.keys(stores).map(className => new stores[className](this));

    this.addChangeListener(this.updateStateFromStore.bind(this));
    this.addChangeListener(utils.debounce(this.sendStateFromStores.bind(this), 25));

    this.on("connect", ({ client }) => {
      client.on("ping", () => {
        client.emit("pong", Date.now());
      });
      this.createAction("/connected", { client });
      logger.log("+ %s (%d users)", client.id, this.clients.length);
    });

    this.on("disconnect", ({ client }) => {
      this.createAction("/disconnected", { client });
      logger.log("- %s (%d users)", client.id, this.clients.length);
    });

    this._index = 0;
  }

  play(data) {
    let params = this.params;

    for (let i = 0; i < 8; i++) {
      if (params[i + 16]) {
        this.tracks[i].push(data);
      }
    }
  }

  updateStateFromStore() {
    let state = this.getStateFromStores();

    if (state.sequencer.state === "running") {
      this.timeline.start();
    } else {
      this.timeline.stop(true);
    }

    this.tracks.forEach((track) => {
      track.setState(utils.xtend(state.sequencer, state.launchControl));
    });

    this.setParams(state.launchControl.params);
  }

  sendStateFromStores() {
    let state = this.getStateFromStores();

    this.sendAction("/server/sendState", {
      state: state.sequencer.state,
      connected: this.clients.length,
      params: state.launchControl.params.buffer,
    });
  }

  setParams(params) {
    this.params = params;

    for (let i = 0; i < 8; i++) {
      utils.setLED(i, params[i + 16] ? "light green" : "off");
    }
  }

  resetSoundPlay() {
    this.clients.forEach((client) => {
      client.$pendings = [];
    });
  }

  pushSoundPlay(data) {
    let clients = this.clients;
    let loop = clients.length;

    while (loop--) {
      let client = utils.wrapAt(clients, this._index++);

      if (client) {
        client.$pendings.push(data);
        break;
      }
    }
  }

  sendSoundPlay() {
    this.clients.forEach((client) => {
      if (client.$pendings.length === 0) {
        return;
      }
      client.sendAction("/server/play", client.$pendings);
    });
  }
}
