import Instrument, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "../Instrument";
// import Envelope from "@mohayonao/envelope";
// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";
// import utils from "./utils";
//
// const RELEASE_TIME = 0.025;
// const GAIN_UP = 1;

export default class Template extends Instrument {
  [INITIALIZE]() {}

  [CREATE]() {}

  [NOTE_ON]() {}

  [NOTE_OFF]() {}

  [DISPOSE]() {}
}
