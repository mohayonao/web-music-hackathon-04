import fluxx from "@mohayonao/remote-fluxx";

export default class ServerAction extends fluxx.Action {
  ["/server/sendState"](data) {
    this.doneAction("/launch-control/params/update", { params: new Uint8Array(data.params) });
    this.doneAction("/sequencer/state", { state: data.state });
    this.doneAction("/server/state", { connected: data.connected });
  }

  ["/server/play"](data) {
    this.doneAction("/sequencer/play", data);
  }
}
