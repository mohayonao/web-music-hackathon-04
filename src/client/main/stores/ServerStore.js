import fluxx from "@mohayonao/remote-fluxx";

export default class ServerStore extends fluxx.Store {
  getInitialState() {
    return {
      connected: 0,
    };
  }

  ["/server/state"]({ connected }) {
    this.data.connected = connected;
    this.emitChange();
  }
}
