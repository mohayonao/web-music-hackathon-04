import fluxx from "@mohayonao/remote-fluxx";

export default class ServerAction extends fluxx.Action {
  ["/server/setState"](data) {
    this.doneAction("/launch-control/params/update", { params: new Uint8Array(data.params) });
    this.doneAction("/sound/sequencer/state", { state: data.state });
    this.doneAction("/server/state", { connected: data.connected });
  }
}
