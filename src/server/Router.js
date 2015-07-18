import subote from "subote";
import xtend from "xtend";
import logger from "./logger";
import utils from "./utils";
import score from "./score";
import Timeline from "../utils/Timeline";
import Sequencer from "./Sequencer";

const INITIALIZE = Symbol("INITIALIZE");

export default class Router extends subote.Server {
  constructor(...args) {
    super(...args);

    this.timeline = new Timeline();
    this.sequencer = new Sequencer(score, this.timeline);
    this.sequencer.on("play", (events) => {
      this._onplay(events);
    });

    this.shared.enabledClients = [];

    this[INITIALIZE]();
  }

  [INITIALIZE]() {
    let log = (cap, client) => {
      let clientId = client.id;
      let numOfClient = this.clients.length;
      let numOfEnabledClient = this.shared.enabledClients.length;

      logger.log("%s %s (%d users / %d enabled)", cap, clientId, numOfClient, numOfEnabledClient);
    };

    this.on("connect", ({ client }) => {
      client.on("ping", () => {
        client.emit("pong", Date.now());
      });

      client.on("enabled", (value) => {
        if (value) {
          utils.appendIfNotExists(this.shared.enabledClients, client);
        } else {
          utils.removeIfExists(this.shared.enabledClients, client);
        }
        log(" ", client);
      });
      log("+", client);
    });

    this.on("disconnect", ({ client }) => {
      utils.removeIfExists(this.shared.enabledClients, client);
      log("-", client);
    });

    this.timeline.start();
  }

  _onplay(events) {
    events.forEach((data) => {
      this.send("/play", xtend(data, {
        playbackTime: data.playbackTime + 1,
      }));
    });
  }

  ["/midi-keyboard/volume"]({ value }) {
    this.sequencer.tempo = utils.linlin(value, 0, 127, 55, 200)|0;
  }

  ["/osc/start/seq"]({ args }) {
    if (args[0]) {
      this.sequencer.start();
    } else {
      this.sequencer.stop();
    }
  }
}
