import dateformat from "dateformat";
import colors from "colors";

function log(fmt, args) {
  let text = "[" + dateformat(new Date(), "HH:MM:ss") + "] " + fmt;

  global.console.log(text, ...args);
}

export default {
  debug(fmt, ...args) {
    log(colors.gray(fmt), args);
  },
  log(fmt, ...args) {
    log(fmt, args);
  },
  info(fmt, ...args) {
    log(colors.green(fmt), args);
  },
  warn(fmt, ...args) {
    log(colors.yellow(fmt), args);
  },
  error(fmt, ...args) {
    log(colors.red.underline(fmt), args);
  },
};
