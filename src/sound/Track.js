import EventEmitter from "@mohayonao/event-emitter";
import utils from "./utils";

export const PROCESS = utils.symbol("PROCESS");

export default class Track extends EventEmitter {
  push(data) {
    this[PROCESS](data);
  }

  [PROCESS](data) {
    this.emit("play", data);
  }
}
