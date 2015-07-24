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

function range(value) {
  let a = [];

  if (typeof value === "string") {
    return rangeFromString(value);
  } else if (typeof value === "number") {
    return rangeFromNumber(value);
  }

  return a;
}

function rangeFromNumber(value) {
  let a = [];
  let first = 0;
  let last = value;
  let step = (first < last) ? +1 : -1;
  let i = 0;
  let x = first;

  while (x <= last) {
    a[i++] = x;
    x += step;
  }

  return a;
}

const RangeRE = /^\s*(?:([-+]?(?:\d+|\d+\.\d+))\s*,\s*)?([-+]?(?:\d+|\d+\.\d+))(?:\s*\.\.(\.?)\s*([-+]?(?:\d+|\d+\.\d+)))?\s*$/;

function rangeFromString(value) {
  let m;

  if ((m = RangeRE.exec(value)) === null) {
    return [];
  }

  let a = [];
  let first, last, step;

  if (typeof m[4] === "undefined") {
    first = 0;
    last = +m[2];
    step = (0 < last) ? +1 : -1;
  } else if (typeof m[1] === "undefined") {
    first = +m[2];
    last = +m[4];
    step = (first < last) ? +1 : -1;
  } else {
    first = +m[1];
    last = +m[4];
    step = +m[2] - first;
  }

  let i = 0;
  let x = first;

  if (m[3] && 0 < step) {
    while (x < last) {
      a[i++] = x; x += step;
    }
  } else if (m[3]) {
    while (x > last) {
      a[i++] = x; x += step;
    }
  } else if (0 < step) {
    while (x <= last) {
      a[i++] = x; x += step;
    }
  } else {
    while (x >= last) {
      a[i++] = x; x += step;
    }
  }

  return a;
}

function removeIfExists(list, value) {
  let index = list.indexOf(value);

  if (index !== -1) {
    list.splice(index, 1);
  }
}

function sample(list, rand = Math.random()) {
  return list[(rand() * list.length)|0];
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

function wsample(list, weights, rand = Math.random()) {
  let sum = 0;

  let weightsSum = weights.reduce((a, b) => a + b, 0);

  for (let i = 0, imax = weights.length; i < imax; ++i) {
    sum += weights[i] / weightsSum;
    if (sum >= rand()) {
      return this[i];
    }
  }
  return this[weights.length - 1];
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
  range,
  removeIfExists,
  sample,
  symbol,
  wrapAt,
  wsample,
};
