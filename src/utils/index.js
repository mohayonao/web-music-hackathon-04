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

function getItem(object, keys) {
  for (let i = 0, imax = keys.length; i < imax; i++) {
    if (typeof object[keys[i]] === "undefined") {
      return null;
    }
    object = object[keys[i]];
  }

  return object;
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

function removeItem(object, keys) {
  if (keys.length === 0) {
    return object;
  }

  for (let i = 0, imax = keys.length - 1; i < imax; i++) {
    if (typeof object[keys[i]] === "undefined") {
      return null;
    }
    object = object[keys[i]];
  }

  if (object === null || typeof object !== "object") {
    return null;
  }

  let value = object[keys[keys.length - 1]];

  delete object[keys[keys.length - 1]];

  return value;
}

function sample(list) {
  return list[(Math.random() * list.length)|0];
}

function setItem(object, value, keys) {
  if (keys.length === 0) {
    return object;
  }

  for (let i = 0, imax = keys.length - 1; i < imax; i++) {
    if (typeof object[keys[i]] === "undefined") {
      return null;
    }
    object = object[keys[i]];
  }

  if (object === null || typeof object !== "object") {
    return null;
  }

  return (object[keys[keys.length - 1]] = value);
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
  getItem,
  linexp,
  linlin,
  midicps,
  once,
  removeIfExists,
  removeItem,
  sample,
  setItem,
  symbol,
  wrapAt,
};
