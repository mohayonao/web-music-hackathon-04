import xtend from "xtend";
import config from "../config";

export default xtend(config, {
  DEFAULT_PARAMS: [
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 64,
  ],
});
