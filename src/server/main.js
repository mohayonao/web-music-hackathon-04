import Router from "./Router";
import config from "./config";
import utils from "./utils";
import RemoteKeyboard from "./RemoteKeyboard";

function run(socket) {
  let router = new Router(socket);
  let remoteKeyboard = new RemoteKeyboard(config.REMOTE_KEYBOARD_PORT, config.REMOTE_KEYBOARD_HOST);

  utils.useLaunchControl();
  utils.useMIDIKeyboard();
  utils.useOSCReceiver();
  utils.dispatcher.register(router);
  utils.dispatcher.register(remoteKeyboard);

  return router;
}

export default { run };
