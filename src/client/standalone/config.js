import utils from "./utils";
import config from "../config";

export default utils.xtend(config, {
  SEQUENCE_OFFSET_TIME: 0,
  SEQUENCER_INTERVAL: 0.1,
});
