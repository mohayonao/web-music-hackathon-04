import fluxx from "@mohayonao/remote-fluxx";
import logger from "../logger";
import actions from "./actions";
import stores from "./stores";
import utils from "../utils";
import Timeline from "../../utils/Timeline";
import MIDIDispatcher from "../MIDIDispatcher";

export default class Router extends fluxx.Server {
  constructor(...args) {
    super(...args);

    this.timeline = new Timeline({
      interval: 1, aheadTime: 1.25, offsetTime: 0.0,
    });
    this.midiDispatcher = new MIDIDispatcher();

    this.actions = Object.keys(actions).map(className => new actions[className](this));
    this.stores = Object.keys(stores).map(className => new stores[className](this));

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

    this.addChangeListener(() => {
      let state = this.getStateFromStores();

      if (state.sequencer.state === "running") {
        this.timeline.start();
      } else {
        this.timeline.stop();
      }

      for (let i = 0; i < 8; i++) {
        let enabled = state.launchControl.params[i + 16];

        utils.setLED(i, enabled ? "light green" : "off");
      }
    });

    this.addChangeListener(utils.debounce(() => {
      let state = this.getStateFromStores();

      this.sendAction("/server/setState", {
        state: state.sequencer.state,
        connected: this.clients.length,
        params: state.launchControl.params.buffer,
      });
    }, 100));
  }

  play(events) {
    events.forEach((data) => {
      this.midiDispatcher.push(data);
    });
  }
}
