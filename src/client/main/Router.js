import fluxx from "@mohayonao/remote-fluxx";
import SyncDate from "./SyncDate";
import actions from "./actions";
import stores from "./stores";

export default class Router extends fluxx.Client {
  constructor(...args) {
    super(...args);

    this.actions = Object.keys(actions).map(className => new actions[className](this));
    this.stores = Object.keys(stores).map(className => new stores[className](this));

    this._syncTimes = [];
  }

  syncTime() {
    let beginTime = Date.now();

    this.socket.emit("ping");
    this.socket.once("pong", (serverCurrentTime) => {
      let endTime = Date.now();
      let elapsed = endTime - beginTime;
      let currentTime = endTime - (elapsed * 0.5);
      let deltaTime = serverCurrentTime - currentTime;

      this._syncTimes.push(deltaTime);

      if (this._syncTimes.length < 5) {
        return setTimeout(() => this.syncTime(), 100);
      }

      this._syncTimes.shift();

      let averageDeltaTime = this._syncTimes.reduce((a, b) => a + b, 0) / this._syncTimes.length;

      SyncDate.setDeltaTime(Math.round(averageDeltaTime));

      this._syncTimes = [];

      setTimeout(() => this.syncTime(), 1000 * 30);
    });
  }
}
