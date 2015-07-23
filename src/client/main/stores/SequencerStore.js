import fluxx from "@mohayonao/remote-fluxx";
import SyncDate from "../SyncDate";

export default class SequencerStore extends fluxx.Store {
  constructor(...args) {
    super(...args);

    this.audioContext = this.router.audioContext;
  }

  getInitialState() {
    return {
      enabled: false,
    };
  }

  ["/sound/sequencer/state"]({ state }) {
    this.data.enabled = state === "running";
    this.emitChange();
  }

  ["/sound/play"](data) {
    let now = SyncDate.now() * 0.001;

    data.sort((a, b) => a.playbackTime - b.playbackTime).forEach((data) => {
      let deltaTime = data.playbackTime - now;

      data.playbackTime = this.audioContext.currentTime + deltaTime;

      this.router.play(data);
    });
  }
}
