import fluxx from "@mohayonao/remote-fluxx";
import utils from "../../utils";

export default class ServerStore extends fluxx.Store {
  getInitialState() {
    return {
      enabledClients: [],
    };
  }

  ["/connected"]({ client }) {
    client.$pendings = [];

    client.on("enabled", (value) => {
      if (value) {
        utils.appendIfNotExists(this.data.enabledClients, client);
      } else {
        utils.removeIfExists(this.data.enabledClients, client);
      }
      this.emitChange();
    });

    this.emitChange();
  }

  ["/disconnected"]({ client }) {
    utils.removeIfExists(this.data.enabledClients, client);
    this.emitChange();
  }
}
