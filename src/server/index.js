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

server.listen(config.SERVER_PORT, () => {
  logger.info("Listening HTTP on port %d", server.address().port);
});

main.run(socket);
