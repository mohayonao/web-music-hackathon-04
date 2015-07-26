global.AudioContext = global.AudioContext || global.webkitAudioContext;
global.OfflineAudioContext = global.OfflineAudioContext || global.webkitOfflineAudioContext;

global.fetch = global.fetch || function(url) {
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();

    xhr.open("GET", url);

    if (/\.(?:wav|mp3|off|aiff)$/.test(url)) {
      xhr.responseType = "arraybuffer";
    }

    xhr.onload = () => {
      resolve({
        text() {
          return xhr.response;
        },
        json() {
          return JSON.parse(xhr.response);
        },
        arrayBuffer() {
          return xhr.response;
        },
      });
    };
    xhr.onerror = reject;
    xhr.send();
  });
};

global.React = global.React || {
  Component: class Component {},
};

global.setImmediate = global.setImmediate || function(callback) {
  setTimeout(callback, 0);
};

let AnalyserNode = global.AnalyserNode;

function installGetFloatTimeDomainData() {
  if (AnalyserNode.prototype.hasOwnProperty("getFloatTimeDomainData")) {
    return;
  }

  let uint8 = new Uint8Array(2048);

  AnalyserNode.prototype.getFloatTimeDomainData = function(array) {
    this.getByteTimeDomainData(uint8);
    for (let i = 0, imax = array.length; i < imax; i++) {
      array[i] = (uint8[i] - 128) * 0.0078125;
    }
  };
}

installGetFloatTimeDomainData();
