import xtend from "xtend";
import utils from "../utils";

function symbol(str) {
  return typeof Symbol !== "undefined" ? Symbol(str) : (str + Date.now());
}

export default xtend(utils, {
  symbol,
});
