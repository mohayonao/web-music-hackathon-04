import path from "path";
import express from "express";
import http from "http";
import socketIO from "socket.io";
import logger from "./logger";
import config from "./config";
import utils from "./utils";
import main from "./main";

let app = express();
let server = http.createServer(app);
let socket = socketIO(server);

app.use(express.static(path.join(__dirname, "../../public")));

app.get(/^\/(start|stop)$/, (req, res) => {
  if (req.headers.host !== `127.0.0.1:${config.SERVER_PORT}`) {
    return res.status(400).send("Bad Request\n");
  }

  let action = req.params[0];

  app.emit("/app/delegate", { address: `/sequencer/${action}` });
  res.send(`OK: ${action} sequencer\n`);
});

app.get(/^\/(pad|knob[12])\/(\d+)(?:\/(\d+))?$/, (req, res) => {
  if (req.headers.host !== `127.0.0.1:${config.SERVER_PORT}`) {
    return res.status(400).send("Bad Request\n");
  }

  let target = req.params[0];
  let track = +req.params[1];
  let value = utils.constrain(+req.params[2] || 0, 0, 127);

  if (0 <= track && track < 8) {
    app.emit("/app/delegate", { address: `/launch-control/${target}`, data: { track, value } });
    res.send(`OK: update ${target}[${track}] = ${value}\n`);
  } else {
    res.status(400).send("Bad Request\n");
  }
});

app.get("/bang", (req, res) => {
  app.emit("/app/delegate", { address: "/bang" });
  res.send("OK: BANG!!\n");
});

server.listen(config.SERVER_PORT, () => {
  logger.info("Listening HTTP on port %d", server.address().port);
});

main.run(app, socket);
