import fluxx from "@mohayonao/remote-fluxx";

export default class SoundStore extends fluxx.Store {
  constructor(...args) {
    super(...args);

    this.soundManager = this.router.soundManager;
  }

  getInitialState() {
    return {
      enabled: false,
    };
  }

  ["/toggle-button/click/sound"]() {
    if (this.soundManager.state === "suspended") {
      this.soundManager.start();
    } else {
      this.soundManager.stop();
    }

    let enabled = this.soundManager.state === "running";

    this.data.enabled = enabled;
    this.emitChange();

    this.router.socket.emit("enabled", enabled);
  }
}
