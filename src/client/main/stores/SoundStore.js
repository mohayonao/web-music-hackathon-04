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

  ["/orientation"]({ point }) {
      console.log('test orientation');
      console.log('x:', point.x, ', y:', point.y);
      this.router.sendAction('/orientationSend', {
          x: point.x,
          y: point.y
      });
      //this.router.sendAction('/orientationSend', point.x, point.y);
  }

  ["/mybtn"]() {
      console.log('mybtn test');
      this.router.sendAction('/mybtn');
  }
}
