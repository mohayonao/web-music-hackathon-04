import path from "path";
import express from "express";
import http from "http";
import socketIO from "socket.io";
import logger from "./logger";
import config from "./config";
import main from "./main";

let app = express();
let server = http.createServer(app);
let socket = socketIO(server);

app.use(express.static(path.join(__dirname, "../../public")));

app.get("/start", (req, res) => {
  if (req.headers.host !== `127.0.0.1:${config.SERVER_PORT}`) {
    return res.status(400).send("Bad Request\n");
  }

  app.emit("/app/delegate", { address: "/sequencer/start" });
  res.send("OK: Start Sequencer\n");
});

app.get("/pad", (req, res) => {
  if (req.headers.host !== `127.0.0.1:${config.SERVER_PORT}`) {
    return res.status(400).send("Bad Request\n");
  }

  app.emit("/app/delegate", { address: "/launch-control/pad", data:{
      track: 2
  }});
  res.send("OK: Start Sequencer\n");
});

app.get("/stop", (req, res) => {
  if (req.headers.host !== `127.0.0.1:${config.SERVER_PORT}`) {
    return res.status(400).send("Bad Request\n");
  }

  app.emit("/app/delegate", { address: "/sequencer/stop" });
  res.send("OK: Stop Sequencer\n");
});

app.get("/bang", (req, res) => {
  app.emit("/app/delegate", { address: "/bang" });
  res.send("OK: BANG!!\n");
});

server.listen(config.SERVER_PORT, () => {
  logger.info("Listening HTTP on port %d", server.address().port);
});

main.run(app, socket);
