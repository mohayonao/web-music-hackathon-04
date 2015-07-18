function appendIfNotExists(list, value) {
  let index = list.indexOf(value);

  if (index === -1) {
    list.push(value);
  }
}

function defaults(value, defaultValue) {
  return typeof value !== "undefined" ? value : defaultValue;
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

function removeIfExists(list, value) {
  let index = list.indexOf(value);

  if (index !== -1) {
    list.splice(index, 1);
  }
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

export default {
  appendIfNotExists,
  defaults,
  getItem,
  linexp,
  linlin,
  midicps,
  removeIfExists,
  sample,
  setItem,
};
