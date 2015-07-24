function appendIfNotExists(list, value) {
  let index = list.indexOf(value);

  if (index === -1) {
    list.push(value);
  }
}

function constrain(value, minValue, maxValue) {
  return Math.max(minValue, Math.min(value, maxValue));
}

function dbamp(db) {
  return Math.pow(10, db * 0.05);
}

function debounce(func, wait) {
  let timerId = 0;

  return function(...args) {
    if (timerId !== 0) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      func(...args);
      timerId = 0;
    }, wait);
  };
}

function defaults(value, defaultValue) {
  return typeof value !== "undefined" ? value : defaultValue;
}

function finedetune(fine) {
  let sign = fine < 0 ? -1 : +1;

  return sign * Math.log((Math.abs(fine) + 1000) / 1000) / Math.log(Math.pow(2, 1 / 12)) * 100;
}

function linexp(value, inMin, inMax, outMin, outMax) {
  return Math.pow(outMax / outMin, (value - inMin) / (inMax - inMin)) * outMin;
}

function linlin(value, inMin, inMax, outMin, outMax) {
  return (value - inMin) / (inMax - inMin) * (outMax - outMin) + outMin;
}

function midicps(midi) {
  return 440 * Math.pow(2, (midi - 69) * 1 / 12);
}

function once(func) {
  let done = false, result;

  return function(...args) {
    if (!done) {
      result = func(...args);
      done = true;
    }
    return result;
  };
}

function removeIfExists(list, value) {
  let index = list.indexOf(value);

  if (index !== -1) {
    list.splice(index, 1);
  }
}

function sample(list) {
  return list[(Math.random() * list.length)|0];
}

function symbol(str) {
  return typeof Symbol !== "undefined" ? Symbol(str) : (str + Date.now());
}

function wrapAt(list, index) {
  index = (index|0) % list.length;

  if (index < 0) {
    index += list.length;
  }

  return list[index];
}

export default {
  appendIfNotExists,
  constrain,
  dbamp,
  debounce,
  defaults,
  finedetune,
  linexp,
  linlin,
  midicps,
  once,
  removeIfExists,
  sample,
  symbol,
  wrapAt,
};
