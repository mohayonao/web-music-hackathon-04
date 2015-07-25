import fluxx from "@mohayonao/remote-fluxx";
import utils from "../utils";

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

  ["/orientation"]({ point }) {
      this.router.sendAction('/orientationReturn', {
          point: {
              x: point.x,
              y: point.y
          }
      });
      //this.router.sendAction('/orientationReturn', point.x, point.y);
  }

  ["/mybtn"]({ client }) {
      this.router.sendAction('/mybtn');
      //this.clients[0].sendAction('/mybtn');
  }
}
