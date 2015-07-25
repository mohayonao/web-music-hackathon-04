import StandaloneApp from "./components/StandaloneApp";
import Router from "./Router";
import utils from "./utils";

function run() {
  let router = new Router();

  utils.chore();

  router.createAction("/midi-device/request");
  router.createAction("/storage/get");

  React.render(
    React.createElement(StandaloneApp, { router }),
    document.getElementById("app")
  );

  return router;
}

export default { run };
