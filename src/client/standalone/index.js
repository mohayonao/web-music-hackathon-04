import StandaloneApp from "./components/StandaloneApp";
import Router from "./Router";
import WebAudioUtils from "../../utils/WebAudioUtils";

function run() {
  let router = new Router();

  WebAudioUtils.chore();

  router.createAction("/midi-device/request");
  router.createAction("/storage/get");

  React.render(
    React.createElement(StandaloneApp, { router }),
    document.getElementById("app")
  );

  return router;
}

export default { run };
