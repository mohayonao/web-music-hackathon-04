import StandaloneApp from "./components/StandaloneApp";
import Router from "./Router";
import WebAudioUtils from "../../utils/WebAudioUtils";
import config from "./config";

function run() {
  let router = new Router();

  WebAudioUtils.chore();

  router.createAction("/sound/load/score", { name: config.DEFAULT_SONG });
  router.createAction("/midi-device/request");

  React.render(
    React.createElement(StandaloneApp, { router }),
    document.getElementById("app")
  );

  return router;
}

export default { run };
