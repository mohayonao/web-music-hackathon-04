import Router from "./Router";

function run() {
  let socket = window.io();
  let router = new Router(socket);

  router.syncTime();

  document.getElementById("button").addEventListener("click", (e) => {
    router.click(e);
  });

  window.socket = socket;

  return router;
}

export default { run };
