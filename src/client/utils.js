import xtend from "xtend";
import utils from "../utils";

function getPerformanceLevel() {
  let canvas = document.createElement("canvas");

  if (!canvas) {
    return 0;
  }

  let gl = canvas.getContext("webgl");

  if (!gl) {
    return 0;
  }

  const GPU_VERSION = gl.getParameter(gl.VERSION);
  const USER_AGENT = navigator.userAgent;

  // iOS
  if (/iPhone|iPad|iPod/.test(USER_AGENT)) {
    // iPhone 4s/5/5c, iPad 2/3, iPad mini
    if (/543/.test(GPU_VERSION)) {
      return 1;
    }

    // iPad 4, iPhone 5s, iPad mini 2/3, iPad Air, iPhone 6/6+, iPad Air 2
    if (/554|A7|A8/.test(GPU_VERSION)) {
      return 2;
    }

    // iPhone 3GS, iPhone 4, iPod touch
    return 0;
  }

  // Android
  if (/Android/.test(USER_AGENT)) {
    return 0;
  }

  // PC
  if (/Windows|Mac OS X/.test(USER_AGENT)) {
    return 2;
  }

  // others
  return 0;
}

export default xtend(utils, {
  getPerformanceLevel: utils.once(getPerformanceLevel),
});
