import Router from "./Router";
import config from "./config";
import utils from "../utils";
import RemoteKeyboard from "../../utils/RemoteKeyboard";

function run(app, socket) {
  let router = new Router(socket);
  let remoteKeyboard = new RemoteKeyboard(config.REMOTE_KEYBOARD_PORT, config.REMOTE_KEYBOARD_HOST);

  utils.useLaunchControl();
  utils.useMIDIKeyboard();
  utils.useOSCReceiver();
  utils.dispatcher.register(router);
  utils.dispatcher.register(remoteKeyboard);

  router.createAction("/sound/load/score", { name: config.DEFAULT_SONG });

  app.on("/app/delegate", ({ address, data }) => {
    router.createAction(address, data);
  });

  return router;
}

export default { run };
