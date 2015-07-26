import dateformat from "dateformat";
import colors from "colors";
import utils from "../utils";
import config from "./config";

const DEBUG = 0, LOG = 1, INFO = 2, WARN = 3, ERROR = 4;

const LOG_LEVEL = utils.defaults({
  DEBUG, LOG, INFO, WARN, ERROR,
}[config.LOG_LEVEL.toUpperCase()], LOG);

function log(fmt, args) {
  let text = "[" + dateformat(new Date(), "HH:MM:ss") + "] " + fmt;

  global.console.log(text, ...args);
}

export default {
  debug(fmt, ...args) {
    if (LOG_LEVEL <= DEBUG) {
      log(colors.gray(fmt), args);
    }
  },
  log(fmt, ...args) {
    if (LOG_LEVEL <= LOG) {
      log(fmt, args);
    }
  },
  info(fmt, ...args) {
    if (LOG_LEVEL <= INFO) {
      log(colors.green(fmt), args);
    }
  },
  warn(fmt, ...args) {
    if (LOG_LEVEL <= WARN) {
      log(colors.yellow(fmt), args);
    }
  },
  error(fmt, ...args) {
    if (LOG_LEVEL <= ERROR) {
      log(colors.red.underline(fmt), args);
    }
  },
};
