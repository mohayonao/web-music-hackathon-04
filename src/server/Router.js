import subote from "subote";
import xtend from "xtend";
import logger from "./logger";
import utils from "./utils";
import score from "../utils/score";
import Timeline from "../utils/Timeline";
import Sequencer from "../utils/Sequencer";
import MIDIDelay from "./MIDIDelay";
import MIDIDispatcher from "./MIDIDispatcher";
import config from "./config";

const INITIALIZE = Symbol("INITIALIZE");
const COLORS = [ "dark green", "green", "light green" ];

export default class Router extends subote.Server {
  constructor(...args) {
    super(...args);

    this.timeline = new Timeline({
      interval: 1, aheadTime: 1.25, offsetTime: 0.0,
    });
    this.sequencer = new Sequencer(this, score, {
      interval: config.SEQUENCER_INTERVAL,
      ticksPerBeat: config.TICKS_PER_BEAT,
    });
    this.midiDelay = new MIDIDelay(this, config.DELAY_TICKS);
    this.midiDispatcher = new MIDIDispatcher(this);

    this.shared.enabledClients = [];
    this.shared.tempo = this.sequencer.tempo;
    this.shared.params = new Uint8Array(config.DEFAULT_PARAMS);
    this.shared.tracks = new Uint8Array(8);

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

      client.send("/params", this.shared.params.buffer);

      client.$pendings = [];
    });

    this.on("disconnect", ({ client }) => {
      utils.removeIfExists(this.shared.enabledClients, client);
      log("-", client);
    });

    this.sequencer.on("play", (events) => {
      this._onplay(events);
    });

    this.sequencer.on("statechange", (state) => {
      this.sequencer.removeAllListeners("processed");

      utils.setLED("all", (state === "running") ? "light amber" : "off");

      if (state !== "running") {
        return;
      }

      let colorIndex = 0;

      setTimeout(() => {
        this.sequencer.on("processed", () => {
          let color = utils.wrapAt(COLORS, colorIndex++);

          for (let i = 0; i < 8; i++) {
            utils.setLED(i, this.shared.tracks[i] ? color : "off");
          }
        });
      }, 1000);
    });

    this.on("changeparam", (params) => {
      this.send("/params", params.buffer);
    });

    this.timeline.on("process", () => {
      this.clients.forEach((client) => {
        client.$pendings = [];
      });
    });

    this.timeline.on("processed", () => {
      this.clients.forEach((client) => {
        if (client.$pendings.length === 0) {
          return;
        }
        client.send("/play", client.$pendings);
      });
    });

    this.timeline.start();
  }

  _onplay(events) {
    events.forEach((data) => {
      if (data.track === 1) {
        this.midiDelay.push(data);
      } else {
        this.midiDispatcher.push(xtend(data, { velocity: 60, program: 0 }));
      }
    });
  }

  ["/launch-control/pad"]({ track }) {
    this.shared.tracks[track] = 1 - this.shared.tracks[track];
    utils.setLED(track, this.shared.tracks[track] ? "light red" : "off");
  }

  ["/launch-control/knob1"]({ track, value }) {
    this.shared.params[track] = value;
    this.emit("changeparam", this.shared.params);
  }

  ["/launch-control/knob2"]({ track, value }) {
    this.shared.params[track + 8] = value;
    this.emit("changeparam", this.shared.params);
  }

  ["/launch-control/cursor"]({ direction }) {
    switch (direction) {
    case "up":
      this.sequencer.start();
      break;
    case "down":
      this.sequencer.stop();
      break;
    case "left":
      this.sequencer.tempo -= 2;
      this.shared.tempo = this.sequencer.tempo;
      logger.debug(`tempo: ${this.sequencer.tempo}`);
      break;
    case "right":
      this.sequencer.tempo += 2;
      this.shared.tempo = this.sequencer.tempo;
      logger.debug(`tempo: ${this.sequencer.tempo}`);
      break;
    default:
      // do nothing
    }
  }
}
