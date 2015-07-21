import fluxx from "@mohayonao/remote-fluxx";

export default class ServerAction extends fluxx.Action {
  ["/connected"]({ client }) {
    this.doneAction("/connected", { client });
  }

  ["/disconnected"]({ client }) {
    this.doneAction("/disconnected", { client });
  }
}
