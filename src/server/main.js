import Router from "./Router";

function run(socket) {
  let router = new Router(socket);

  return router;
}

export default { run };
