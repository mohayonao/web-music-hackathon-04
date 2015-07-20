import xtend from "xtend";
import config from "../config";

export default xtend(config, {
  MAX_NOTES: 240000,
  SEQUENCE_OFFSET_TIME: 1,
});
