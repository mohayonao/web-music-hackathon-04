import EventEmitter from "@mohayonao/event-emitter";
import utils from "./utils";
import config from "../config";

export const PROCESS = utils.symbol("PROCESS");
export const UPDATE_STATE = utils.symbol("UPDATE_STATE");

export default class Track extends EventEmitter {
  constructor(timeline) {
    super();

    this.timeline = timeline;
    this.ticksPerBeat = 480;
    this.tempo = 120;
    this.params = new Uint8Array(config.DEFAULT_PARAMS);
  }

  setState({ ticksPerBeat, tempo, params }) {
    this.ticksPerBeat = ticksPerBeat;
    this.tempo = tempo;
    this.params = params;
    this[UPDATE_STATE]({ ticksPerBeat, tempo, params });
  }

  push(data) {
    this[PROCESS](data);
  }

  [UPDATE_STATE]() {}

  [PROCESS]() {}
}
