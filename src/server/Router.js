import subote from "subote";
import logger from "./logger";
import utils from "./utils";

const INITIALIZE = Symbol("INITIALIZE");

export default class Router extends subote.Server {
  constructor(...args) {
    super(...args);

    this.shared.enabledClients = [];

    this[INITIALIZE]();
  }

  [INITIALIZE]() {
    let log = (cap, client) => {
      let clientId = client.id;
      let numOfClient = this.clients.length;
      let numOfEnabledClient = this.shared.enabledClients.length;

      logger.log("%s %s (%d users / %d enabled)", cap, clientId, numOfClient, numOfEnabledClient);
    };

    this.on("connect", ({ client }) => {
      client.on("ping", () => {
        client.emit("pong", Date.now());
      });

      client.on("enabled", (value) => {
        if (value) {
          utils.appendIfNotExists(this.shared.enabledClients, client);
        } else {
          utils.removeIfExists(this.shared.enabledClients, client);
        }
        log(" ", client);
      });
      log("+", client);
    });

    this.on("disconnect", ({ client }) => {
      utils.removeIfExists(this.shared.enabledClients, client);
      log("-", client);
    });
  }
}
