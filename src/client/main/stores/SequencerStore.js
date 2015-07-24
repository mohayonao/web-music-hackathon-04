import fluxx from "@mohayonao/remote-fluxx";

export default class SequencerStore extends fluxx.Store {
  getInitialState() {
    return {
      enabled: false,
    };
  }

  ["/sequencer/state"]({ state }) {
    this.data.enabled = state === "running";
    this.emitChange();
  }

  ["/sequencer/play"](data) {
    data.forEach((data) => {
      this.router.play(data);
    });
  }
}
