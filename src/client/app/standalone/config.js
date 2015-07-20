import xtend from "xtend";
import config from "../../config";

export default xtend(config, {
  SEQUENCE_OFFSET_TIME: 0,
  SEQUENCER_INTERVAL: 0.1,
  TICKS_PER_BEAT: 120,
});