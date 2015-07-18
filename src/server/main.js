import Router from "./Router";
import utils from "./utils";

function run(socket) {
  let router = new Router(socket);

  utils.useLaunchControl();
  utils.useMIDIKeyboard();
  utils.useOSCReceiver();
  utils.dispatcher.register(router);

  return router;
}

export default { run };
