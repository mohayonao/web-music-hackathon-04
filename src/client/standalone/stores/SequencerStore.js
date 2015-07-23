import fluxx from "@mohayonao/remote-fluxx";
import Sequencer from "../../../utils/Sequencer";
import config from "../config";

export default class SequencerStore extends fluxx.Store {
  constructor(...args) {
    super(...args);

    this.audioContext = this.router.audioContext;
    this.timeline = this.router.timeline;
    this.sequencer = new Sequencer(this.timeline, {
      interval: config.SEQUENCER_INTERVAL,
    });

    this.sequencer.on("play", (events) => {
      events.forEach((data) => {
        this.router.play(data);
      });
    });
  }

  getInitialState() {
    return {
      song: config.DEFAULT_SONG,
      songs: config.SONGS,
      enabled: false,
    };
  }

  ["/sound/load/score"]({ data }) {
    this.sequencer.setData(data);
    this.data.song = data.name;
    this.emitChange();
  }

  ["/toggle-button/click/sequencer"]() {
    if (this.sequencer.state === "suspended") {
      this.sequencer.start();
    } else {
      this.sequencer.stop();
    }
    this.data.enabled = this.sequencer.state === "running";
    this.emitChange();
  }
}
