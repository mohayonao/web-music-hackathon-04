import StandaloneApp from "./components/StandaloneApp";
import Router from "./Router";

function run() {
  let router = new Router();

  React.render(
    React.createElement(StandaloneApp, { router }),
    document.getElementById("app")
  );
}

export default { run };
