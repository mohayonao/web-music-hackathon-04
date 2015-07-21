import fluxx from "@mohayonao/remote-fluxx";
import Sequencer from "../../../utils/Sequencer";
import config from "../config";

export default class SequencerStore extends fluxx.Store {
  constructor(...args) {
    super(...args);

    this.timeline = this.router.timeline;

    this.timeline.on("process", () => {
      this.router.clients.forEach((client) => {
        client.$pendings = [];
      });
    });

    this.timeline.on("processed", () => {
      this.router.clients.forEach((client) => {
        if (client.$pendings.length === 0) {
          return;
        }
        client.sendAction("/sound/play", client.$pendings);
      });
    });

    this.sequencer = new Sequencer(this.timeline, {
      interval: config.SEQUENCER_INTERVAL,
    });

    this.sequencer.on("play", (events) => {
      this.router.play(events);
    });
  }

  getInitialState() {
    return {
      song: config.DEFAULT_SONG,
      tempo: 60,
      state: "suspended",
    };
  }

  ["/sound/load/score"](data) {
    this.data.song = data.name;
    this.data.tempo = data.tempo;
    this.sequencer.setData(data);
    this.emitChange();
  }

  ["/sequencer/start"]() {
    this.sequencer.start();
    this.data.state = this.sequencer.state;
    this.emitChange();
  }

  ["/sequencer/stop"]() {
    this.sequencer.stop();
    this.data.state = this.sequencer.state;
    this.emitChange();
  }

  ["/sequencer/change/tempo"]({ tempo, delta }) {
    if (typeof tempo === "number") {
      this.sequencer.tempo = tempo;
    } else if (typeof delta === "number") {
      this.sequencer.tempo += delta;
    }
    this.data.tempo = this.sequencer.tempo;
    this.emitChange();
  }
}
