(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Hackathon = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var TIME = 0;
var VALUE = 1;
var CURVE = 2;
var COMPUTED_TIME = 3;
var LINEAR = 0;
var EXPONENTIAL = 1;
var ZERO = 1e-4;
var PARAMS = typeof Symbol !== "undefined" ? Symbol("PARAMS") : "_@mohayonao/envelope:PARAMS";
var COMPUTED_PARAMS = typeof Symbol !== "undefined" ? Symbol("COMPUTED_PARAMS") : "_@mohayonao/envelope:COMPUTED_PARAMS";
var DURATION = typeof Symbol !== "undefined" ? Symbol("DURATION") : "_@mohayonao/envelope:DURATION";
var PREV_SEARCH_INDEX = typeof Symbol !== "undefined" ? Symbol("PREV_SEARCH_INDEX") : "_@mohayonao/envelope:PREV_SEARCH_INDEX";
var PREV_SEARCH_TIME = typeof Symbol !== "undefined" ? Symbol("PREV_SEARCH_TIME") : "_@mohayonao/envelope:PREV_SEARCH_TIME";

function Envelope(params) {
  var duration = 0;

  if (!validate(params)) {
    throw new TypeError("The 1st argument must be [ number, number ][]");
  }

  this[PARAMS] = params;
  this[COMPUTED_PARAMS] = params.map(function(items) {
    var time = Math.max(0, items[TIME]);
    var value = items[VALUE];
    var curve = Math.max(0, Math.min(items[CURVE]|0, 1));

    duration += time;

    return [ time, value, curve, duration ];
  });
  this[DURATION] = duration;
  this[PREV_SEARCH_INDEX] = 0;
  this[PREV_SEARCH_TIME] = 0;
}

Envelope.adssr = function(attackTime, decayTime, sustainLevel, sustainTime, releaseTime, totalLevel) {
  totalLevel = defaults(totalLevel, 1);

  return new Envelope([
    [ 0, 0, LINEAR ],
    [ attackTime, totalLevel, LINEAR ],
    [ decayTime, sustainLevel * totalLevel, EXPONENTIAL ],
    [ sustainTime, sustainLevel * totalLevel, LINEAR ],
    [ releaseTime, ZERO, EXPONENTIAL ],
    [ 0, 0, LINEAR ],
  ]);
};

Envelope.ads = function(attackTime, decayTime, sustainLevel, totalLevel) {
  totalLevel = defaults(totalLevel, 1);

  return new Envelope([
    [ 0, 0, LINEAR ],
    [ attackTime, totalLevel, LINEAR ],
    [ decayTime, sustainLevel * totalLevel, EXPONENTIAL ],
  ]);
};

Envelope.asr = function(attackTime, sustainTime, releaseTime, totalLevel) {
  totalLevel = defaults(totalLevel, 1);

  return new Envelope([
    [ 0, 0, LINEAR ],
    [ attackTime, totalLevel, LINEAR ],
    [ sustainTime, totalLevel, LINEAR ],
    [ releaseTime, ZERO, EXPONENTIAL ],
    [ 0, 0, LINEAR ],
  ]);
};

Envelope.a = function(attackTime, totalLevel) {
  totalLevel = defaults(totalLevel, 1);

  return new Envelope([
    [ 0, 0, LINEAR ],
    [ attackTime, totalLevel, LINEAR ],
  ]);
};

Envelope.dssr = function(decayTime, sustainLevel, sustainTime, releaseTime, totalLevel) {
  totalLevel = defaults(totalLevel, 1);

  return new Envelope([
    [ 0, totalLevel, LINEAR ],
    [ decayTime, sustainLevel * totalLevel, EXPONENTIAL ],
    [ sustainTime, sustainLevel * totalLevel, LINEAR ],
    [ releaseTime, ZERO, EXPONENTIAL ],
    [ 0, 0, LINEAR ],
  ]);
};

Envelope.ds = function(decayTime, sustainLevel, totalLevel) {
  totalLevel = defaults(totalLevel, 1);

  return new Envelope([
    [ 0, totalLevel, LINEAR ],
    [ decayTime, sustainLevel * totalLevel, EXPONENTIAL ],
  ]);
};

Envelope.r = function(releaseTime, totalLevel) {
  totalLevel = defaults(totalLevel, 1);

  return new Envelope([
    [ 0, totalLevel, LINEAR ],
    [ releaseTime, ZERO, EXPONENTIAL ],
    [ 0, 0, LINEAR ],
  ]);
};

Envelope.cutoff = function(releaseTime, totalLevel) {
  totalLevel = defaults(totalLevel, 1);

  return new Envelope([
    [ 0, totalLevel, LINEAR ],
    [ releaseTime, 0, LINEAR ],
  ]);
};

Object.defineProperties(Envelope.prototype, {
  params: {
    get: function() {
      return this[PARAMS].map(function(items) {
        return items.slice();
      });
    },
    configurable: true, enumerable: false,
  },
  duration: {
    get: function() {
      return this[DURATION];
    },
    configurable: true, enumerable: false,
  },
});

Envelope.prototype.valueAt = function(time) {
  var params = this[COMPUTED_PARAMS];
  var fromIndex, index, x0, x1;

  if (params.length === 0) {
    return 0;
  }

  if (time <= 0) {
    return params[0][VALUE];
  }

  if (this[DURATION] <= time) {
    return params[params.length - 1][VALUE];
  }

  if (this[PREV_SEARCH_TIME] <= time) {
    fromIndex = this[PREV_SEARCH_INDEX];
  } else {
    fromIndex = 0;
  }

  index = indexAt(params, time, fromIndex);
  x0 = clipAt(params, index - 1);
  x1 = clipAt(params, index);

  this[PREV_SEARCH_TIME] = time;
  this[PREV_SEARCH_INDEX] = index;

  if (x1[CURVE] === EXPONENTIAL) {
    return linexp(time, x0[COMPUTED_TIME], x1[COMPUTED_TIME], x0[VALUE], x1[VALUE]);
  }

  return linlin(time, x0[COMPUTED_TIME], x1[COMPUTED_TIME], x0[VALUE], x1[VALUE]);
};

Envelope.prototype.applyTo = function(audioParam, playbackTime) {
  var params = this[COMPUTED_PARAMS];
  var i, imax;
  var time, prevValue, prevTime;

  if (params.length) {
    imax = params.length;

    time = params[0][COMPUTED_TIME] + playbackTime;
    prevValue = params[0][VALUE];
    prevTime = time;

    for (i = 1; i < imax; i++) {
      time = params[i][COMPUTED_TIME] + playbackTime;

      if (params[i][VALUE] === prevValue) {
        audioParam.setValueAtTime(params[i][VALUE], time);
      } else {
        if (time === prevTime) {
          time += 0.0001;
        }
        audioParam.setValueAtTime(prevValue, prevTime);
        if (params[i][CURVE] === EXPONENTIAL) {
          audioParam.exponentialRampToValueAtTime(params[i][VALUE], time);
        } else {
          audioParam.linearRampToValueAtTime(params[i][VALUE], time);
        }
      }

      prevValue = params[i][VALUE];
      prevTime = time;
    }
  }

  return this;
};

Envelope.prototype.map = function(fn) {
  return new Envelope(this[PARAMS].map(fn));
};

Envelope.prototype.madd = function(mul, add) {
  mul = defaults(mul, 1);
  add = defaults(add, 0);

  return new Envelope(this[PARAMS].map(function(items) {
    return [ items[TIME], items[VALUE] * mul + add, items[CURVE] ];
  }));
};

function defaults(value, defalutValue) {
  return typeof value !== "undefined" ? value : defalutValue;
}

function validate(params) {
  return Array.isArray(params) && params.every(function(items) {
    return Array.isArray(items) && typeof items[0] === "number" && typeof items[1] === "number";
  });
}

function indexAt(params, time, fromIndex) {
  var i, imax;

  for (i = fromIndex, imax = params.length; i < imax; i++) {
    if (time < params[i][COMPUTED_TIME]) {
      return i;
    }
  }

  return params.length - 1;
}

function clipAt(list, index) {
  return list[Math.max(0, Math.min(index, list.length - 1))];
}

function linlin(value, inMin, inMax, outMin, outMax) {
  return (value - inMin) / (inMax - inMin) * (outMax - outMin) + outMin;
}

function linexp(value, inMin, inMax, outMin, outMax) {
  return Math.pow(outMax / outMin, (value - inMin) / (inMax - inMin)) * outMin;
}

module.exports = Envelope;

},{}],2:[function(require,module,exports){
"use strict";

var LISTENERS = typeof Symbol !== "undefined" ? Symbol("LISTENERS") : "_@mohayonao/event-emitter:listeners";

function EventEmitter() {
  this[LISTENERS] = {};
}

EventEmitter.prototype.listeners = function(event) {
  if (this[LISTENERS].hasOwnProperty(event)) {
    return this[LISTENERS][event].map(function(listener) {
      return listener.listener || listener;
    }).reverse();
  }

  return [];
};

EventEmitter.prototype.addListener = function(event, listener) {
  if (typeof listener === "function") {
    if (!this[LISTENERS].hasOwnProperty(event)) {
      this[LISTENERS][event] = [ listener ];
    } else {
      this[LISTENERS][event].unshift(listener);
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(event, listener) {
  var _this, func;

  _this = this;

  if (typeof listener === "function") {
    func = function(arg1) {
      _this.removeListener(event, func);
      listener(arg1);
    };

    func.listener = listener;

    this.addListener(event, func);
  }

  return this;
};

EventEmitter.prototype.removeListener = function(event, listener) {
  var listeners, i;

  if (typeof listener === "function" && this[LISTENERS].hasOwnProperty(event)) {
    listeners = this[LISTENERS][event];

    for (i = listeners.length - 1; i >= 0; i--) {
      if (listeners[i] === listener || listeners[i].listener === listener) {
        listeners.splice(i, 1);
        break;
      }
    }
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(event) {
  if (typeof event === "undefined") {
    this[LISTENERS] = {};
  } else if (this[LISTENERS].hasOwnProperty(event)) {
    delete this[LISTENERS][event];
  }

  return this;
};

EventEmitter.prototype.emit = function(event, arg1) {
  var listeners, i;

  if (this[LISTENERS].hasOwnProperty(event)) {
    listeners = this[LISTENERS][event];

    for (i = listeners.length - 1; i >= 0; i--) {
      listeners[i](arg1);
    }
  }

  return this;
};

module.exports = EventEmitter;

},{}],3:[function(require,module,exports){
module.exports = require("./lib");

},{"./lib":7}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _FMSynthUtils = require("./FMSynthUtils");

var _FMSynthUtils2 = _interopRequireDefault(_FMSynthUtils);

var OUTLETS = typeof Symbol !== "undefined" ? Symbol("OUTLETS") : "_@mohayonao/operator:OUTLETS";
var OPERATORS = typeof Symbol !== "undefined" ? Symbol("OPERATORS") : "_@mohayonao/operator:OPERATORS";
var ALGORITHM = typeof Symbol !== "undefined" ? Symbol("ALGORITHM") : "_@mohayonao/operator:ALGORITHM";
var ONENDED = typeof Symbol !== "undefined" ? Symbol("ONENDED") : "_@mohayonao/operator:ONENDED";

var FMSynth = (function () {
  function FMSynth(algorithm, operators) {
    _classCallCheck(this, FMSynth);

    var outlets = _FMSynthUtils2["default"].build(algorithm, operators);

    this[OUTLETS] = outlets;
    this[OPERATORS] = operators;
    this[ALGORITHM] = algorithm;
    this[ONENDED] = findOnEndedNode(operators);
  }

  _createClass(FMSynth, [{
    key: "connect",
    value: function connect(destination) {
      this[OUTLETS].forEach(function (outlet) {
        outlet.connect(destination);
      });
    }
  }, {
    key: "disconnect",
    value: function disconnect() {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      this[OUTLETS].forEach(function (outlet) {
        outlet.disconnect.apply(outlet, args);
      });
    }
  }, {
    key: "start",
    value: function start(when) {
      this[OPERATORS].forEach(function (op) {
        if (op && typeof op.start === "function") {
          op.start(when);
        }
      });
    }
  }, {
    key: "stop",
    value: function stop(when) {
      this[OPERATORS].forEach(function (op) {
        if (op && typeof op.stop === "function") {
          op.stop(when);
        }
      });
    }
  }, {
    key: "context",
    get: function get() {
      return this[OUTLETS][0].context;
    }
  }, {
    key: "operators",
    get: function get() {
      return this[OPERATORS].slice();
    }
  }, {
    key: "algorithm",
    get: function get() {
      return this[ALGORITHM];
    }
  }, {
    key: "onended",
    get: function get() {
      return this[ONENDED].onended;
    },
    set: function set(value) {
      this[ONENDED].onended = value;
    }
  }]);

  return FMSynth;
})();

exports["default"] = FMSynth;

function findOnEndedNode(operators) {
  for (var i = 0, imax = operators.length; i < imax; i++) {
    if (typeof operators[i].onended !== "undefined") {
      return operators[i];
    }
  }

  return { onended: null };
}
module.exports = exports["default"];
},{"./FMSynthUtils":5}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _algorithms = require("./algorithms");

var _algorithms2 = _interopRequireDefault(_algorithms);

function build(pattern, operators) {
  var algorithm = null;

  if (typeof pattern === "number") {
    algorithm = _algorithms2["default"][operators.length] && _algorithms2["default"][operators.length][pattern] || null;
  } else {
    algorithm = "" + pattern;
  }

  if (26 < operators.length) {
    throw new TypeError("too many operator");
  }
  if (algorithm === null) {
    throw new TypeError("not found algorithm " + pattern + " for " + operators.length + " operators");
  }
  if (!isValidAlgorithm(algorithm, operators.length)) {
    throw new TypeError("invalid algorithm: " + algorithm);
  }

  function findOperatorByName(name) {
    return operators[name.toUpperCase().charCodeAt(0) - 65];
  }

  var outlets = [];
  var graph = {};

  algorithm.replace(/\s+|-/g, "").split(";").forEach(function (algorithm) {
    var tokens = algorithm.split("");
    var token = undefined,
        node = undefined;

    while (!node && tokens.length) {
      token = tokens.shift();
      node = findOperatorByName(token);
    }

    tokens.forEach(function (nextToken) {
      if (graph[token]) {
        if (graph[token].indexOf(nextToken) !== -1) {
          return;
        }
        graph[token].push(nextToken);
      } else {
        graph[token] = [nextToken];
      }

      var nextNode = findOperatorByName(nextToken);

      if (nextToken === ">") {
        outlets.push(node);
      } else if (typeof nextNode.frequency === "object") {
        node.connect(nextNode.frequency);
      } else {
        node.connect(nextNode);
      }

      token = nextToken;
      node = nextNode;
    });
  });

  if (outlets.length === 0) {
    throw new TypeError("no output");
  }

  return outlets;
}

function isValidAlgorithm(algorithm, numOfOperators) {
  var X = String.fromCharCode(64 + numOfOperators);
  var re = new RegExp("^[A-" + X + "]-(?:[A-" + X + "]-)*[>A-" + X + "]$", "i");

  return algorithm.indexOf(">") !== -1 && algorithm.replace(/\s+/g, "").split(";").every(function (algorithm) {
    return re.test(algorithm);
  });
}

exports["default"] = {
  build: build,
  isValidAlgorithm: isValidAlgorithm
};
module.exports = exports["default"];
},{"./algorithms":6}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = {
  1: ["A->"],
  2: ["B-A->", "B->; A->"],
  3: ["C-B-A->", "C-A; B-A; A->", "C-B->; C-A->", "C-B->; A->", "C->; B->; A->"],
  4: ["D-C-B-A->", "D-B; C-B; B-A->", "D-A->; C-B-A; A->", "D-C; D-B; C-A->; B-A->", "D-C; C-A->; C-B->", "D-C-B->; A->", "D-A; C-A; B-A; A->", "D-C->; B-A->", "D-C->; D-B->; D-A->", "D-C->; B->; A->", "D->; C->; B->; A->"]
};
module.exports = exports["default"];
},{}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _FMSynth = require("./FMSynth");

var _FMSynth2 = _interopRequireDefault(_FMSynth);

exports["default"] = _FMSynth2["default"];
module.exports = exports["default"];
},{"./FMSynth":4}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

var _CURSOR, _extends$parseMessage$buildLedData;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _xtend = require("xtend");

var _xtend2 = _interopRequireDefault(_xtend);

var PAD = [0x09, 0x0a, 0x0b, 0x0c, 0x19, 0x1a, 0x1b, 0x1c];
var KNOB1 = [0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c];
var KNOB2 = [0x29, 0x2a, 0x2b, 0x2c, 0x2d, 0x2e, 0x2f, 0x30];
var CURSOR = (_CURSOR = {}, _defineProperty(_CURSOR, 0x72, "up"), _defineProperty(_CURSOR, 0x73, "down"), _defineProperty(_CURSOR, 0x74, "left"), _defineProperty(_CURSOR, 0x75, "right"), _CURSOR);
var COLOR_NAMES = {
  off: 0,
  "dark red": 1,
  red: 2,
  "light red": 3,
  "dark green": 4,
  "dark amber": 5,
  green: 8,
  amber: 10,
  "light green": 12,
  "light amber": 15
};
var TRACK_SELECTOR = {
  all: function all() {
    return true;
  },
  even: function even(_, i) {
    return i % 2 === 0;
  },
  odd: function odd(_, i) {
    return i % 2 === 1;
  }
};

function parseMessage(st, d1, d2) {
  var messageType = st & 0xf0;
  var value = Math.max(0, Math.min(d2, 127));
  var channel = Math.max(0, Math.min(st & 0x0f, 15));
  var track = undefined;

  // note on
  if (messageType === 0x90 && value !== 0) {
    track = PAD.indexOf(d1);
    if (track !== -1) {
      return { dataType: "pad", track: track, value: value, channel: channel };
    }
  }

  // control change
  if (messageType === 0xb0) {
    track = KNOB1.indexOf(d1);
    if (track !== -1) {
      return { dataType: "knob1", track: track, value: value, channel: channel };
    }

    track = KNOB2.indexOf(d1);
    if (track !== -1) {
      return { dataType: "knob2", track: track, value: value, channel: channel };
    }

    var cursor = CURSOR[d1];

    if (cursor && value !== 0) {
      return { dataType: "cursor", direction: cursor, value: value, channel: channel };
    }
  }

  return null;
}

function buildLedData(track, color, channel) {
  if (typeof color === "string") {
    color = COLOR_NAMES[color];
  }
  color = (color | 0) % 16;

  var st = 0x90 + (channel | 0) % 16;
  var d2 = ((color & 0x0c) << 2) + 0x0c + (color & 0x03);

  if (TRACK_SELECTOR.hasOwnProperty(track)) {
    return PAD.filter(TRACK_SELECTOR[track]).map(function (d1) {
      return [st, d1, d2];
    });
  }

  if (/^[-o]+$/.test(track)) {
    var data = [];

    for (var i = 0; i < 8; i++) {
      if (track[i % track.length] === "o") {
        data.push([st, PAD[i], d2]);
      }
    }

    return data;
  }

  var d1 = PAD[(track | 0) % 8];

  return [[st, d1, d2]];
}

function _extends(MIDIDevice) {
  return (function (_MIDIDevice) {
    function LaunchControl() {
      var _this = this;

      var deviceName = arguments[0] === undefined ? "Launch Control" : arguments[0];

      _classCallCheck(this, LaunchControl);

      _get(Object.getPrototypeOf(LaunchControl.prototype), "constructor", this).call(this, deviceName);

      this._channel = 8;
      this._onmidimessage = function (e) {
        var msg = parseMessage(e.data[0], e.data[1], e.data[2]);

        if (msg === null) {
          return;
        }

        _this._channel = msg.channel;
        _this.emit("message", (0, _xtend2["default"])({ type: "message", deviceName: _this.deviceName }, msg));
      };
    }

    _inherits(LaunchControl, _MIDIDevice);

    _createClass(LaunchControl, [{
      key: "led",
      value: function led(track, color) {
        var _this2 = this;

        var channel = arguments[2] === undefined ? this._channel : arguments[2];

        buildLedData(track, color, channel).forEach(function (data) {
          _this2.send(data);
        });
      }
    }]);

    return LaunchControl;
  })(MIDIDevice);
}

exports["default"] = (_extends$parseMessage$buildLedData = {}, _defineProperty(_extends$parseMessage$buildLedData, "extends", _extends), _defineProperty(_extends$parseMessage$buildLedData, "parseMessage", parseMessage), _defineProperty(_extends$parseMessage$buildLedData, "buildLedData", buildLedData), _extends$parseMessage$buildLedData);
module.exports = exports["default"];
},{"xtend":36}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _mohayonaoMidiDeviceWebmidi = require("@mohayonao/midi-device/webmidi");

var _mohayonaoMidiDeviceWebmidi2 = _interopRequireDefault(_mohayonaoMidiDeviceWebmidi);

var _LaunchControl = require("./LaunchControl");

var _LaunchControl2 = _interopRequireDefault(_LaunchControl);

exports["default"] = _LaunchControl2["default"]["extends"](_mohayonaoMidiDeviceWebmidi2["default"]);
module.exports = exports["default"];
},{"./LaunchControl":8,"@mohayonao/midi-device/webmidi":13}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _mohayonaoEventEmitter = require("@mohayonao/event-emitter");

var _mohayonaoEventEmitter2 = _interopRequireDefault(_mohayonaoEventEmitter);

exports["default"] = _mohayonaoEventEmitter2["default"];
module.exports = exports["default"];
},{"@mohayonao/event-emitter":2}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _EventEmitter2 = require("./EventEmitter");

var _EventEmitter3 = _interopRequireDefault(_EventEmitter2);

var MIDIDevice = (function (_EventEmitter) {
  function MIDIDevice(deviceName) {
    _classCallCheck(this, MIDIDevice);

    _get(Object.getPrototypeOf(MIDIDevice.prototype), "constructor", this).call(this);

    this._input = null;
    this._output = null;
    this._deviceName = deviceName;
  }

  _inherits(MIDIDevice, _EventEmitter);

  _createClass(MIDIDevice, [{
    key: "open",
    value: function open() {
      return Promise.reject(new Error("subclass responsibility"));
    }
  }, {
    key: "close",
    value: function close() {
      return Promise.reject(new Error("subclass responsibility"));
    }
  }, {
    key: "send",
    value: function send() {
      throw new Error("subclass responsibility");
    }
  }, {
    key: "_onmidimessage",
    value: function _onmidimessage() {}
  }, {
    key: "deviceName",
    get: function get() {
      return this._deviceName;
    }
  }], [{
    key: "requestDeviceNames",
    value: function requestDeviceNames() {
      return Promise.reject(new Error("subclass responsibility"));
    }
  }]);

  return MIDIDevice;
})(_EventEmitter3["default"]);

exports["default"] = MIDIDevice;
module.exports = exports["default"];
},{"./EventEmitter":10}],12:[function(require,module,exports){
(function (global){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _MIDIDevice2 = require("./MIDIDevice");

var _MIDIDevice3 = _interopRequireDefault(_MIDIDevice2);

function findMIDIPortByName(iter, deviceName) {
  for (var x = iter.next(); !x.done; x = iter.next()) {
    if (x.value.name === deviceName) {
      return x.value;
    }
  }

  return null;
}

function collectDeviceNames(iter) {
  var result = [];

  for (var x = iter.next(); !x.done; x = iter.next()) {
    result.push(x.value.name);
  }

  return result;
}

var WebMIDIDevice = (function (_MIDIDevice) {
  function WebMIDIDevice() {
    _classCallCheck(this, WebMIDIDevice);

    _get(Object.getPrototypeOf(WebMIDIDevice.prototype), "constructor", this).apply(this, arguments);
  }

  _inherits(WebMIDIDevice, _MIDIDevice);

  _createClass(WebMIDIDevice, [{
    key: "open",
    value: function open() {
      var _this = this;

      return new Promise(function (resolve, reject) {
        if (!global.navigator || typeof global.navigator.requestMIDIAccess !== "function") {
          return reject(new TypeError("Web MIDI API is not supported"));
        }

        if (_this._input !== null || _this._output !== null) {
          return reject(new TypeError(_this.deviceName + " has already been opened"));
        }

        var successCallback = function successCallback(access) {
          _this._access = access;

          var input = findMIDIPortByName(access.inputs.values(), _this.deviceName);
          var output = findMIDIPortByName(access.outputs.values(), _this.deviceName);

          if (input === null && output === null) {
            return reject(new TypeError(_this.deviceName + " is not found"));
          }

          if (input !== null) {
            _this._input = input;

            input.onmidimessage = function (e) {
              _this._onmidimessage(e);
            };
          }

          if (output !== null) {
            _this._output = output;
          }

          return Promise.all([_this._input && _this._input.open(), _this._output && _this._output.open()]).then(resolve, reject);
        };

        if (_this._access) {
          return successCallback(_this._access);
        }

        return global.navigator.requestMIDIAccess().then(successCallback, reject);
      });
    }
  }, {
    key: "close",
    value: function close() {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        if (_this2._input === null && _this2._output === null) {
          return reject(new TypeError(_this2.deviceName + " has already been closed"));
        }

        var input = _this2._input;
        var output = _this2._output;

        _this2._input = null;
        _this2._output = null;

        return Promise.all([input && input.close(), output && output.close()]).then(resolve, reject);
      });
    }
  }, {
    key: "send",
    value: function send(data) {
      if (this._output !== null) {
        this._output.send(data);
      }
    }
  }], [{
    key: "requestDeviceNames",
    value: function requestDeviceNames() {
      return new Promise(function (resolve, reject) {
        if (!global.navigator || typeof global.navigator.requestMIDIAccess !== "function") {
          return reject(new TypeError("Web MIDI API is not supported"));
        }

        return global.navigator.requestMIDIAccess().then(function (access) {
          var inputDeviceNames = collectDeviceNames(access.inputs.values());
          var outputDeviceNames = collectDeviceNames(access.outputs.values());

          resolve({
            inputs: inputDeviceNames,
            outputs: outputDeviceNames
          });
        }, reject);
      });
    }
  }]);

  return WebMIDIDevice;
})(_MIDIDevice3["default"]);

exports["default"] = WebMIDIDevice;
module.exports = exports["default"];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./MIDIDevice":11}],13:[function(require,module,exports){
module.exports = require("./lib/WebMIDIDevice");

},{"./lib/WebMIDIDevice":12}],14:[function(require,module,exports){
module.exports = require("./lib/WebMIDILaunchControl");

},{"./lib/WebMIDILaunchControl":9}],15:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

var _CONTROL_CHANGES, _extends$parseMessage;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _xtend = require("xtend");

var _xtend2 = _interopRequireDefault(_xtend);

var CONTROL_CHANGES = (_CONTROL_CHANGES = {}, _defineProperty(_CONTROL_CHANGES, 0x01, "modulation"), _defineProperty(_CONTROL_CHANGES, 0x07, "volume"), _defineProperty(_CONTROL_CHANGES, 0x0a, "pan"), _defineProperty(_CONTROL_CHANGES, 0x0b, "expression"), _defineProperty(_CONTROL_CHANGES, 0x40, "sustain"), _CONTROL_CHANGES);

function parseMessage(st, d1, d2) {
  var messageType = st & 0xf0;
  var value = Math.max(0, Math.min(d2, 127));
  var channel = Math.max(0, Math.min(st & 0x0f, 15));

  // note off
  if (messageType === 0x80) {
    return { dataType: "noteOff", noteNumber: d1, velocity: value, channel: channel };
  }

  // note on
  if (messageType === 0x90) {
    if (value === 0) {
      return { dataType: "noteOff", noteNumber: d1, velocity: value, channel: channel };
    }
    return { dataType: "noteOn", noteNumber: d1, velocity: value, channel: channel };
  }

  // control change
  if (messageType === 0xb0) {
    if (CONTROL_CHANGES.hasOwnProperty(d1)) {
      return { dataType: CONTROL_CHANGES[d1], value: value, channel: channel };
    }
  }

  // pitch bend
  if (messageType === 0xe0) {
    var pitchBendValue = d2 * 128 + d1 - 8192;

    return { dataType: "pitchbend", value: pitchBendValue, channel: channel };
  }

  return null;
}

function _extends(MIDIDevice) {
  return (function (_MIDIDevice) {
    function LaunchControl() {
      var _this = this;

      var deviceName = arguments[0] === undefined ? "Keystation Mini 32" : arguments[0];

      _classCallCheck(this, LaunchControl);

      _get(Object.getPrototypeOf(LaunchControl.prototype), "constructor", this).call(this, deviceName);

      this._onmidimessage = function (e) {
        var msg = parseMessage(e.data[0], e.data[1], e.data[2]);

        if (msg === null) {
          return;
        }

        _this.emit("message", (0, _xtend2["default"])({ type: "message", deviceName: _this.deviceName }, msg));
      };
    }

    _inherits(LaunchControl, _MIDIDevice);

    return LaunchControl;
  })(MIDIDevice);
}

exports["default"] = (_extends$parseMessage = {}, _defineProperty(_extends$parseMessage, "extends", _extends), _defineProperty(_extends$parseMessage, "parseMessage", parseMessage), _extends$parseMessage);
module.exports = exports["default"];
},{"xtend":36}],16:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _mohayonaoMidiDeviceWebmidi = require("@mohayonao/midi-device/webmidi");

var _mohayonaoMidiDeviceWebmidi2 = _interopRequireDefault(_mohayonaoMidiDeviceWebmidi);

var _MIDIKeyboard = require("./MIDIKeyboard");

var _MIDIKeyboard2 = _interopRequireDefault(_MIDIKeyboard);

exports["default"] = _MIDIKeyboard2["default"]["extends"](_mohayonaoMidiDeviceWebmidi2["default"]);
module.exports = exports["default"];
},{"./MIDIKeyboard":15,"@mohayonao/midi-device/webmidi":20}],17:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"@mohayonao/event-emitter":2,"dup":10}],18:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"./EventEmitter":17,"dup":11}],19:[function(require,module,exports){
(function (global){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _MIDIDevice2 = require("./MIDIDevice");

var _MIDIDevice3 = _interopRequireDefault(_MIDIDevice2);

function findMIDIPortByName(iter, deviceName) {
  for (var x = iter.next(); !x.done; x = iter.next()) {
    if (x.value.name === deviceName) {
      return x.value;
    }
  }

  return null;
}

function collectDeviceNames(iter) {
  var result = [];

  for (var x = iter.next(); !x.done; x = iter.next()) {
    result.push(x.value.name);
  }

  return result;
}

var WebMIDIDevice = (function (_MIDIDevice) {
  function WebMIDIDevice() {
    _classCallCheck(this, WebMIDIDevice);

    _get(Object.getPrototypeOf(WebMIDIDevice.prototype), "constructor", this).apply(this, arguments);
  }

  _inherits(WebMIDIDevice, _MIDIDevice);

  _createClass(WebMIDIDevice, [{
    key: "open",
    value: function open() {
      var _this = this;

      return new Promise(function (resolve, reject) {
        if (!global.navigator || typeof global.navigator.requestMIDIAccess !== "function") {
          return reject(new TypeError("Web MIDI API is not supported"));
        }

        if (_this._input !== null || _this._output !== null) {
          return reject(new TypeError(_this.deviceName + " has already been opened"));
        }

        var successCallback = function successCallback(access) {
          _this._access = access;

          var input = findMIDIPortByName(access.inputs.values(), _this.deviceName);
          var output = findMIDIPortByName(access.outputs.values(), _this.deviceName);

          if (input === null && output === null) {
            return reject(new TypeError(_this.deviceName + " is not found"));
          }

          if (input !== null) {
            _this._input = input;

            input.onmidimessage = function (e) {
              _this._onmidimessage(e);
            };
          }

          if (output !== null) {
            _this._output = output;
          }

          return Promise.all([_this._input && _this._input.open(), _this._output && _this._output.open()]).then(resolve, reject);
        };

        if (_this._access) {
          return successCallback(_this._access);
        }

        return global.navigator.requestMIDIAccess().then(successCallback, reject);
      });
    }
  }, {
    key: "close",
    value: function close() {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        if (_this2._input === null && _this2._output === null) {
          return reject(new TypeError(_this2.deviceName + " has already been closed"));
        }

        var input = _this2._input;
        var output = _this2._output;

        _this2._input = null;
        _this2._output = null;

        return Promise.all([input && input.close(), output && output.close()]).then(resolve, reject);
      });
    }
  }, {
    key: "send",
    value: function send(data) {
      if (this._output !== null) {
        this._output.send(data);
      }
    }
  }], [{
    key: "requestDeviceNames",
    value: function requestDeviceNames() {
      return new Promise(function (resolve, reject) {
        if (!global.navigator || typeof global.navigator.requestMIDIAccess !== "function") {
          return reject(new TypeError("Web MIDI API is not supported"));
        }

        return global.navigator.requestMIDIAccess().then(function (access) {
          var inputDeviceNames = collectDeviceNames(access.inputs.values());
          var outputDeviceNames = collectDeviceNames(access.outputs.values());

          resolve({
            inputs: inputDeviceNames,
            outputs: outputDeviceNames
          });
        }, reject);
      });
    }
  }]);

  return WebMIDIDevice;
})(_MIDIDevice3["default"]);

exports["default"] = WebMIDIDevice;
module.exports = exports["default"];
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./MIDIDevice":18}],20:[function(require,module,exports){
arguments[4][13][0].apply(exports,arguments)
},{"./lib/WebMIDIDevice":19,"dup":13}],21:[function(require,module,exports){
module.exports = require("./lib/WebMIDIKeyboard");

},{"./lib/WebMIDIKeyboard":16}],22:[function(require,module,exports){
arguments[4][3][0].apply(exports,arguments)
},{"./lib":24,"dup":3}],23:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var OSCILLATOR = typeof Symbol !== "undefined" ? Symbol("OSCILLATOR") : "_@mohayonao/operator:OSCILLATOR";
exports.OSCILLATOR = OSCILLATOR;
var GAIN = typeof Symbol !== "undefined" ? Symbol("GAIN") : "_@mohayonao/operator:GAIN";
exports.GAIN = GAIN;
var ENVELOPES = typeof Symbol !== "undefined" ? Symbol("ENVELOPES") : "_@mohayonao/operator:ENVELOPES";

exports.ENVELOPES = ENVELOPES;

var Operator = (function () {
  function Operator(audioContext) {
    _classCallCheck(this, Operator);

    this[OSCILLATOR] = audioContext.createOscillator();
    this[GAIN] = audioContext.createGain();
    this[ENVELOPES] = {};
  }

  _createClass(Operator, [{
    key: "connect",
    value: function connect(destination) {
      this[OSCILLATOR].connect(this[GAIN]);
      this[GAIN].connect(destination);
    }
  }, {
    key: "disconnect",
    value: function disconnect() {
      var _GAIN;

      this[OSCILLATOR].disconnect();
      (_GAIN = this[GAIN]).disconnect.apply(_GAIN, arguments);
    }
  }, {
    key: "start",
    value: function start(when) {
      applyTo(this[ENVELOPES].frequency, this[OSCILLATOR].frequency, when);
      applyTo(this[ENVELOPES].detune, this[OSCILLATOR].detune, when);
      applyTo(this[ENVELOPES].gain, this[GAIN].gain, when);
      this[OSCILLATOR].start(when);
    }
  }, {
    key: "stop",
    value: function stop(when) {
      this[OSCILLATOR].stop(when);
    }
  }, {
    key: "setPeriodicWave",
    value: function setPeriodicWave(periodicWave) {
      this[OSCILLATOR].setPeriodicWave(periodicWave);
    }
  }, {
    key: "setEnvelope",
    value: function setEnvelope(envelope) {
      var target = arguments[1] === undefined ? "gain" : arguments[1];

      this[ENVELOPES][target] = envelope;
    }
  }, {
    key: "getEnvelope",
    value: function getEnvelope() {
      var target = arguments[0] === undefined ? "gain" : arguments[0];

      return this[ENVELOPES][target];
    }
  }, {
    key: "context",
    get: function get() {
      return this[OSCILLATOR].context;
    }
  }, {
    key: "type",
    get: function get() {
      return this[OSCILLATOR].type;
    },
    set: function set(value) {
      this[OSCILLATOR].type = value;
    }
  }, {
    key: "frequency",
    get: function get() {
      return this[OSCILLATOR].frequency;
    }
  }, {
    key: "detune",
    get: function get() {
      return this[OSCILLATOR].detune;
    }
  }, {
    key: "onended",
    get: function get() {
      return this[OSCILLATOR].onended;
    },
    set: function set(value) {
      this[OSCILLATOR].onended = value;
    }
  }, {
    key: "gain",
    get: function get() {
      return this[GAIN].gain;
    }
  }]);

  return Operator;
})();

exports["default"] = Operator;

function applyTo(envelope, audioParam, startTime) {
  if (envelope && typeof envelope.applyTo === "function") {
    envelope.applyTo(audioParam, startTime);
  }
}
},{}],24:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _Operator = require("./Operator");

var _Operator2 = _interopRequireDefault(_Operator);

exports["default"] = _Operator2["default"];
module.exports = exports["default"];
},{"./Operator":23}],25:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoFluxx = require("@mohayonao/fluxx");

var _mohayonaoFluxx2 = _interopRequireDefault(_mohayonaoFluxx);

var Client = (function (_fluxx$Router) {
  _inherits(Client, _fluxx$Router);

  function Client(socket) {
    var _this = this;

    var namespace = arguments.length <= 1 || arguments[1] === undefined ? "fluxx" : arguments[1];

    _classCallCheck(this, Client);

    _get(Object.getPrototypeOf(Client.prototype), "constructor", this).call(this);

    this.socket = socket;
    this.namespace = namespace;

    socket.emit("/fluxx/join", { namespace: namespace });

    socket.on("/fluxx/sendAction", function (_ref) {
      var address = _ref.address;
      var data = _ref.data;

      _this.createAction(address, data);
    });
  }

  _createClass(Client, [{
    key: "sendAction",
    value: function sendAction(address, data) {
      if (typeof address === "string" && address[0] === "/") {
        this.socket.emit("/fluxx/sendAction", { address: address, data: data });
      }
    }
  }]);

  return Client;
})(_mohayonaoFluxx2["default"].Router);

exports["default"] = Client;
module.exports = exports["default"];
},{"@mohayonao/fluxx":32}],26:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoFluxx = require("@mohayonao/fluxx");

var _mohayonaoFluxx2 = _interopRequireDefault(_mohayonaoFluxx);

var _symbols = require("./symbols");

var Server = (function (_fluxx$Router) {
  _inherits(Server, _fluxx$Router);

  function Server(socket) {
    var _this = this;

    var namespace = arguments.length <= 1 || arguments[1] === undefined ? "fluxx" : arguments[1];

    _classCallCheck(this, Server);

    _get(Object.getPrototypeOf(Server.prototype), "constructor", this).call(this);

    this.socket = socket;
    this.namespace = namespace;
    this.clients = [];

    socket.on("connect", function (client) {
      client.once("/fluxx/join", function (_ref) {
        var namespace = _ref.namespace;

        if (_this.namespace === namespace) {
          _this[_symbols.JOIN](client);
        }
      });
    });
  }

  _createClass(Server, [{
    key: "sendAction",
    value: function sendAction(address, data) {
      if (typeof address === "string" && address[0] === "/") {
        this.socket.to(this.namespace).emit("/fluxx/sendAction", { address: address, data: data });
      }
    }
  }, {
    key: _symbols.JOIN,
    value: function value(client) {
      var _this2 = this;

      client.sendAction = function (address, data) {
        if (typeof address === "string" && address[0] === "/") {
          client.emit("/fluxx/sendAction", { address: address, data: data });
        }
      };

      this.clients.push(client);

      this.emit("connect", { client: client });

      client.on("disconnect", function () {
        var index = _this2.clients.indexOf(client);

        if (index === -1) {
          return;
        }

        _this2.clients.splice(index, 1);

        _this2.emit("disconnect", { client: client });
      });

      client.on("/fluxx/sendAction", function (_ref2) {
        var address = _ref2.address;
        var data = _ref2.data;

        _this2.createAction(address, data);
      });

      client.join(this.namespace);
    }
  }]);

  return Server;
})(_mohayonaoFluxx2["default"].Router);

exports["default"] = Server;
module.exports = exports["default"];
},{"./symbols":28,"@mohayonao/fluxx":32}],27:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _mohayonaoFluxx = require("@mohayonao/fluxx");

var _Client = require("./Client");

var _Client2 = _interopRequireDefault(_Client);

var _Server = require("./Server");

var _Server2 = _interopRequireDefault(_Server);

exports["default"] = { Router: _mohayonaoFluxx.Router, Action: _mohayonaoFluxx.Action, Store: _mohayonaoFluxx.Store, Client: _Client2["default"], Server: _Server2["default"] };
module.exports = exports["default"];
},{"./Client":25,"./Server":26,"@mohayonao/fluxx":32}],28:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var JOIN = typeof Symbol !== "undefined" ? Symbol("JOIN") : "_@mohayonao/remote-fluxx:JOIN";
exports.JOIN = JOIN;
},{}],29:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _symbols = require("./symbols");

var _Router = require("./Router");

var _Router2 = _interopRequireDefault(_Router);

var Action = (function () {
  function Action(router) {
    _classCallCheck(this, Action);

    if (!(router instanceof _Router2["default"])) {
      throw new TypeError("Action.constructor requires an instance of Router");
    }

    this.router = router;
  }

  _createClass(Action, [{
    key: "doneAction",
    value: function doneAction(address, data) {
      this.router[_symbols.DONE_ACTION](address, data);
    }
  }]);

  return Action;
})();

exports["default"] = Action;
module.exports = exports["default"];
},{"./Router":30,"./symbols":33}],30:[function(require,module,exports){
(function (global){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoEventEmitter = require("@mohayonao/event-emitter");

var _mohayonaoEventEmitter2 = _interopRequireDefault(_mohayonaoEventEmitter);

var _symbols = require("./symbols");

var setImmediate = global.setImmediate || function (callback) {
  setTimeout(callback, 0);
};

var Router = (function (_EventEmitter) {
  _inherits(Router, _EventEmitter);

  function Router() {
    _classCallCheck(this, Router);

    _get(Object.getPrototypeOf(Router.prototype), "constructor", this).call(this);

    this.actions = [];
    this.stores = [];
    this[_symbols.LOCKED] = false;
  }

  _createClass(Router, [{
    key: "delegate",
    value: function delegate(address, data) {
      this.createAction(address, data);
    }
  }, {
    key: "getStateFromStores",
    value: function getStateFromStores() {
      var state = {};

      this.stores.forEach(function (store) {
        var name = (store.name || "").replace(/Store$/, "");

        name = name.charAt(0).toLowerCase() + name.substr(1);

        if (typeof store.getState === "function") {
          state[name] = store.getState();
        }
      });

      return state;
    }
  }, {
    key: "createAction",
    value: function createAction(address, data) {
      if (typeof address === "string" && address[0] === "/") {
        this.actions.forEach(function (action) {
          if (typeof action[address] === "function") {
            action[address](data);
          }
        });
      }
    }
  }, {
    key: "addChangeListener",
    value: function addChangeListener(listener) {
      this.on(_symbols.CHANGE_EVENT, listener);
    }
  }, {
    key: "removeChangeListener",
    value: function removeChangeListener(listener) {
      this.removeListener(_symbols.CHANGE_EVENT, listener);
    }
  }, {
    key: _symbols.DONE_ACTION,
    value: function value(address, data) {
      if (typeof address === "string" && address[0] === "/") {
        this.stores.forEach(function (store) {
          if (typeof store[address] === "function") {
            store[address](data);
          }
        });
      }
    }
  }, {
    key: _symbols.EMIT_CHANGE,
    value: function value(force) {
      var _this = this;

      if (force || !this[_symbols.LOCKED]) {
        this[_symbols.LOCKED] = true;
        setImmediate(function () {
          _this.emit(_symbols.CHANGE_EVENT);
          _this[_symbols.LOCKED] = false;
        });
      }
    }
  }]);

  return Router;
})(_mohayonaoEventEmitter2["default"]);

exports["default"] = Router;
module.exports = exports["default"];
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./symbols":33,"@mohayonao/event-emitter":2}],31:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _symbols = require("./symbols");

var _Router = require("./Router");

var _Router2 = _interopRequireDefault(_Router);

var Store = (function () {
  function Store(router) {
    _classCallCheck(this, Store);

    if (!(router instanceof _Router2["default"])) {
      throw new TypeError("Store.constructor requires an instance of Router");
    }

    this.router = router;
    this.data = this.getInitialState();
  }

  _createClass(Store, [{
    key: "getInitialState",
    value: function getInitialState() {
      return {};
    }
  }, {
    key: "getState",
    value: function getState() {
      return this.data;
    }
  }, {
    key: "emitChange",
    value: function emitChange() {
      var force = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

      this.router[_symbols.EMIT_CHANGE](force);
    }
  }, {
    key: "name",
    get: function get() {
      return this.constructor.name;
    }
  }]);

  return Store;
})();

exports["default"] = Store;
module.exports = exports["default"];
},{"./Router":30,"./symbols":33}],32:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _Router = require("./Router");

var _Router2 = _interopRequireDefault(_Router);

var _Action = require("./Action");

var _Action2 = _interopRequireDefault(_Action);

var _Store = require("./Store");

var _Store2 = _interopRequireDefault(_Store);

exports["default"] = { Router: _Router2["default"], Action: _Action2["default"], Store: _Store2["default"] };
module.exports = exports["default"];
},{"./Action":29,"./Router":30,"./Store":31}],33:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var LOCKED = typeof Symbol !== "undefined" ? Symbol("LOCKED") : "_@mohayonao/fluxx:LOCKED";
exports.LOCKED = LOCKED;
var CHANGE_EVENT = typeof Symbol !== "undefined" ? Symbol("CHANGE_EVENT") : "_@mohayonao/fluxx:CHANGE_EVENT";
exports.CHANGE_EVENT = CHANGE_EVENT;
var EMIT_CHANGE = typeof Symbol !== "undefined" ? Symbol("EMIT_CHANGE") : "_@mohayonao/fluxx:EMIT_CHANGE";
exports.EMIT_CHANGE = EMIT_CHANGE;
var DONE_ACTION = typeof Symbol !== "undefined" ? Symbol("DONE_ACTION") : "_@mohayonao/fluxx:DONE_ACTION";
exports.DONE_ACTION = DONE_ACTION;
},{}],34:[function(require,module,exports){
module.exports={"real":[0,-0.056752,-0.485551,0.414947,0.037289,-0.089027,0.041126,0.025816,-0.000195,-0.002759,-0.019563,0.00088,-0.017563,-0.002858,0.001327,-0.000568,-0.000064,-0.000954,-0.000392,-0.000428,0.001213,-0.001126,-0.00021,0.000262,0.000032,-0.00007,-0.000023,0.000035,0.000059,0.000468,0.000205,-0.000136,-0.000039,-0.000018,-0.000028,-0.000004,0.000003,-0.000003,-0.000021,0.000005,-0.000025,0.000053,0.000015,-0.00005,0.000002,-0.000012,-0.000002,-0.000014,0.000017,-0.000003,0.000029,-0.000006,-0.000044,0.000007,-0.000008,0.000016,0.000002,-0.000013,0.000005,-0.000003,0.000003,0.00001,0.000027,-0.000035,-0.000101,-0.000019,0.000009,-0.00001,0.000003,0.000011,-0.000029,-0.000005,0.000114,-0.000078,0.000039,0.000011,0.000036,0.000031,0.000054,0.000061,-0.000064,0.000327,-0.00001,0.000235,0.000073,0.000036,-0.000122,-0.000153,0.000127,0.000054,-0.000419,0.000104,0.000044,0.000009,-0.000056,0.000209,-0.000268,-0.00017,0.000243,-0.000112,-0.000111,-0.000019,-0.000009,0.000143,0.000004,0.000175,0.000143,-0.00002,0.000004,-0.000012,0.000025,0.000021,0.000004,-0.000028,0.000018,0.000012,-0.000003,0,-0.000002,0.000007,-0.000005,-0.000007,-0.000021,-0.000014,0.000003,0.000002,-0.000005,0.000004,-0.000002,0,0.000002,-0.000002,0,0,-0.000002,-0.000004,0.000003,0.000001,-0.000001,0,0.000003,-0.000001,0.000001,-0.000001,0,0.000005,0,0.000001,-0.000003,0.000001,0.000002,-0.000002,0.000001,0.000001,0,-0.000001,0.000006,0.000013,0.000005,-0.000005,0.000001,0.000003,-0.000003,-0.000002,0.000005,-0.000015,0.000007,-0.000012,-0.000001,-0.000004,-0.000009,-0.000012,-0.000051,0.000005,-0.000039,-0.000005,-0.000021,-0.00001,0,0.000018,-0.000004,0.000016,-0.000013,0.000046,0.000007,-0.00001,-0.000006,0.000022,-0.000007,0.00002,0.000046,-0.000035,0.000024,0.00002,0,0.000001,-0.000019,-0.000011,-0.000016,-0.000049,0.000006,-0.000007,-0.000005,0.000003,-0.000009,0.000003,0.000001,0.000003,-0.000015,-0.000001,0.000002,-0.000002,-0.000006,0.000002,0.000007,0.000011,0.000002,0.000007,-0.000003,0.000003,-0.000002,0.000001,0.000003,-0.000002,0.000002,-0.000002,0.000004,-0.000001,0.000002,0.000002,-0.000001,0.000002,0.000001,-0.000001,-0.000001,-0.000001,0,0,-0.000001,0.000001,0,0.000002,-0.000001,0,0.000002,-0.000001,0,0,-0.000001,-0.000003,-0.000002,-0.000001,0.000003,0.000001,0,0,0.000005,0.000001,0.000001,0,0.000006,0.000003,0,0.000005,0.000001,0.000031,0.000017,0.000007,0.000013,0.000002,0,-0.000007,-0.000011,0.000024,-0.000017,-0.00001,0.00001,-0.000009,0.000006,0.000005,0,-0.000027,0.000004,-0.000006,0,-0.000012,-0.000014,0.000007,0.000003,0.000002,0.000015,0.000003,0.000022,-0.00001,0.000004,0.000021,-0.000008,0.000003,-0.000002,0.000003,-0.000008,0.000013,0.000003,-0.000006,0.000001,0.000001,-0.000002,-0.000004,-0.000005,-0.000002,-0.000005,-0.000003,-0.000002,-0.000002,-0.000002,-0.000002,-0.000002,-0.000002,-0.000002,-0.000002,-0.000002,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"imag":[0,-0.142044,0.119331,0.086961,0.000519,0.061124,-0.008195,0.003663,-0.001992,-0.005229,-0.003499,0.00294,0.003171,0.011203,0.000387,0.000902,-0.000191,0.00055,0.000462,-0.000264,0.000833,-0.000158,-0.000038,0.00001,-0.000177,-0.000061,0.000129,-0.000167,-0.000071,0.000171,0.000137,0.000078,-0.000051,-0.00005,0.00002,-0.000047,0.000034,-0.000004,-0.000042,0.000003,-0.000015,0.000026,-0.000001,-0.000013,-0.000018,-0.000034,0.000007,0.000008,-0.000019,-0.000026,0.000006,-0.000003,-0.000002,0.000005,0.000001,-0.000013,-0.000006,0.000008,-0.000017,0.000007,-0.000013,-0.000012,0.000045,0.00003,0,0.000001,-0.000025,0.000014,0.000002,-0.000019,-0.000026,0.000002,0.000055,0.000005,-0.000011,0.000013,0.000047,0.000005,0.00005,-0.000079,0.000168,0.000223,-0.000042,0.000065,-0.000034,0.000025,-0.00002,-0.000176,0.000346,0.00008,-0.000175,0.000179,0.000005,-0.000024,-0.000009,0.000154,-0.000257,-0.000065,0.000019,-0.00003,-0.00007,-0.000003,0.000012,0.0001,-0.00009,0.000048,-0.000144,-0.000059,-0.000035,-0.000013,0.000005,-0.00002,0.000007,-0.000052,0.000022,0,-0.000001,0.00001,-0.000002,-0.000005,0.000008,0.00001,-0.000013,-0.000016,0.000005,0.000004,0.000003,0.000002,0.000004,0.000001,-0.000002,0.000002,-0.000001,0.000005,-0.000005,-0.000002,0.000003,-0.000001,0.000004,0,0,0,0.000003,-0.000003,-0.000001,0.000001,-0.000001,-0.000001,0.000001,0,0,0.000003,-0.000001,0.000003,0.000002,-0.00001,-0.000008,0.000004,0,0.000002,-0.000002,0.000001,0,0.000008,0.000005,-0.000024,0.000004,0,0.000003,-0.000012,-0.000008,-0.000021,0.000012,0.000012,-0.000053,0.000033,-0.00002,-0.000005,-0.000025,-0.000005,0.000059,-0.00008,-0.000061,0.000082,-0.00004,-0.000005,0.000008,0.000024,-0.000082,0.000067,0.000053,-0.00004,0.000008,0.000019,0.000008,0.00001,-0.00003,0.000042,-0.000014,0.000015,0.000017,0.000012,0.000019,-0.000008,0.000004,-0.000003,0.000018,-0.000012,0.000005,0,-0.000013,0.000007,0.000002,-0.000002,-0.000004,0,0.000006,-0.00001,-0.000008,0.000001,-0.000003,-0.000001,-0.000002,-0.000001,0,0.000001,-0.000003,0,0.000002,-0.000002,0,-0.000002,0,-0.000001,0,-0.000002,0.000001,0.000001,0,0,0,0,-0.000001,0,-0.000002,0,-0.000002,-0.000001,0.000004,0.000004,-0.000002,-0.000001,0,0.000001,-0.000003,0,-0.000001,-0.000007,0.000011,-0.000002,0.000002,-0.000004,0.000005,0.000006,0.00001,0.000008,-0.000015,0.000015,-0.000022,0,0.000002,0.000014,0.000007,-0.000018,0.000021,0.000039,-0.000032,0.000008,0,-0.000002,-0.000021,0.000035,-0.000016,-0.000036,0.000022,-0.000007,-0.000005,-0.000003,-0.000007,0.000008,-0.000023,-0.000009,0,-0.000014,-0.000006,-0.000016,-0.000005,-0.000003,-0.000003,-0.000009,-0.000001,-0.000003,-0.000005,0.000002,-0.000006,-0.000004,-0.000003,-0.000003,-0.000002,-0.000002,-0.000001,0,-0.000001,-0.000001,-0.000001,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}
},{}],35:[function(require,module,exports){
(function (global){
"use strict";

if (!(global === global.window && global.URL && global.Blob && global.Worker)) {
  module.exports = global;
} else {
  module.exports = (function() {
    var TIMER_WORKER_SOURCE = [
      "var timerIds = {}, _ = {};",
      "_.setInterval = function(args) {",
      "  timerIds[args.timerId] = setInterval(function() { postMessage(args.timerId); }, args.delay);",
      "};",
      "_.clearInterval = function(args) {",
      "  clearInterval(timerIds[args.timerId]);",
      "};",
      "_.setTimeout = function(args) {",
      "  timerIds[args.timerId] = setTimeout(function() { postMessage(args.timerId); }, args.delay);",
      "};",
      "_.clearTimeout = function(args) {",
      "  clearTimeout(timerIds[args.timerId]);",
      "};",
      "onmessage = function(e) { _[e.data.type](e.data) };"
    ].join("");

    var _timerId = 0;
    var _callbacks = {};
    var _timer = new global.Worker(global.URL.createObjectURL(
      new global.Blob([ TIMER_WORKER_SOURCE ], { type: "text/javascript" })
    ));

    _timer.onmessage = function(e) {
      if (_callbacks[e.data]) {
        _callbacks[e.data]();
      }
    };

    return {
      setInterval: function(callback, delay) {
        _timerId += 1;

        _timer.postMessage({ type: "setInterval", timerId: _timerId, delay: delay });
        _callbacks[_timerId] = callback;

        return _timerId;
      },
      setTimeout: function(callback, delay) {
        _timerId += 1;

        _timer.postMessage({ type: "setTimeout", timerId: _timerId, delay: delay });
        _callbacks[_timerId] = callback;

        return _timerId;
      },
      clearInterval: function(timerId) {
        _timer.postMessage({ type: "clearInterval", timerId: timerId });
        _callbacks[timerId] = null;
      },
      clearTimeout: function(timerId) {
        _timer.postMessage({ type: "clearTimeout", timerId: timerId });
        _callbacks[timerId] = null;
      }
    };
  })();
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],36:[function(require,module,exports){
module.exports = extend

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],37:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoEventEmitter = require("@mohayonao/event-emitter");

var _mohayonaoEventEmitter2 = _interopRequireDefault(_mohayonaoEventEmitter);

var _sound = require("../sound");

var _sound2 = _interopRequireDefault(_sound);

var _config = require("./config");

var _config2 = _interopRequireDefault(_config);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var SoundCreator = (function (_EventEmitter) {
  _inherits(SoundCreator, _EventEmitter);

  function SoundCreator(_ref) {
    var audioContext = _ref.audioContext;
    var timeline = _ref.timeline;
    var offsetTime = _ref.offsetTime;

    _classCallCheck(this, SoundCreator);

    _get(Object.getPrototypeOf(SoundCreator.prototype), "constructor", this).call(this);

    this.audioContext = audioContext;
    this.timeline = timeline;
    this.offsetTime = _utils2["default"].defaults(offsetTime, 0);

    this._notes = [];
    this._tracks = [[], [], [], [], [], [], [], []];
    this._params = new Uint8Array(_config2["default"].DEFAULT_PARAMS);
  }

  _createClass(SoundCreator, [{
    key: "push",
    value: function push(data) {
      var _this = this;

      if (data.dataType === "sequence") {
        data = _utils2["default"].xtend(data, {
          dataType: "noteOn",
          playbackTime: data.playbackTime + this.offsetTime
        });
      }
      if (data.playbackTime <= 0) {
        data.playbackTime = this.audioContext.currentTime;
      }
      if (data.dataType === "noteOn") {
        this.timeline.insert(data.playbackTime, function () {
          _this.noteOn(data);
        });
      }
      if (data.dataType === "noteOff") {
        this.timeline.insert(data.playbackTime, function () {
          _this.noteOff(data);
        });
      }
    }
  }, {
    key: "noteOn",
    value: function noteOn(data) {
      var _this2 = this;

      var Klass = _sound2["default"].instruments.getClass(data.program);
      var instance = new Klass(_utils2["default"].xtend(data, {
        audioContext: this.audioContext,
        timeline: this.timeline,
        params: this._params
      }));

      instance.initialize();
      instance.create();
      instance.noteOn(data.playbackTime);

      if (instance.duration !== Infinity) {
        instance.noteOff(data.playbackTime + instance.duration);
      } else {
        this._tracks[data.track][data.noteNumber] = instance;
      }

      instance.once("ended", function () {
        instance.dispose();
      });

      instance.once("disposed", function () {
        _utils2["default"].removeIfExists(_this2._notes, instance);
        instance.disconnect();
      });

      this.emit("created", instance);

      this._notes.push(instance);
    }
  }, {
    key: "noteOff",
    value: function noteOff(_ref2) {
      var playbackTime = _ref2.playbackTime;
      var track = _ref2.track;
      var noteNumber = _ref2.noteNumber;

      var instance = this._tracks[track][noteNumber];

      if (!instance) {
        return;
      }

      instance.noteOff(playbackTime);

      this._tracks[track][noteNumber] = null;
    }
  }, {
    key: "setParams",
    value: function setParams(params) {
      this._params = params;
      this._notes.forEach(function (note) {
        note.setParams(params);
      });
    }
  }]);

  return SoundCreator;
})(_mohayonaoEventEmitter2["default"]);

exports["default"] = SoundCreator;
module.exports = exports["default"];

},{"../sound":106,"./config":54,"./utils":90,"@mohayonao/event-emitter":2}],38:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SoundDispatcher = (function () {
  function SoundDispatcher(_ref) {
    var audioContext = _ref.audioContext;
    var timeline = _ref.timeline;

    _classCallCheck(this, SoundDispatcher);

    this.audioContext = audioContext;
    this.timeline = timeline;
    this.outlet = null;
  }

  _createClass(SoundDispatcher, [{
    key: "push",
    value: function push(instance) {
      if (this.outlet) {
        instance.connect(this.outlet);
      }
    }
  }, {
    key: "connect",
    value: function connect(destination) {
      if (this.outlet) {
        this.outlet.connect(destination);
      }
    }
  }, {
    key: "disconnect",
    value: function disconnect() {
      if (this.outlet) {
        this.outlet.disconnect();
      }
    }
  }, {
    key: "dispose",
    value: function dispose() {}
  }]);

  return SoundDispatcher;
})();

exports["default"] = SoundDispatcher;
module.exports = exports["default"];

},{}],39:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BUF_SIZE = 1024;

var SoundManager = (function () {
  function SoundManager(_ref) {
    var audioContext = _ref.audioContext;
    var timeline = _ref.timeline;

    _classCallCheck(this, SoundManager);

    this.audioContext = audioContext;
    this.timeline = timeline;
    this.inlet = audioContext.createGain();
    this.state = "suspended";

    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = BUF_SIZE;
    this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
    this.timeDomainData = new Float32Array(this.analyser.fftSize);
  }

  _createClass(SoundManager, [{
    key: "start",
    value: function start() {
      if (this.state === "suspended") {
        this.inlet.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.inlet.gain.linearRampToValueAtTime(0.5, this.audioContext.currentTime + 0.01);

        this.inlet.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        this.state = "running";
      }

      return this;
    }
  }, {
    key: "stop",
    value: function stop() {
      var _this = this;

      if (this.state === "running") {
        this.inlet.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        this.inlet.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.01);
        this.timeline.nextTick(function () {
          _this.inlet.disconnect();
        });
        this.state = "suspended";
      }

      return this;
    }
  }, {
    key: "getFloatFrequencyData",
    value: function getFloatFrequencyData() {
      this.analyser.getFloatFrequencyData(this.frequencyData);

      return this.frequencyData;
    }
  }, {
    key: "getFloatTimeDomainData",
    value: function getFloatTimeDomainData() {
      this.analyser.getFloatTimeDomainData(this.timeDomainData);

      return this.timeDomainData;
    }
  }]);

  return SoundManager;
})();

exports["default"] = SoundManager;
module.exports = exports["default"];

},{}],40:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _MIDIDeviceSelector = require("./MIDIDeviceSelector");

var _MIDIDeviceSelector2 = _interopRequireDefault(_MIDIDeviceSelector);

var _LaunchControlTrackContainer = require("./LaunchControlTrackContainer");

var _LaunchControlTrackContainer2 = _interopRequireDefault(_LaunchControlTrackContainer);

var LaunchControl = (function (_React$Component) {
  _inherits(LaunchControl, _React$Component);

  function LaunchControl() {
    _classCallCheck(this, LaunchControl);

    _get(Object.getPrototypeOf(LaunchControl.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(LaunchControl, [{
    key: "render",
    value: function render() {
      var _props = this.props;
      var router = _props.router;
      var data = _props.data;

      return React.createElement(
        "div",
        { className: "launch-control" },
        React.createElement(_MIDIDeviceSelector2["default"], { router: router, data: data, target: "launch-control" }),
        React.createElement(_LaunchControlTrackContainer2["default"], { router: router, data: data })
      );
    }
  }]);

  return LaunchControl;
})(React.Component);

exports["default"] = LaunchControl;
module.exports = exports["default"];

},{"./LaunchControlTrackContainer":43,"./MIDIDeviceSelector":44}],41:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _styles = require("./styles");

var _styles2 = _interopRequireDefault(_styles);

var _MouseHandler = require("./MouseHandler");

var _MouseHandler2 = _interopRequireDefault(_MouseHandler);

var LaunchControlKnob = (function (_React$Component) {
  _inherits(LaunchControlKnob, _React$Component);

  function LaunchControlKnob() {
    _classCallCheck(this, LaunchControlKnob);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(LaunchControlKnob.prototype), "constructor", this).apply(this, args);

    this.$onMouseDown = this.$onMouseDown.bind(this);
  }

  _createClass(LaunchControlKnob, [{
    key: "render",
    value: function render() {
      var data = this.props.data;

      var styles = undefined;

      if (data.active) {
        styles = _styles2["default"].ACTIVE;
      } else if (data.enabled) {
        styles = _styles2["default"].ENABLED;
      } else {
        styles = _styles2["default"].NORMAL;
      }

      return React.createElement(
        "div",
        { onMouseDown: this.$onMouseDown, className: "launch-control-knob", style: styles },
        data.value
      );
    }
  }, {
    key: "$onMouseDown",
    value: function $onMouseDown() {
      var _props = this.props;
      var router = _props.router;
      var data = _props.data;

      _MouseHandler2["default"].set(this);

      router.createAction("/launch-control/knob/active", {
        track: data.track, index: data.index
      });
    }
  }, {
    key: "$onMouseMove",
    value: function $onMouseMove(_ref) {
      var dy = _ref.dy;
      var _props2 = this.props;
      var router = _props2.router;
      var data = _props2.data;

      router.createAction("/launch-control/knob/update", {
        track: data.track, index: data.index, delta: dy
      });
    }
  }, {
    key: "$onMouseUp",
    value: function $onMouseUp() {
      var _props3 = this.props;
      var router = _props3.router;
      var data = _props3.data;

      router.createAction("/launch-control/knob/deactive", {
        track: data.track, index: data.index
      });
    }
  }]);

  return LaunchControlKnob;
})(React.Component);

exports["default"] = LaunchControlKnob;
module.exports = exports["default"];

},{"./MouseHandler":50,"./styles":53}],42:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _styles = require("./styles");

var _styles2 = _interopRequireDefault(_styles);

var LaunchControlPad = (function (_React$Component) {
  _inherits(LaunchControlPad, _React$Component);

  function LaunchControlPad() {
    _classCallCheck(this, LaunchControlPad);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(LaunchControlPad.prototype), "constructor", this).apply(this, args);

    this.$onMouseDown = this.$onMouseDown.bind(this);
  }

  _createClass(LaunchControlPad, [{
    key: "render",
    value: function render() {
      var data = this.props.data;

      var styles = data.active ? _styles2["default"].ACTIVE : _styles2["default"].NORMAL;

      return React.createElement(
        "div",
        { onMouseDown: this.$onMouseDown, className: "launch-control-pad", style: styles },
        data.value
      );
    }
  }, {
    key: "$onMouseDown",
    value: function $onMouseDown() {
      var _props = this.props;
      var router = _props.router;
      var data = _props.data;

      router.createAction("/launch-control", {
        dataType: "pad",
        value: 127,
        track: data.track,
        channel: 0
      });
    }
  }]);

  return LaunchControlPad;
})(React.Component);

exports["default"] = LaunchControlPad;
module.exports = exports["default"];

},{"./styles":53}],43:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _LaunchControlKnob = require("./LaunchControlKnob");

var _LaunchControlKnob2 = _interopRequireDefault(_LaunchControlKnob);

var _LaunchControlPad = require("./LaunchControlPad");

var _LaunchControlPad2 = _interopRequireDefault(_LaunchControlPad);

var LaunchControlTrackContainer = (function (_React$Component) {
  _inherits(LaunchControlTrackContainer, _React$Component);

  function LaunchControlTrackContainer() {
    _classCallCheck(this, LaunchControlTrackContainer);

    _get(Object.getPrototypeOf(LaunchControlTrackContainer.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(LaunchControlTrackContainer, [{
    key: "render",
    value: function render() {
      var _props = this.props;
      var router = _props.router;
      var data = _props.data;

      var trackElements = [0, 1, 2, 3, 4, 5, 6, 7].map(function (track) {
        var knob1data = { track: track, index: 0, value: data.params[track], enabled: data.enabledParams[track], active: data.activeKnob === track };
        var knob2data = { track: track, index: 1, value: data.params[track + 8], enabled: data.enabledParams[track + 8], active: data.activeKnob === track + 8 };
        var pad1data = { track: track, index: 2, active: data.params[track + 16] };

        return React.createElement(
          "li",
          { className: "launch-control-track" },
          React.createElement(_LaunchControlKnob2["default"], { router: router, data: knob1data }),
          React.createElement(_LaunchControlKnob2["default"], { router: router, data: knob2data }),
          React.createElement(_LaunchControlPad2["default"], { router: router, data: pad1data })
        );
      });

      return React.createElement(
        "ul",
        { className: "launch-control-track-container" },
        trackElements
      );
    }
  }]);

  return LaunchControlTrackContainer;
})(React.Component);

exports["default"] = LaunchControlTrackContainer;
module.exports = exports["default"];

},{"./LaunchControlKnob":41,"./LaunchControlPad":42}],44:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _ToggleButton = require("./ToggleButton");

var _ToggleButton2 = _interopRequireDefault(_ToggleButton);

var DEFAULT = "Select MIDI Device";

var MIDIDeviceSelector = (function (_React$Component) {
  _inherits(MIDIDeviceSelector, _React$Component);

  function MIDIDeviceSelector() {
    _classCallCheck(this, MIDIDeviceSelector);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(MIDIDeviceSelector.prototype), "constructor", this).apply(this, args);

    this.$onChange = this.$onChange.bind(this);
    this.$onClick = this.$onClick.bind(this);
  }

  _createClass(MIDIDeviceSelector, [{
    key: "render",
    value: function render() {
      var _props = this.props;
      var router = _props.router;
      var data = _props.data;

      var options = [DEFAULT].concat(data.controllers).map(function (deviceName) {
        return React.createElement(
          "option",
          { value: deviceName },
          deviceName
        );
      });
      var buttonData = {
        value: data.deviceName && data.deviceName === data.connectedDeviceName,
        trueValue: "CONNECTED",
        falseValue: "CONNECT"
      };

      return React.createElement(
        "div",
        { className: "form-inline" },
        React.createElement(
          "select",
          { value: data.deviceName || DEFAULT, onChange: this.$onChange, className: "form-control midi-device-selector" },
          options
        ),
        React.createElement(_ToggleButton2["default"], { router: router, data: buttonData, action: this.$onClick })
      );
    }
  }, {
    key: "$onChange",
    value: function $onChange(e) {
      var router = this.props.router;

      var selectedIndex = e.target.options.selectedIndex;

      router.createAction("/midi-device/select", {
        target: this.props.target,
        deviceName: e.target.options[selectedIndex].value
      });
    }
  }, {
    key: "$onClick",
    value: function $onClick() {
      var _props2 = this.props;
      var router = _props2.router;
      var data = _props2.data;

      if (!data.deviceName || data.deviceName === DEFAULT) {
        return;
      }

      router.createAction("/midi-device/connect", {
        target: this.props.target,
        deviceName: data.deviceName
      });
    }
  }]);

  return MIDIDeviceSelector;
})(React.Component);

exports["default"] = MIDIDeviceSelector;
module.exports = exports["default"];

},{"./ToggleButton":52}],45:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _MIDIDeviceSelector = require("./MIDIDeviceSelector");

var _MIDIDeviceSelector2 = _interopRequireDefault(_MIDIDeviceSelector);

var _MIDIKeyboardPresetSelector = require("./MIDIKeyboardPresetSelector");

var _MIDIKeyboardPresetSelector2 = _interopRequireDefault(_MIDIKeyboardPresetSelector);

var _MIDIKeyboardController = require("./MIDIKeyboardController");

var _MIDIKeyboardController2 = _interopRequireDefault(_MIDIKeyboardController);

var _MIDIKeyboardContainer = require("./MIDIKeyboardContainer");

var _MIDIKeyboardContainer2 = _interopRequireDefault(_MIDIKeyboardContainer);

var MIDIKeyboard = (function (_React$Component) {
  _inherits(MIDIKeyboard, _React$Component);

  function MIDIKeyboard() {
    _classCallCheck(this, MIDIKeyboard);

    _get(Object.getPrototypeOf(MIDIKeyboard.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(MIDIKeyboard, [{
    key: "render",
    value: function render() {
      var _props = this.props;
      var router = _props.router;
      var data = _props.data;

      return React.createElement(
        "div",
        { className: "midi-keyboard" },
        React.createElement(_MIDIDeviceSelector2["default"], { router: router, data: data, target: "midi-keyboard" }),
        React.createElement(_MIDIKeyboardPresetSelector2["default"], { router: router, data: data }),
        React.createElement(
          "div",
          null,
          React.createElement(_MIDIKeyboardController2["default"], { router: router, data: data }),
          React.createElement(_MIDIKeyboardContainer2["default"], { router: router, data: data })
        )
      );
    }
  }]);

  return MIDIKeyboard;
})(React.Component);

exports["default"] = MIDIKeyboard;
module.exports = exports["default"];

},{"./MIDIDeviceSelector":44,"./MIDIKeyboardContainer":46,"./MIDIKeyboardController":47,"./MIDIKeyboardPresetSelector":49}],46:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _utils = require("../utils");

var _utils2 = _interopRequireDefault(_utils);

var _MIDIKeyboardPad = require("./MIDIKeyboardPad");

var _MIDIKeyboardPad2 = _interopRequireDefault(_MIDIKeyboardPad);

var BLACK_KEYS = [1, 3, 6, 8, 10];

var MIDIKeyboardContainer = (function (_React$Component) {
  _inherits(MIDIKeyboardContainer, _React$Component);

  function MIDIKeyboardContainer() {
    _classCallCheck(this, MIDIKeyboardContainer);

    _get(Object.getPrototypeOf(MIDIKeyboardContainer.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(MIDIKeyboardContainer, [{
    key: "render",
    value: function render() {
      var _props = this.props;
      var router = _props.router;
      var data = _props.data;

      var keyElements = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (index) {
        var styles = {
          paddingTop: BLACK_KEYS.indexOf(index) !== -1 ? 0 : "58px"
        };
        var keyData = _utils2["default"].xtend(data, { value: data.octave * 12 + index });

        return React.createElement(
          "li",
          { className: "midi-keyboard-key" },
          React.createElement(
            "div",
            { style: styles },
            React.createElement(_MIDIKeyboardPad2["default"], { router: router, data: keyData, action: "noteOn" })
          )
        );
      });

      return React.createElement(
        "ul",
        { className: "midi-keyboard-container" },
        keyElements
      );
    }
  }]);

  return MIDIKeyboardContainer;
})(React.Component);

exports["default"] = MIDIKeyboardContainer;
module.exports = exports["default"];

},{"../utils":90,"./MIDIKeyboardPad":48}],47:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _MIDIKeyboardPad = require("./MIDIKeyboardPad");

var _MIDIKeyboardPad2 = _interopRequireDefault(_MIDIKeyboardPad);

var MIDIKeyboardController = (function (_React$Component) {
  _inherits(MIDIKeyboardController, _React$Component);

  function MIDIKeyboardController() {
    _classCallCheck(this, MIDIKeyboardController);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(MIDIKeyboardController.prototype), "constructor", this).apply(this, args);

    this.$onClick = this.$onClick.bind(this);
  }

  _createClass(MIDIKeyboardController, [{
    key: "render",
    value: function render() {
      var router = this.props.router;

      return React.createElement(
        "div",
        { className: "midi-keyboard-controller" },
        React.createElement(_MIDIKeyboardPad2["default"], { router: router, data: { noteOn: {}, value: "+" }, action: this.$onClick }),
        React.createElement(_MIDIKeyboardPad2["default"], { router: router, data: { noteOn: {}, value: "-" }, action: this.$onClick })
      );
    }
  }, {
    key: "$onClick",
    value: function $onClick(e) {
      var router = this.props.router;

      router.createAction("/midi-keyboard/octave-shift", {
        value: ({ "+": +1, "-": -1 })[e.target.innerText] || 0
      });
    }
  }]);

  return MIDIKeyboardController;
})(React.Component);

exports["default"] = MIDIKeyboardController;
module.exports = exports["default"];

},{"./MIDIKeyboardPad":48}],48:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _styles = require("./styles");

var _styles2 = _interopRequireDefault(_styles);

var _MouseHandler = require("./MouseHandler");

var _MouseHandler2 = _interopRequireDefault(_MouseHandler);

var MIDIKeyboardPad = (function (_React$Component) {
  _inherits(MIDIKeyboardPad, _React$Component);

  function MIDIKeyboardPad() {
    _classCallCheck(this, MIDIKeyboardPad);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(MIDIKeyboardPad.prototype), "constructor", this).apply(this, args);

    this.$onMouseDown = this.$onMouseDown.bind(this);
  }

  _createClass(MIDIKeyboardPad, [{
    key: "render",
    value: function render() {
      var data = this.props.data;

      var styles = data.noteOn[data.value] ? _styles2["default"].ACTIVE : _styles2["default"].NORMAL;

      return React.createElement(
        "div",
        { onMouseDown: this.$onMouseDown, className: "midi-keyboard-pad", style: styles },
        data.value
      );
    }
  }, {
    key: "$onMouseDown",
    value: function $onMouseDown(e) {
      var _props = this.props;
      var router = _props.router;
      var data = _props.data;

      if (typeof this.props.action === "function") {
        this.props.action(e);
      } else {
        _MouseHandler2["default"].set(this);
        router.createAction("/midi-keyboard/noteOn", {
          dataType: "noteOn",
          noteNumber: data.value,
          velocity: 100
        });
      }
    }
  }, {
    key: "$onMouseUp",
    value: function $onMouseUp() {
      var _props2 = this.props;
      var router = _props2.router;
      var data = _props2.data;

      router.createAction("/midi-keyboard/noteOff", {
        dataType: "noteOff",
        noteNumber: data.value,
        velocity: 0
      });
    }
  }]);

  return MIDIKeyboardPad;
})(React.Component);

exports["default"] = MIDIKeyboardPad;
module.exports = exports["default"];

},{"./MouseHandler":50,"./styles":53}],49:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var DEFAULT = "Routing";

var MIDIKeyboardPresetSelector = (function (_React$Component) {
  _inherits(MIDIKeyboardPresetSelector, _React$Component);

  function MIDIKeyboardPresetSelector() {
    _classCallCheck(this, MIDIKeyboardPresetSelector);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(MIDIKeyboardPresetSelector.prototype), "constructor", this).apply(this, args);

    this.$onChange = this.$onChange.bind(this);
  }

  _createClass(MIDIKeyboardPresetSelector, [{
    key: "render",
    value: function render() {
      var data = this.props.data;

      var options = [DEFAULT].concat(data.presets).map(function (presetName) {
        return React.createElement(
          "option",
          { value: presetName },
          presetName
        );
      });

      return React.createElement(
        "div",
        { className: "form-inline" },
        React.createElement(
          "select",
          { value: data.presetName || DEFAULT, onChange: this.$onChange, className: "form-control midi-keyboard-preset-selector" },
          options
        )
      );
    }
  }, {
    key: "$onChange",
    value: function $onChange(e) {
      var router = this.props.router;

      var selectedIndex = e.target.options.selectedIndex;

      router.createAction("/midi-keyboard/preset", {
        presetName: e.target.options[selectedIndex].value
      });
    }
  }]);

  return MIDIKeyboardPresetSelector;
})(React.Component);

exports["default"] = MIDIKeyboardPresetSelector;
module.exports = exports["default"];

},{}],50:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var LOCKED = true;

var MouseHandler = (function () {
  _createClass(MouseHandler, null, [{
    key: "getInstance",
    value: function getInstance() {
      if (!MouseHandler.instance) {
        LOCKED = false;
        MouseHandler.instance = new MouseHandler();
        LOCKED = false;
      }
      return MouseHandler.instance;
    }
  }, {
    key: "set",
    value: function set(target) {
      MouseHandler.getInstance().set(target);
    }
  }]);

  function MouseHandler() {
    var _this = this;

    _classCallCheck(this, MouseHandler);

    if (LOCKED) {
      throw new TypeError("Illegal constructor");
    }

    this._x = 0;
    this._y = 0;
    this._target = null;

    document.body.addEventListener("mousemove", function (e) {
      _this.$onMouseMove({ x: e.clientX, y: e.clientY });
    });

    document.body.addEventListener("mouseup", function (e) {
      _this.$onMouseUp({ x: e.clientX, y: e.clientY });
    });
  }

  _createClass(MouseHandler, [{
    key: "set",
    value: function set(target) {
      this._target = target;
    }
  }, {
    key: "$onMouseMove",
    value: function $onMouseMove(data) {
      var dx = data.x - this._x;
      var dy = data.y - this._y;
      var x = this._x = data.x;
      var y = this._y = data.y;

      if (this._target && typeof this._target.$onMouseMove === "function") {
        this._target.$onMouseMove({ x: x, y: y, dx: dx, dy: dy });
      }
    }
  }, {
    key: "$onMouseUp",
    value: function $onMouseUp(data) {
      var x = this._x = data.x;
      var y = this._y = data.y;

      if (this._target && typeof this._target.$onMouseUp === "function") {
        this._target.$onMouseUp({ x: x, y: y, dx: 0, dy: 0 });
      }
      this._target = null;
    }
  }]);

  return MouseHandler;
})();

exports["default"] = MouseHandler;
module.exports = exports["default"];

},{}],51:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var SongSelector = (function (_React$Component) {
  _inherits(SongSelector, _React$Component);

  function SongSelector() {
    _classCallCheck(this, SongSelector);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(SongSelector.prototype), "constructor", this).apply(this, args);

    this.$onChange = this.$onChange.bind(this);
  }

  _createClass(SongSelector, [{
    key: "render",
    value: function render() {
      var data = this.props.data;

      var options = data.songs.map(function (song) {
        var songName = song.replace(/-/g, " ");

        songName = songName.charAt(0).toUpperCase() + songName.substr(1);

        return React.createElement(
          "option",
          { value: song },
          songName
        );
      });

      return React.createElement(
        "div",
        { className: "form-inline" },
        React.createElement(
          "select",
          { value: data.song, onChange: this.$onChange, className: "form-control song-selector" },
          options
        )
      );
    }
  }, {
    key: "$onChange",
    value: function $onChange(e) {
      var router = this.props.router;

      var selectedIndex = e.target.options.selectedIndex;

      router.createAction("/sound/load/score", {
        name: e.target.options[selectedIndex].value
      });
    }
  }]);

  return SongSelector;
})(React.Component);

exports["default"] = SongSelector;
module.exports = exports["default"];

},{}],52:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _styles = require("./styles");

var _styles2 = _interopRequireDefault(_styles);

var ToggleButton = (function (_React$Component) {
  _inherits(ToggleButton, _React$Component);

  function ToggleButton() {
    _classCallCheck(this, ToggleButton);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(ToggleButton.prototype), "constructor", this).apply(this, args);

    this.$onClick = this.$onClick.bind(this);
  }

  _createClass(ToggleButton, [{
    key: "render",
    value: function render() {
      var data = this.props.data;

      var caption = data.value ? data.trueValue : data.falseValue;
      var styles = data.value ? _styles2["default"].ON : _styles2["default"].OFF;

      return React.createElement(
        "button",
        { onClick: this.$onClick, className: "btn btn-default btn-toggle", style: styles },
        caption
      );
    }
  }, {
    key: "$onClick",
    value: function $onClick(e) {
      var _props = this.props;
      var router = _props.router;
      var data = _props.data;

      if (typeof this.props.action === "function") {
        this.props.action(e);
      } else {
        router.createAction("/toggle-button/click/" + this.props.action, {
          value: data.value
        });
      }
    }
  }]);

  return ToggleButton;
})(React.Component);

exports["default"] = ToggleButton;
module.exports = exports["default"];

},{"./styles":53}],53:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = {
  NORMAL: {
    color: "#004039",
    backgroundColor: "#C8EFEA"
  },
  ENABLED: {
    color: "#004039",
    backgroundColor: "#68CFC3"
  },
  ACTIVE: {
    fontWeight: "bold",
    color: "#FFFFFF",
    backgroundColor: "#009F8C"
  },
  ON: {
    fontWeight: "bold",
    color: "#FFFFFF",
    backgroundColor: "#009F8C"
  },
  OFF: {
    color: "#333333",
    backgroundColor: "#FFFFFF"
  },
  SEQUENCER_ON: {
    color: "#009F8C"
  },
  SEQUENCER_OFF: {
    color: "#333333"
  }
};
module.exports = exports["default"];

},{}],54:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var _config = require("../config");

var _config2 = _interopRequireDefault(_config);

exports["default"] = _utils2["default"].xtend(_config2["default"], {});
module.exports = exports["default"];

},{"../config":92,"./utils":90}],55:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoRemoteFluxx = require("@mohayonao/remote-fluxx");

var _mohayonaoRemoteFluxx2 = _interopRequireDefault(_mohayonaoRemoteFluxx);

var _workerTimer = require("worker-timer");

var _workerTimer2 = _interopRequireDefault(_workerTimer);

var _SyncDate = require("./SyncDate");

var _SyncDate2 = _interopRequireDefault(_SyncDate);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var _SoundCreator = require("../SoundCreator");

var _SoundCreator2 = _interopRequireDefault(_SoundCreator);

var _SoundDispatcher = require("./SoundDispatcher");

var _SoundDispatcher2 = _interopRequireDefault(_SoundDispatcher);

var _SoundManager = require("../SoundManager");

var _SoundManager2 = _interopRequireDefault(_SoundManager);

var _actions = require("./actions");

var _actions2 = _interopRequireDefault(_actions);

var _stores = require("./stores");

var _stores2 = _interopRequireDefault(_stores);

var _config = require("./config");

var _config2 = _interopRequireDefault(_config);

var Router = (function (_fluxx$Client) {
  _inherits(Router, _fluxx$Client);

  function Router() {
    var _this = this;

    _classCallCheck(this, Router);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(Router.prototype), "constructor", this).apply(this, args);

    this._syncTimes = [];

    this.audioContext = _utils2["default"].getAudioContext();
    this.timeline = new _utils.Timeline({
      context: this.audioContext,
      timerAPI: _workerTimer2["default"]
    });

    var soundOpts = {
      audioContext: this.audioContext,
      timeline: this.timeline,
      offsetTime: _config2["default"].SEQUENCE_OFFSET_TIME
    };

    this.soundCreator = new _SoundCreator2["default"](soundOpts);
    this.soundDispatcher = new _SoundDispatcher2["default"](soundOpts);
    this.soundManager = new _SoundManager2["default"](soundOpts);

    // 追加
    this.soundManager.router = this;

    this.soundDispatcher.connect(this.soundManager.inlet);

    this.soundCreator.on("created", function (instance) {
      _this.soundDispatcher.push(instance);
      _this.emit("noteOn", instance);
    });

    this.actions = Object.keys(_actions2["default"]).map(function (className) {
      return new _actions2["default"][className](_this);
    });
    this.stores = Object.keys(_stores2["default"]).map(function (className) {
      return new _stores2["default"][className](_this);
    });

    this.addChangeListener(this.updateStateFromStore.bind(this));
  }

  _createClass(Router, [{
    key: "play",
    value: function play(data) {
      if (this.state !== "running") {
        return;
      }

      var now = _SyncDate2["default"].now() * 0.001;
      var deltaTime = data.playbackTime - now;

      data.playbackTime = this.audioContext.currentTime + deltaTime;

      this.soundCreator.push(data);
    }
  }, {
    key: "updateStateFromStore",
    value: function updateStateFromStore() {
      var state = this.getStateFromStores();

      if (state.sound.enabled) {
        this.timeline.start();
      } else {
        this.timeline.stop(true);
      }

      this.params = state.launchControl.params;
      this.soundCreator.setParams(this.params);
    }
  }, {
    key: "syncTime",
    value: function syncTime() {
      var _this2 = this;

      var beginTime = Date.now();

      this.socket.emit("ping");
      this.socket.once("pong", function (serverCurrentTime) {
        var endTime = Date.now();
        var elapsed = endTime - beginTime;
        var currentTime = endTime - elapsed * 0.5;
        var deltaTime = serverCurrentTime - currentTime;

        _this2._syncTimes.push(deltaTime);

        if (_this2._syncTimes.length < 5) {
          return setTimeout(function () {
            return _this2.syncTime();
          }, 100);
        }

        _this2._syncTimes.shift();

        var averageDeltaTime = _this2._syncTimes.reduce(function (a, b) {
          return a + b;
        }, 0) / _this2._syncTimes.length;

        _SyncDate2["default"].setDeltaTime(Math.round(averageDeltaTime));

        _this2._syncTimes = [];

        setTimeout(function () {
          return _this2.syncTime();
        }, 1000 * 30);
      });
    }
  }, {
    key: "state",
    get: function get() {
      return this.soundManager.state;
    }
  }]);

  return Router;
})(_mohayonaoRemoteFluxx2["default"].Client);

exports["default"] = Router;
module.exports = exports["default"];

},{"../SoundCreator":37,"../SoundManager":39,"./SoundDispatcher":56,"./SyncDate":57,"./actions":62,"./config":64,"./stores":70,"./utils":71,"@mohayonao/remote-fluxx":27,"worker-timer":35}],56:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _SoundDispatcher = require("../SoundDispatcher");

var _SoundDispatcher2 = _interopRequireDefault(_SoundDispatcher);

var SoundDispatcher = (function (_BaseSoundDispatcher) {
  _inherits(SoundDispatcher, _BaseSoundDispatcher);

  function SoundDispatcher() {
    _classCallCheck(this, SoundDispatcher);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(SoundDispatcher.prototype), "constructor", this).apply(this, args);

    this.outlet = this.audioContext.createDynamicsCompressor();
    this.outlet.ratio.value = 9;
    this.outlet.threshold.value = -2;
  }

  _createClass(SoundDispatcher, [{
    key: "push",
    value: function push(instance) {
      instance.connect(this.outlet);
    }
  }]);

  return SoundDispatcher;
})(_SoundDispatcher2["default"]);

exports["default"] = SoundDispatcher;
module.exports = exports["default"];

},{"../SoundDispatcher":38}],57:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var deltaTime = 0;

var SyncDate = (function () {
  function SyncDate() {
    _classCallCheck(this, SyncDate);

    return new Date(Date.now() + deltaTime);
  }

  _createClass(SyncDate, null, [{
    key: "setDeltaTime",
    value: function setDeltaTime(value) {
      deltaTime = value;
    }
  }, {
    key: "now",
    value: function now() {
      return Date.now() + deltaTime;
    }
  }]);

  return SyncDate;
})();

exports["default"] = SyncDate;
module.exports = exports["default"];

},{}],58:[function(require,module,exports){
(function (global){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var Visualizer = (function () {
  function Visualizer(canvas, fps) {
    _classCallCheck(this, Visualizer);

    canvas.width = global.innerWidth;
    canvas.height = global.innerHeight;

    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.canvas.context = this.context;
    this.fps = _utils2["default"].defaults(fps, 20);

    this._timerId = 0;
    this._animations = [];
    this._onprocess = this._onprocess.bind(this);
  }

  _createClass(Visualizer, [{
    key: "start",
    value: function start() {
      if (this._timerId !== 0) {
        return;
      }
      this._timerId = setInterval(this._onprocess, 1000 / this.fps);
    }
  }, {
    key: "stop",
    value: function stop() {
      if (this._timerId === 0) {
        return;
      }
      clearInterval(this._timerId);
      this._timerId = 0;
    }
  }, {
    key: "push",
    value: function push(animation) {
      var index = this._animations.indexOf(animation);

      if (index === -1) {
        this._animations.push(animation);
      }
    }
  }, {
    key: "unshift",
    value: function unshift(animation) {
      var index = this._animations.indexOf(animation);

      if (index === -1) {
        this._animations.unshift(animation);
      }
    }
  }, {
    key: "remove",
    value: function remove(animation) {
      _utils2["default"].removeIfExists(this._animations, animation);
    }
  }, {
    key: "_onprocess",
    value: function _onprocess() {
      var _this = this;

      var canvas = this.canvas;
      var context = this.context;
      var t1 = Date.now();

      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, canvas.width, canvas.height);

      this._animations.forEach(function (animation) {
        animation(_this.canvas, t1);
      });
    }
  }]);

  return Visualizer;
})();

exports["default"] = Visualizer;
module.exports = exports["default"];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./utils":71}],59:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoRemoteFluxx = require("@mohayonao/remote-fluxx");

var _mohayonaoRemoteFluxx2 = _interopRequireDefault(_mohayonaoRemoteFluxx);

var _utils = require("../utils");

var _utils2 = _interopRequireDefault(_utils);

var DeviceMotionAction = (function (_fluxx$Action) {
  _inherits(DeviceMotionAction, _fluxx$Action);

  function DeviceMotionAction() {
    _classCallCheck(this, DeviceMotionAction);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(DeviceMotionAction.prototype), "constructor", this).apply(this, args);

    this.devicemotionEnabled = false;
    this._ondeviceorientation = _utils2["default"].throttle(this._ondeviceorientation.bind(this), 200).bind(this);
  }

  _createClass(DeviceMotionAction, [{
    key: "/event/deviceorientation",
    value: function eventDeviceorientation(_ref) {
      var enabled = _ref.enabled;

      if (this.devicemotionEnabled === enabled) {
        return;
      }
      if (enabled) {
        window.addEventListener("deviceorientation", this._ondeviceorientation, false);
      } else {
        window.removeEventListener("deviceorientation", this._ondeviceorientation, false);
      }
      this.devicemotionEnabled = enabled;
    }
  }, {
    key: "_ondeviceorientation",
    value: function _ondeviceorientation(event) {
      var alpha = event.alpha;
      var beta = event.beta;
      var gamma = event.gamma;

      this.router.sendAction("/devicemotion/update/orientation", {
        alpha: alpha, beta: beta, gamma: gamma
      });
    }
  }]);

  return DeviceMotionAction;
})(_mohayonaoRemoteFluxx2["default"].Action);

exports["default"] = DeviceMotionAction;
module.exports = exports["default"];

},{"../utils":71,"@mohayonao/remote-fluxx":27}],60:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoRemoteFluxx = require("@mohayonao/remote-fluxx");

var _mohayonaoRemoteFluxx2 = _interopRequireDefault(_mohayonaoRemoteFluxx);

var ServerAction = (function (_fluxx$Action) {
  _inherits(ServerAction, _fluxx$Action);

  function ServerAction() {
    _classCallCheck(this, ServerAction);

    _get(Object.getPrototypeOf(ServerAction.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(ServerAction, [{
    key: "/server/sendState",
    value: function serverSendState(data) {
      this.doneAction("/launch-control/params/update", { params: new Uint8Array(data.params) });
      this.doneAction("/sequencer/state", { state: data.state });
      this.doneAction("/server/state", { connected: data.connected });
    }
  }, {
    key: "/server/play",
    value: function serverPlay(data) {
      this.doneAction("/sequencer/play", data);
    }
  }]);

  return ServerAction;
})(_mohayonaoRemoteFluxx2["default"].Action);

exports["default"] = ServerAction;
module.exports = exports["default"];

},{"@mohayonao/remote-fluxx":27}],61:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoRemoteFluxx = require("@mohayonao/remote-fluxx");

var _mohayonaoRemoteFluxx2 = _interopRequireDefault(_mohayonaoRemoteFluxx);

var SoundAction = (function (_fluxx$Action) {
  _inherits(SoundAction, _fluxx$Action);

  function SoundAction() {
    _classCallCheck(this, SoundAction);

    _get(Object.getPrototypeOf(SoundAction.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(SoundAction, [{
    key: "/toggle-button/click/sound",
    value: function toggleButtonClickSound() {
      this.doneAction("/toggle-button/click/sound");
    }
  }]);

  return SoundAction;
})(_mohayonaoRemoteFluxx2["default"].Action);

exports["default"] = SoundAction;
module.exports = exports["default"];

},{"@mohayonao/remote-fluxx":27}],62:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _DeviceMotionAction = require("./DeviceMotionAction");

var _DeviceMotionAction2 = _interopRequireDefault(_DeviceMotionAction);

var _ServerAction = require("./ServerAction");

var _ServerAction2 = _interopRequireDefault(_ServerAction);

var _SoundAction = require("./SoundAction");

var _SoundAction2 = _interopRequireDefault(_SoundAction);

exports["default"] = {
  DeviceMotionAction: _DeviceMotionAction2["default"],
  ServerAction: _ServerAction2["default"],
  SoundAction: _SoundAction2["default"]
};
module.exports = exports["default"];

},{"./DeviceMotionAction":59,"./ServerAction":60,"./SoundAction":61}],63:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _componentsToggleButton = require("../../components/ToggleButton");

var _componentsToggleButton2 = _interopRequireDefault(_componentsToggleButton);

var _componentsStyles = require("../../components/styles");

var _componentsStyles2 = _interopRequireDefault(_componentsStyles);

var MainApp = (function (_React$Component) {
  _inherits(MainApp, _React$Component);

  function MainApp() {
    _classCallCheck(this, MainApp);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(MainApp.prototype), "constructor", this).apply(this, args);

    this.state = this.getStateFromStores();

    this.$onChange = this.$onChange.bind(this);
  }

  _createClass(MainApp, [{
    key: "getStateFromStores",
    value: function getStateFromStores() {
      var router = this.props.router;

      return router.getStateFromStores();
    }
  }, {
    key: "componentWillMount",
    value: function componentWillMount() {
      var router = this.props.router;

      router.addChangeListener(this.$onChange);
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      var router = this.props.router;

      router.removeChangeListener(this.$onChange);
    }
  }, {
    key: "render",
    value: function render() {
      var router = this.props.router;

      var styles = this.state.sequencer.enabled ? _componentsStyles2["default"].SEQUENCER_ON : _componentsStyles2["default"].SEQUENCER_OFF;
      var soundButtonData = {
        value: this.state.sound.enabled,
        trueValue: "SOUND ON",
        falseValue: "SOUND OFF"
      };

      return React.createElement(
        "div",
        null,
        React.createElement(
          "h1",
          { style: styles },
          "WEB MUSIC HACKATHON 04"
        ),
        React.createElement(
          "div",
          null,
          React.createElement(_componentsToggleButton2["default"], { router: router, data: soundButtonData, action: "sound" }),
          React.createElement(
            "div",
            null,
            "connected: ",
            this.state.server.connected
          )
        ),
        React.createElement("div", { id: "orientation" })
      );
    }
  }, {
    key: "$onChange",
    value: function $onChange() {
      this.setState(this.getStateFromStores());
    }
  }]);

  return MainApp;
})(React.Component);

exports["default"] = MainApp;
module.exports = exports["default"];

},{"../../components/ToggleButton":52,"../../components/styles":53}],64:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var _config = require("../config");

var _config2 = _interopRequireDefault(_config);

exports["default"] = _utils2["default"].xtend(_config2["default"], {
  SEQUENCE_OFFSET_TIME: 1
});
module.exports = exports["default"];

},{"../config":54,"./utils":71}],65:[function(require,module,exports){
(function (global){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _Router = require("./Router");

var _Router2 = _interopRequireDefault(_Router);

var _componentsMainApp = require("./components/MainApp");

var _componentsMainApp2 = _interopRequireDefault(_componentsMainApp);

var _Visualizer = require("./Visualizer");

var _Visualizer2 = _interopRequireDefault(_Visualizer);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

function run() {
  var socket = window.io();
  var router = new _Router2["default"](socket);
  var button = document.getElementById("button");
  var canvas = document.getElementById("canvas");
  var visualizer = new _Visualizer2["default"](canvas);

  switch (_utils2["default"].getPerformanceLevel()) {
    case 2:
      visualizer.fps = 20;
      break;
    case 1:
      visualizer.fps = 10;
      break;
    default:
      visualizer.fps = 5;
      break;
  }

  if (global.location.hash === "#ctrl" && "ondeviceorientation" in global) {
    router.createAction("/event/deviceorientation", { enabled: true });
  }

  router.syncTime();
  _utils2["default"].chore();

  router.on("statechange", function (state) {
    if (state === "running") {
      button.innerText = "SOUND ON";
      button.style.fontWeight = "bold";
      button.style.color = "#FFFFFF";
      button.style.backgroundColor = "#009F8C";
    } else {
      button.innerText = "SOUND OFF";
      button.style.fontWeight = "normal";
      button.style.color = "#333333";
      button.style.backgroundColor = "#FFFFFF";
    }
  });

  router.on("noteOn", function (instance) {
    var t0 = Date.now();
    var duration = instance.duration;

    function animation(canvas, t1) {
      var elapsed = (t1 - t0) * 0.001;
      var a = _utils2["default"].constrain(_utils2["default"].linlin(elapsed, 0, duration, 1, 0), 0, 0.5);

      if (a === 0) {
        visualizer.remove(animation);
      } else {
        canvas.context.fillStyle = "rgba(200, 239, 234, " + a + ")";
        canvas.context.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    visualizer.unshift(animation);

    instance.on("ended", function () {
      visualizer.remove(animation);
    });
  });

  visualizer.push(function (canvas) {
    var width = canvas.width;

    // grid
    var height = canvas.height;
    var context = canvas.context;
    context.beginPath();
    context.strokeStyle = "#009F8C";

    [0.25, 0.50, 0.75].forEach(function (rate) {
      context.moveTo(rate * width, 0);
      context.lineTo(rate * width, height);
    });

    context.stroke();

    // spectrum
    var frequencyData = router.soundManager.getFloatFrequencyData();

    context.strokeStyle = "#DF81A2";
    context.beginPath();
    context.moveTo(0, frequencyData[0] / 240 * height + 100);

    for (var i = 1, imax = frequencyData.length; i < imax; i++) {
      context.lineTo(i / imax * width, -frequencyData[i] / 240 * height + 100);
    }

    context.stroke();

    // wave
    var timeDomainData = router.soundManager.getFloatTimeDomainData();

    context.strokeStyle = "#DF81A2";
    context.beginPath();
    context.moveTo(0, _utils2["default"].linlin(timeDomainData[0], -1, 1, height, 0));

    for (var i = 1, imax = timeDomainData.length; i < imax; i++) {
      var x = i / imax * width;
      var y = _utils2["default"].linlin(timeDomainData[i], -1, 1, height, 0);

      context.lineTo(x, y);
    }

    context.stroke();
  });

  React.render(React.createElement(_componentsMainApp2["default"], { router: router }), document.getElementById("app"));

  visualizer.start();

  return router;
}

exports["default"] = { run: run };
module.exports = exports["default"];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Router":55,"./Visualizer":58,"./components/MainApp":63,"./utils":71}],66:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoRemoteFluxx = require("@mohayonao/remote-fluxx");

var _mohayonaoRemoteFluxx2 = _interopRequireDefault(_mohayonaoRemoteFluxx);

var _config = require("../config");

var _config2 = _interopRequireDefault(_config);

var LaunchControlStore = (function (_fluxx$Store) {
  _inherits(LaunchControlStore, _fluxx$Store);

  function LaunchControlStore() {
    _classCallCheck(this, LaunchControlStore);

    _get(Object.getPrototypeOf(LaunchControlStore.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(LaunchControlStore, [{
    key: "getInitialState",
    value: function getInitialState() {
      return {
        params: new Uint8Array(_config2["default"].DEFAULT_PARAMS)
      };
    }
  }, {
    key: "/launch-control/params/update",
    value: function launchControlParamsUpdate(_ref) {
      var params = _ref.params;

      this.data.params = params;
      this.emitChange();
    }
  }]);

  return LaunchControlStore;
})(_mohayonaoRemoteFluxx2["default"].Store);

exports["default"] = LaunchControlStore;
module.exports = exports["default"];

},{"../config":64,"@mohayonao/remote-fluxx":27}],67:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoRemoteFluxx = require("@mohayonao/remote-fluxx");

var _mohayonaoRemoteFluxx2 = _interopRequireDefault(_mohayonaoRemoteFluxx);

var SequencerStore = (function (_fluxx$Store) {
  _inherits(SequencerStore, _fluxx$Store);

  function SequencerStore() {
    _classCallCheck(this, SequencerStore);

    _get(Object.getPrototypeOf(SequencerStore.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(SequencerStore, [{
    key: "getInitialState",
    value: function getInitialState() {
      return {
        enabled: false
      };
    }
  }, {
    key: "/sequencer/state",
    value: function sequencerState(_ref) {
      var state = _ref.state;

      this.data.enabled = state === "running";
      this.emitChange();
    }
  }, {
    key: "/sequencer/play",
    value: function sequencerPlay(data) {
      var _this = this;

      data.forEach(function (data) {
        _this.router.play(data);
      });
    }
  }]);

  return SequencerStore;
})(_mohayonaoRemoteFluxx2["default"].Store);

exports["default"] = SequencerStore;
module.exports = exports["default"];

},{"@mohayonao/remote-fluxx":27}],68:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoRemoteFluxx = require("@mohayonao/remote-fluxx");

var _mohayonaoRemoteFluxx2 = _interopRequireDefault(_mohayonaoRemoteFluxx);

var ServerStore = (function (_fluxx$Store) {
  _inherits(ServerStore, _fluxx$Store);

  function ServerStore() {
    _classCallCheck(this, ServerStore);

    _get(Object.getPrototypeOf(ServerStore.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(ServerStore, [{
    key: "getInitialState",
    value: function getInitialState() {
      return {
        connected: 0
      };
    }
  }, {
    key: "/server/state",
    value: function serverState(_ref) {
      var connected = _ref.connected;

      this.data.connected = connected;
      this.emitChange();
    }
  }]);

  return ServerStore;
})(_mohayonaoRemoteFluxx2["default"].Store);

exports["default"] = ServerStore;
module.exports = exports["default"];

},{"@mohayonao/remote-fluxx":27}],69:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoRemoteFluxx = require("@mohayonao/remote-fluxx");

var _mohayonaoRemoteFluxx2 = _interopRequireDefault(_mohayonaoRemoteFluxx);

var SoundStore = (function (_fluxx$Store) {
  _inherits(SoundStore, _fluxx$Store);

  function SoundStore() {
    _classCallCheck(this, SoundStore);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(SoundStore.prototype), "constructor", this).apply(this, args);

    this.soundManager = this.router.soundManager;
  }

  _createClass(SoundStore, [{
    key: "getInitialState",
    value: function getInitialState() {
      return {
        enabled: false
      };
    }
  }, {
    key: "/toggle-button/click/sound",
    value: function toggleButtonClickSound() {
      if (this.soundManager.state === "suspended") {
        this.soundManager.start();
      } else {
        this.soundManager.stop();
      }

      var enabled = this.soundManager.state === "running";

      this.data.enabled = enabled;
      this.emitChange();

      this.router.socket.emit("enabled", enabled);
    }
  }, {
    key: "/devicemotion/orientation",
    value: function devicemotionOrientation(_ref) {
      var point = _ref.point;

      this.router.sendAction("/devicemotion/orientation", {
        x: point.x,
        y: point.y
      });
    }
  }]);

  return SoundStore;
})(_mohayonaoRemoteFluxx2["default"].Store);

exports["default"] = SoundStore;
module.exports = exports["default"];

},{"@mohayonao/remote-fluxx":27}],70:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _LaunchControlStore = require("./LaunchControlStore");

var _LaunchControlStore2 = _interopRequireDefault(_LaunchControlStore);

var _SequencerStore = require("./SequencerStore");

var _SequencerStore2 = _interopRequireDefault(_SequencerStore);

var _ServerStore = require("./ServerStore");

var _ServerStore2 = _interopRequireDefault(_ServerStore);

var _SoundStore = require("./SoundStore");

var _SoundStore2 = _interopRequireDefault(_SoundStore);

exports["default"] = {
  LaunchControlStore: _LaunchControlStore2["default"],
  SequencerStore: _SequencerStore2["default"],
  ServerStore: _ServerStore2["default"],
  SoundStore: _SoundStore2["default"]
};
module.exports = exports["default"];

},{"./LaunchControlStore":66,"./SequencerStore":67,"./ServerStore":68,"./SoundStore":69}],71:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _utils = require("../utils");

var _utils2 = _interopRequireDefault(_utils);

exports["default"] = _utils2["default"].xtend(_utils2["default"], {});
module.exports = exports["default"];

},{"../utils":90}],72:[function(require,module,exports){
(function (global){
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

global.AudioContext = global.AudioContext || global.webkitAudioContext;
global.OfflineAudioContext = global.OfflineAudioContext || global.webkitOfflineAudioContext;

global.fetch = global.fetch || function (url) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();

    xhr.open("GET", url);

    if (/\.(?:wav|mp3|off|aiff)$/.test(url)) {
      xhr.responseType = "arraybuffer";
    }

    xhr.onload = function () {
      resolve({
        text: function text() {
          return xhr.response;
        },
        json: function json() {
          return JSON.parse(xhr.response);
        },
        arrayBuffer: function arrayBuffer() {
          return xhr.response;
        }
      });
    };
    xhr.onerror = reject;
    xhr.send();
  });
};

global.React = global.React || {
  Component: function Component() {
    _classCallCheck(this, Component);
  }
};

global.setImmediate = global.setImmediate || function (callback) {
  setTimeout(callback, 0);
};

var AnalyserNode = global.AnalyserNode;

function installGetFloatTimeDomainData() {
  if (AnalyserNode.prototype.hasOwnProperty("getFloatTimeDomainData")) {
    return;
  }

  var uint8 = new Uint8Array(2048);

  AnalyserNode.prototype.getFloatTimeDomainData = function (array) {
    this.getByteTimeDomainData(uint8);
    for (var i = 0, imax = array.length; i < imax; i++) {
      array[i] = (uint8[i] - 128) * 0.0078125;
    }
  };
}

installGetFloatTimeDomainData();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],73:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoRemoteFluxx = require("@mohayonao/remote-fluxx");

var _mohayonaoRemoteFluxx2 = _interopRequireDefault(_mohayonaoRemoteFluxx);

var _workerTimer = require("worker-timer");

var _workerTimer2 = _interopRequireDefault(_workerTimer);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var _SoundCreator = require("../SoundCreator");

var _SoundCreator2 = _interopRequireDefault(_SoundCreator);

var _SoundDispatcher = require("./SoundDispatcher");

var _SoundDispatcher2 = _interopRequireDefault(_SoundDispatcher);

var _SoundManager = require("../SoundManager");

var _SoundManager2 = _interopRequireDefault(_SoundManager);

var _actions = require("./actions");

var _actions2 = _interopRequireDefault(_actions);

var _stores = require("./stores");

var _stores2 = _interopRequireDefault(_stores);

var _config = require("./config");

var _config2 = _interopRequireDefault(_config);

var _sound = require("../../sound");

var _sound2 = _interopRequireDefault(_sound);

var Router = (function (_fluxx$Router) {
  _inherits(Router, _fluxx$Router);

  function Router() {
    var _this = this;

    _classCallCheck(this, Router);

    _get(Object.getPrototypeOf(Router.prototype), "constructor", this).call(this);

    this.audioContext = _utils2["default"].getAudioContext();
    this.timeline = new _utils.Timeline({
      context: this.audioContext,
      timerAPI: _workerTimer2["default"]
    });

    var soundOpts = {
      audioContext: this.audioContext,
      timeline: this.timeline,
      offsetTime: _config2["default"].SEQUENCE_OFFSET_TIME
    };

    this.soundCreator = new _SoundCreator2["default"](soundOpts);
    this.soundDispatcher = new _SoundDispatcher2["default"](soundOpts);
    this.soundManager = new _SoundManager2["default"](soundOpts);
    this.soundDispatcher.connect(this.soundManager.inlet);
    this.soundManager.router = this;

    this.soundCreator.on("created", function (instance) {
      _this.soundDispatcher.push(instance);
    });

    this.tracks = _sound2["default"].tracks.tracks.map(function (Track) {
      return new Track(_this.timeline).on("play", function (data) {
        _this.soundCreator.push(data);
      });
    });

    this.params = new Uint8Array(_config2["default"].DEFAULT_PARAMS);
    this.actions = Object.keys(_actions2["default"]).map(function (className) {
      return new _actions2["default"][className](_this);
    });
    this.stores = Object.keys(_stores2["default"]).map(function (className) {
      return new _stores2["default"][className](_this);
    });

    this.addChangeListener(this.updateStateFromStore.bind(this));
  }

  _createClass(Router, [{
    key: "updateStateFromStore",
    value: function updateStateFromStore() {
      var state = this.getStateFromStores();

      if (state.sound.enabled) {
        this.timeline.start();
      } else {
        this.timeline.stop(true);
      }

      this.tracks.forEach(function (track) {
        track.setState(_utils2["default"].xtend(state.sequencer, state.launchControl));
      });

      this.params = state.launchControl.params;
      this.soundCreator.setParams(this.params);

      this.createAction("/storage/set", {
        song: state.sequencer.song,
        launchControlDeviceName: state.launchControl.deviceName,
        launchControlParams: [].slice.call(state.launchControl.params),
        midiKeyboardDeviceName: state.midiKeyboard.deviceName,
        midiKeyboardPresetName: state.midiKeyboard.presetName
      });
    }
  }, {
    key: "play",
    value: function play(data) {
      if (this.state !== "running") {
        return;
      }

      if (data.program && data.program !== "Routing") {
        this.soundCreator.push(data);
        return;
      }

      var params = this.params;

      for (var i = 0; i < 8; i++) {
        if (params[i + 16]) {
          this.tracks[i].push(data);
        }
      }
    }
  }, {
    key: "state",
    get: function get() {
      return this.soundManager.state;
    }
  }]);

  return Router;
})(_mohayonaoRemoteFluxx2["default"].Router);

exports["default"] = Router;
module.exports = exports["default"];

},{"../../sound":106,"../SoundCreator":37,"../SoundManager":39,"./SoundDispatcher":74,"./actions":80,"./config":82,"./stores":88,"./utils":89,"@mohayonao/remote-fluxx":27,"worker-timer":35}],74:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _SoundDispatcher = require("../SoundDispatcher");

var _SoundDispatcher2 = _interopRequireDefault(_SoundDispatcher);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var SoundDispatcher = (function (_BaseSoundDispatcher) {
  _inherits(SoundDispatcher, _BaseSoundDispatcher);

  function SoundDispatcher() {
    _classCallCheck(this, SoundDispatcher);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(SoundDispatcher.prototype), "constructor", this).apply(this, args);

    this.outlet = this.audioContext.createDynamicsCompressor();
    this.outlet.ratio.value = 9;
    this.outlet.threshold.value = -2;

    var nomOfLocation = 24;

    this.panners = new Array(nomOfLocation);

    for (var i = 0; i < nomOfLocation; i++) {
      var distance = Math.random();
      var x = Math.sin(i / nomOfLocation * 2 * Math.PI) * distance;
      var z = Math.cos(i / nomOfLocation * 2 * Math.PI) * distance;
      var y = x * x * z * z;

      this.panners[i] = this.audioContext.createPanner();
      this.panners[i].setPosition(x, y, z);
      this.panners[i].connect(this.outlet);
    }
  }

  _createClass(SoundDispatcher, [{
    key: "push",
    value: function push(instance) {
      instance.connect(_utils2["default"].sample(this.panners));
    }
  }]);

  return SoundDispatcher;
})(_SoundDispatcher2["default"]);

exports["default"] = SoundDispatcher;
module.exports = exports["default"];

},{"../SoundDispatcher":38,"./utils":89}],75:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoRemoteFluxx = require("@mohayonao/remote-fluxx");

var _mohayonaoRemoteFluxx2 = _interopRequireDefault(_mohayonaoRemoteFluxx);

var LaunchControlAction = (function (_fluxx$Action) {
  _inherits(LaunchControlAction, _fluxx$Action);

  function LaunchControlAction() {
    _classCallCheck(this, LaunchControlAction);

    _get(Object.getPrototypeOf(LaunchControlAction.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(LaunchControlAction, [{
    key: "/launch-control",
    value: function launchControl(data) {
      this.doneAction("/launch-control/" + data.dataType, data);
    }
  }, {
    key: "/launch-control/knob/active",
    value: function launchControlKnobActive(data) {
      this.doneAction("/launch-control/knob/active", data);
    }
  }, {
    key: "/launch-control/knob/update",
    value: function launchControlKnobUpdate(data) {
      this.doneAction("/launch-control/knob/update", data);
    }
  }, {
    key: "/launch-control/knob/deactive",
    value: function launchControlKnobDeactive(data) {
      this.doneAction("/launch-control/knob/deactive", data);
    }
  }, {
    key: "/launch-control/params/update",
    value: function launchControlParamsUpdate(data) {
      this.doneAction("/launch-control/params/update", data);
    }
  }]);

  return LaunchControlAction;
})(_mohayonaoRemoteFluxx2["default"].Action);

exports["default"] = LaunchControlAction;
module.exports = exports["default"];

},{"@mohayonao/remote-fluxx":27}],76:[function(require,module,exports){
(function (global){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoRemoteFluxx = require("@mohayonao/remote-fluxx");

var _mohayonaoRemoteFluxx2 = _interopRequireDefault(_mohayonaoRemoteFluxx);

var _mohayonaoMidiKeyboardWebmidi = require("@mohayonao/midi-keyboard/webmidi");

var _mohayonaoMidiKeyboardWebmidi2 = _interopRequireDefault(_mohayonaoMidiKeyboardWebmidi);

var _mohayonaoLaunchControlWebmidi = require("@mohayonao/launch-control/webmidi");

var _mohayonaoLaunchControlWebmidi2 = _interopRequireDefault(_mohayonaoLaunchControlWebmidi);

var devices = {};

var MIDIDeviceAction = (function (_fluxx$Action) {
  _inherits(MIDIDeviceAction, _fluxx$Action);

  function MIDIDeviceAction() {
    _classCallCheck(this, MIDIDeviceAction);

    _get(Object.getPrototypeOf(MIDIDeviceAction.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(MIDIDeviceAction, [{
    key: "/midi-device/request",
    value: function midiDeviceRequest() {
      var _this = this;

      _mohayonaoMidiKeyboardWebmidi2["default"].requestDeviceNames().then(function (_ref) {
        var inputs = _ref.inputs;
        var outputs = _ref.outputs;

        _this.doneAction("/midi-device/request/inputs", { inputs: inputs });
        _this.doneAction("/midi-device/request/outputs", { outputs: outputs });
      });
    }
  }, {
    key: "/midi-device/select",
    value: function midiDeviceSelect(_ref2) {
      var target = _ref2.target;
      var deviceName = _ref2.deviceName;

      this.doneAction("/midi-device/select/" + target, { deviceName: deviceName });
    }
  }, {
    key: "/midi-device/connect",
    value: function midiDeviceConnect(_ref3) {
      var _this2 = this;

      var target = _ref3.target;
      var deviceName = _ref3.deviceName;

      var MIDIDevice = ({
        "launch-control": _mohayonaoLaunchControlWebmidi2["default"],
        "midi-keyboard": _mohayonaoMidiKeyboardWebmidi2["default"]
      })[target];

      if (!MIDIDevice) {
        return;
      }

      var promise = devices[target] ? devices[target].close() : Promise.resolve();

      promise.then(function () {
        devices[target] = null;

        var device = new MIDIDevice(deviceName);

        device.open().then(function () {
          devices[target] = device;

          _this2.doneAction("/midi-device/connect/" + target, {
            deviceName: device.deviceName
          });

          device.on("message", function (data) {
            _this2.router.createAction("/" + target, data);
          });
        })["catch"](function (e) {
          global.console.error(e);
        });
      });
    }
  }]);

  return MIDIDeviceAction;
})(_mohayonaoRemoteFluxx2["default"].Action);

exports["default"] = MIDIDeviceAction;
module.exports = exports["default"];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"@mohayonao/launch-control/webmidi":14,"@mohayonao/midi-keyboard/webmidi":21,"@mohayonao/remote-fluxx":27}],77:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoRemoteFluxx = require("@mohayonao/remote-fluxx");

var _mohayonaoRemoteFluxx2 = _interopRequireDefault(_mohayonaoRemoteFluxx);

var MIDIKeyboardAction = (function (_fluxx$Action) {
  _inherits(MIDIKeyboardAction, _fluxx$Action);

  function MIDIKeyboardAction() {
    _classCallCheck(this, MIDIKeyboardAction);

    _get(Object.getPrototypeOf(MIDIKeyboardAction.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(MIDIKeyboardAction, [{
    key: "/midi-keyboard",
    value: function midiKeyboard(data) {
      this.doneAction("/midi-keyboard/" + data.dataType, data);
    }
  }, {
    key: "/midi-keyboard/preset",
    value: function midiKeyboardPreset(data) {
      this.doneAction("/midi-keyboard/preset", data);
    }
  }, {
    key: "/midi-keyboard/octave-shift",
    value: function midiKeyboardOctaveShift(data) {
      this.doneAction("/midi-keyboard/octave-shift", data);
    }
  }, {
    key: "/midi-keyboard/noteOn",
    value: function midiKeyboardNoteOn(data) {
      this.doneAction("/midi-keyboard/noteOn", data);
    }
  }, {
    key: "/midi-keyboard/noteOff",
    value: function midiKeyboardNoteOff(data) {
      this.doneAction("/midi-keyboard/noteOff", data);
    }
  }]);

  return MIDIKeyboardAction;
})(_mohayonaoRemoteFluxx2["default"].Action);

exports["default"] = MIDIKeyboardAction;
module.exports = exports["default"];

},{"@mohayonao/remote-fluxx":27}],78:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoRemoteFluxx = require("@mohayonao/remote-fluxx");

var _mohayonaoRemoteFluxx2 = _interopRequireDefault(_mohayonaoRemoteFluxx);

var SoundAction = (function (_fluxx$Action) {
  _inherits(SoundAction, _fluxx$Action);

  function SoundAction() {
    _classCallCheck(this, SoundAction);

    _get(Object.getPrototypeOf(SoundAction.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(SoundAction, [{
    key: "/sound/load/score",
    value: function soundLoadScore(_ref) {
      var _this = this;

      var name = _ref.name;

      fetch("/assets/" + name + ".json").then(function (res) {
        return res.json();
      }).then(function (data) {
        _this.doneAction("/sound/load/score", { data: data });
      });
    }
  }, {
    key: "/toggle-button/click/sound",
    value: function toggleButtonClickSound() {
      this.doneAction("/toggle-button/click/sound");
    }
  }, {
    key: "/toggle-button/click/sequencer",
    value: function toggleButtonClickSequencer() {
      this.doneAction("/toggle-button/click/sequencer");
    }
  }]);

  return SoundAction;
})(_mohayonaoRemoteFluxx2["default"].Action);

exports["default"] = SoundAction;
module.exports = exports["default"];

},{"@mohayonao/remote-fluxx":27}],79:[function(require,module,exports){
(function (global){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoRemoteFluxx = require("@mohayonao/remote-fluxx");

var _mohayonaoRemoteFluxx2 = _interopRequireDefault(_mohayonaoRemoteFluxx);

var _config = require("../config");

var _config2 = _interopRequireDefault(_config);

var STORAGE_KEY = "@mohayonao/web-music-hackathon-04";

var StorageAction = (function (_fluxx$Action) {
  _inherits(StorageAction, _fluxx$Action);

  function StorageAction() {
    _classCallCheck(this, StorageAction);

    _get(Object.getPrototypeOf(StorageAction.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(StorageAction, [{
    key: "/storage/get",
    value: function storageGet() {
      var item = global.localStorage.getItem(STORAGE_KEY);
      var cache = undefined;

      if (!item) {
        cache = {
          song: _config2["default"].DEFAULT_SONG,
          launchControlDeviceName: "",
          launchControlParams: _config2["default"].DEFAULT_PARAMS,
          midiKeyboardDeviceName: "",
          midiKeyboardPresetName: ""
        };
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
      } else {
        cache = JSON.parse(item);
      }

      this.router.createAction("/sound/load/score", { name: cache.song });
      this.router.createAction("/midi-keyboard/preset", {
        presetName: cache.midiKeyboardPresetName
      });
      this.doneAction("/storage/get", cache);
    }
  }, {
    key: "/storage/set",
    value: function storageSet(data) {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }]);

  return StorageAction;
})(_mohayonaoRemoteFluxx2["default"].Action);

exports["default"] = StorageAction;
module.exports = exports["default"];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../config":82,"@mohayonao/remote-fluxx":27}],80:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _LaunchControlAction = require("./LaunchControlAction");

var _LaunchControlAction2 = _interopRequireDefault(_LaunchControlAction);

var _MIDIDeviceAction = require("./MIDIDeviceAction");

var _MIDIDeviceAction2 = _interopRequireDefault(_MIDIDeviceAction);

var _MIDIKeyboardAction = require("./MIDIKeyboardAction");

var _MIDIKeyboardAction2 = _interopRequireDefault(_MIDIKeyboardAction);

var _SoundAction = require("./SoundAction");

var _SoundAction2 = _interopRequireDefault(_SoundAction);

var _StorageAction = require("./StorageAction");

var _StorageAction2 = _interopRequireDefault(_StorageAction);

exports["default"] = {
  LaunchControlAction: _LaunchControlAction2["default"],
  MIDIDeviceAction: _MIDIDeviceAction2["default"],
  MIDIKeyboardAction: _MIDIKeyboardAction2["default"],
  SoundAction: _SoundAction2["default"],
  StorageAction: _StorageAction2["default"]
};
module.exports = exports["default"];

},{"./LaunchControlAction":75,"./MIDIDeviceAction":76,"./MIDIKeyboardAction":77,"./SoundAction":78,"./StorageAction":79}],81:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _componentsToggleButton = require("../../components/ToggleButton");

var _componentsToggleButton2 = _interopRequireDefault(_componentsToggleButton);

var _componentsSongSelector = require("../../components/SongSelector");

var _componentsSongSelector2 = _interopRequireDefault(_componentsSongSelector);

var _componentsLaunchControl = require("../../components/LaunchControl");

var _componentsLaunchControl2 = _interopRequireDefault(_componentsLaunchControl);

var _componentsMIDIKeyboard = require("../../components/MIDIKeyboard");

var _componentsMIDIKeyboard2 = _interopRequireDefault(_componentsMIDIKeyboard);

var _componentsStyles = require("../../components/styles");

var _componentsStyles2 = _interopRequireDefault(_componentsStyles);

var StandaloneApp = (function (_React$Component) {
  _inherits(StandaloneApp, _React$Component);

  function StandaloneApp() {
    _classCallCheck(this, StandaloneApp);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(StandaloneApp.prototype), "constructor", this).apply(this, args);

    this.state = this.getStateFromStores();

    this.$onChange = this.$onChange.bind(this);
  }

  _createClass(StandaloneApp, [{
    key: "getStateFromStores",
    value: function getStateFromStores() {
      var router = this.props.router;

      return router.getStateFromStores();
    }
  }, {
    key: "componentWillMount",
    value: function componentWillMount() {
      var router = this.props.router;

      router.addChangeListener(this.$onChange);
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      var router = this.props.router;

      router.removeChangeListener(this.$onChange);
    }
  }, {
    key: "render",
    value: function render() {
      var router = this.props.router;

      var styles = this.state.sequencer.enabled ? _componentsStyles2["default"].SEQUENCER_ON : _componentsStyles2["default"].SEQUENCER_OFF;
      var soundButtonData = {
        value: this.state.sound.enabled,
        trueValue: "SOUND ON",
        falseValue: "SOUND OFF"
      };
      var sequencerButtonData = {
        value: this.state.sequencer.enabled,
        trueValue: "SEQUENCER ON",
        falseValue: "SEQUENCER OFF"
      };

      return React.createElement(
        "div",
        null,
        React.createElement(
          "h1",
          { style: styles },
          "WEB MUSIC HACKATHON 04"
        ),
        React.createElement(
          "div",
          null,
          React.createElement(_componentsToggleButton2["default"], { router: router, data: soundButtonData, action: "sound" }),
          React.createElement(_componentsToggleButton2["default"], { router: router, data: sequencerButtonData, action: "sequencer" })
        ),
        React.createElement("hr", null),
        React.createElement(
          "div",
          { className: "form" },
          React.createElement(
            "div",
            { className: "form-group" },
            React.createElement(
              "label",
              null,
              "SONG"
            ),
            React.createElement(_componentsSongSelector2["default"], { router: router, data: this.state.sequencer })
          ),
          React.createElement(
            "div",
            { className: "form-group" },
            React.createElement(
              "label",
              null,
              "MIDI Controller / LAUNCH CONRTOL"
            ),
            React.createElement(_componentsLaunchControl2["default"], { router: router, data: this.state.launchControl })
          ),
          React.createElement(
            "div",
            { className: "form-group" },
            React.createElement(
              "label",
              null,
              "MIDI Keyboard"
            ),
            React.createElement(_componentsMIDIKeyboard2["default"], { router: router, data: this.state.midiKeyboard })
          )
        )
      );
    }
  }, {
    key: "$onChange",
    value: function $onChange() {
      this.setState(this.getStateFromStores());
    }
  }]);

  return StandaloneApp;
})(React.Component);

exports["default"] = StandaloneApp;
module.exports = exports["default"];

},{"../../components/LaunchControl":40,"../../components/MIDIKeyboard":45,"../../components/SongSelector":51,"../../components/ToggleButton":52,"../../components/styles":53}],82:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var _config = require("../config");

var _config2 = _interopRequireDefault(_config);

exports["default"] = _utils2["default"].xtend(_config2["default"], {
  SEQUENCE_OFFSET_TIME: 0,
  SEQUENCER_INTERVAL: 0.1
});
module.exports = exports["default"];

},{"../config":54,"./utils":89}],83:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _componentsStandaloneApp = require("./components/StandaloneApp");

var _componentsStandaloneApp2 = _interopRequireDefault(_componentsStandaloneApp);

var _Router = require("./Router");

var _Router2 = _interopRequireDefault(_Router);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

function run() {
  var router = new _Router2["default"]();

  _utils2["default"].chore();

  router.createAction("/midi-device/request");
  router.createAction("/storage/get");

  React.render(React.createElement(_componentsStandaloneApp2["default"], { router: router }), document.getElementById("app"));

  return router;
}

exports["default"] = { run: run };
module.exports = exports["default"];

},{"./Router":73,"./components/StandaloneApp":81,"./utils":89}],84:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoRemoteFluxx = require("@mohayonao/remote-fluxx");

var _mohayonaoRemoteFluxx2 = _interopRequireDefault(_mohayonaoRemoteFluxx);

var _sound = require("../../../sound");

var _sound2 = _interopRequireDefault(_sound);

var _utils = require("../utils");

var _utils2 = _interopRequireDefault(_utils);

var _config = require("../config");

var _config2 = _interopRequireDefault(_config);

var LaunchControlStore = (function (_fluxx$Store) {
  _inherits(LaunchControlStore, _fluxx$Store);

  function LaunchControlStore() {
    _classCallCheck(this, LaunchControlStore);

    _get(Object.getPrototypeOf(LaunchControlStore.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(LaunchControlStore, [{
    key: "getInitialState",
    value: function getInitialState() {
      return {
        deviceName: "",
        connectedDeviceName: "",
        controllers: [],
        params: new Uint8Array(_config2["default"].DEFAULT_PARAMS),
        enabledParams: new Uint8Array(16),
        activeKnob: -1
      };
    }
  }, {
    key: "/storage/get",
    value: function storageGet(_ref) {
      var launchControlDeviceName = _ref.launchControlDeviceName;
      var launchControlParams = _ref.launchControlParams;

      this.data.deviceName = launchControlDeviceName;
      this.data.params = new Uint8Array(launchControlParams);
      this.emitChange(0);
    }
  }, {
    key: "/launch-control/pad",
    value: function launchControlPad(_ref2) {
      var track = _ref2.track;

      track = _utils2["default"].constrain(track, 0, 7) | 0;

      this.data.params[track + 16] = 1 - this.data.params[track + 16];
      this.emitChange();
    }
  }, {
    key: "/launch-control/knob1",
    value: function launchControlKnob1(_ref3) {
      var track = _ref3.track;
      var value = _ref3.value;

      track = _utils2["default"].constrain(track, 0, 7) | 0;
      value = _utils2["default"].constrain(value, 0, 127) | 0;

      this.changeParam(track, value);
    }
  }, {
    key: "/launch-control/knob2",
    value: function launchControlKnob2(_ref4) {
      var track = _ref4.track;
      var value = _ref4.value;

      track = _utils2["default"].constrain(track, 0, 7) | 0;
      value = _utils2["default"].constrain(value, 0, 127) | 0;

      this.changeParam(track + 8, value);
    }
  }, {
    key: "/launch-control/knob/active",
    value: function launchControlKnobActive(_ref5) {
      var track = _ref5.track;
      var index = _ref5.index;

      this.data.activeKnob = track + index * 8;
      this.emitChange();
    }
  }, {
    key: "/launch-control/knob/update",
    value: function launchControlKnobUpdate(_ref6) {
      var delta = _ref6.delta;

      if (this.data.activeKnob === -1) {
        return;
      }

      var oldValue = this.data.params[this.data.activeKnob];
      var newValue = _utils2["default"].constrain(oldValue - delta, 0, 127) | 0;

      this.changeParam(this.data.activeKnob, newValue);
    }
  }, {
    key: "/launch-control/knob/deactive",
    value: function launchControlKnobDeactive() {
      if (this.data.activeKnob !== -1) {
        this.data.activeKnob = -1;
        this.emitChange();
      }
    }
  }, {
    key: "/midi-keyboard/preset",
    value: function midiKeyboardPreset(_ref7) {
      var presetName = _ref7.presetName;

      var presets = _sound2["default"].instruments.presets;

      if (presets.hasOwnProperty(presetName)) {
        this.data.enabledParams = presets[presetName].getEnabledParams();
        this.emitChange();
      }
    }
  }, {
    key: "/midi-device/request/inputs",
    value: function midiDeviceRequestInputs(_ref8) {
      var inputs = _ref8.inputs;

      this.data.controllers = inputs;
      this.emitChange();
    }
  }, {
    key: "/midi-device/select/launch-control",
    value: function midiDeviceSelectLaunchControl(_ref9) {
      var deviceName = _ref9.deviceName;

      this.data.deviceName = deviceName;
      this.emitChange();
    }
  }, {
    key: "/midi-device/connect/launch-control",
    value: function midiDeviceConnectLaunchControl(_ref10) {
      var deviceName = _ref10.deviceName;

      this.data.connectedDeviceName = deviceName;
      this.emitChange();
    }
  }, {
    key: "changeParam",
    value: function changeParam(index, value) {
      if (this.data.params[index] === value) {
        return;
      }

      this.data.params[index] = value;

      this.emitChange();

      this.router.createAction("/launch-control/params/update", {
        params: this.data.params
      });
    }
  }]);

  return LaunchControlStore;
})(_mohayonaoRemoteFluxx2["default"].Store);

exports["default"] = LaunchControlStore;
module.exports = exports["default"];

},{"../../../sound":106,"../config":82,"../utils":89,"@mohayonao/remote-fluxx":27}],85:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoRemoteFluxx = require("@mohayonao/remote-fluxx");

var _mohayonaoRemoteFluxx2 = _interopRequireDefault(_mohayonaoRemoteFluxx);

var _sound = require("../../../sound");

var _sound2 = _interopRequireDefault(_sound);

var _utils = require("../utils");

var _utils2 = _interopRequireDefault(_utils);

var MIDIKeyboardStore = (function (_fluxx$Store) {
  _inherits(MIDIKeyboardStore, _fluxx$Store);

  function MIDIKeyboardStore() {
    _classCallCheck(this, MIDIKeyboardStore);

    _get(Object.getPrototypeOf(MIDIKeyboardStore.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(MIDIKeyboardStore, [{
    key: "getInitialState",
    value: function getInitialState() {
      return {
        deviceName: "",
        connectedDeviceName: "",
        controllers: [],
        presets: Object.keys(_sound2["default"].instruments.presets),
        presetName: "",
        noteOn: new Uint8Array(128),
        octave: 5
      };
    }
  }, {
    key: "/storage/get",
    value: function storageGet(_ref) {
      var midiKeyboardDeviceName = _ref.midiKeyboardDeviceName;
      var midiKeyboardPresetName = _ref.midiKeyboardPresetName;

      this.data.deviceName = midiKeyboardDeviceName;
      this.data.presetName = midiKeyboardPresetName;
      this.emitChange();
    }
  }, {
    key: "/midi-keyboard/preset",
    value: function midiKeyboardPreset(_ref2) {
      var presetName = _ref2.presetName;

      this.data.presetName = presetName;
      this.emitChange();
    }
  }, {
    key: "/midi-keyboard/octave-shift",
    value: function midiKeyboardOctaveShift(data) {
      var octave = this.data.octave + data.value;

      octave = _utils2["default"].constrain(octave, 0, 9) | 0;

      if (this.data.octave !== octave) {
        this.data.octave = octave;
        this.emitChange();
      }
    }
  }, {
    key: "/midi-keyboard/noteOn",
    value: function midiKeyboardNoteOn(data) {
      this.data.noteOn[data.noteNumber] = 1;
      this.emitChange();
    }
  }, {
    key: "/midi-keyboard/noteOff",
    value: function midiKeyboardNoteOff(data) {
      this.data.noteOn[data.noteNumber] = 0;
      this.emitChange();
    }
  }, {
    key: "/midi-device/request/inputs",
    value: function midiDeviceRequestInputs(_ref3) {
      var inputs = _ref3.inputs;

      this.data.controllers = inputs;
      this.emitChange();
    }
  }, {
    key: "/midi-device/select/midi-keyboard",
    value: function midiDeviceSelectMidiKeyboard(_ref4) {
      var deviceName = _ref4.deviceName;

      this.data.deviceName = deviceName;
      this.emitChange();
    }
  }, {
    key: "/midi-device/connect/midi-keyboard",
    value: function midiDeviceConnectMidiKeyboard(_ref5) {
      var deviceName = _ref5.deviceName;

      this.data.connectedDeviceName = deviceName;
      this.emitChange();
    }
  }, {
    key: "name",
    get: function get() {
      return "midiKeyboard";
    }
  }]);

  return MIDIKeyboardStore;
})(_mohayonaoRemoteFluxx2["default"].Store);

exports["default"] = MIDIKeyboardStore;
module.exports = exports["default"];

},{"../../../sound":106,"../utils":89,"@mohayonao/remote-fluxx":27}],86:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoRemoteFluxx = require("@mohayonao/remote-fluxx");

var _mohayonaoRemoteFluxx2 = _interopRequireDefault(_mohayonaoRemoteFluxx);

var _utils = require("../utils");

var _config = require("../config");

var _config2 = _interopRequireDefault(_config);

var SequencerStore = (function (_fluxx$Store) {
  _inherits(SequencerStore, _fluxx$Store);

  function SequencerStore() {
    var _this = this;

    _classCallCheck(this, SequencerStore);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(SequencerStore.prototype), "constructor", this).apply(this, args);

    this.audioContext = this.router.audioContext;
    this.timeline = this.router.timeline;
    this.sequencer = new _utils.Sequencer(this.timeline, {
      interval: _config2["default"].SEQUENCER_INTERVAL
    });

    this.sequencer.on("play", function (events) {
      events.forEach(function (data) {
        _this.router.play(data);
      });
    });
  }

  _createClass(SequencerStore, [{
    key: "getInitialState",
    value: function getInitialState() {
      return {
        song: _config2["default"].DEFAULT_SONG,
        songs: _config2["default"].SONGS,
        tempo: 60,
        ticksPerBeat: 480,
        enabled: false
      };
    }
  }, {
    key: "/sound/load/score",
    value: function soundLoadScore(_ref) {
      var data = _ref.data;

      this.sequencer.ticksPerBeat = data.ticksPerBeat;
      this.sequencer.tempo = data.tempo;
      this.sequencer.events = data.events;
      this.sequencer.reset();
      this.data.song = data.name;
      this.data.tempo = data.tempo;
      this.data.ticksPerBeat = data.ticksPerBeat;
      this.emitChange();
    }
  }, {
    key: "/toggle-button/click/sequencer",
    value: function toggleButtonClickSequencer() {
      if (this.sequencer.state === "suspended") {
        this.sequencer.start();
      } else {
        this.sequencer.stop();
      }
      this.data.enabled = this.sequencer.state === "running";
      this.emitChange();
    }
  }]);

  return SequencerStore;
})(_mohayonaoRemoteFluxx2["default"].Store);

exports["default"] = SequencerStore;
module.exports = exports["default"];

},{"../config":82,"../utils":89,"@mohayonao/remote-fluxx":27}],87:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoRemoteFluxx = require("@mohayonao/remote-fluxx");

var _mohayonaoRemoteFluxx2 = _interopRequireDefault(_mohayonaoRemoteFluxx);

var SoundStore = (function (_fluxx$Store) {
  _inherits(SoundStore, _fluxx$Store);

  function SoundStore() {
    _classCallCheck(this, SoundStore);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(SoundStore.prototype), "constructor", this).apply(this, args);

    this.soundManager = this.router.soundManager;

    this._presetName = "Routing";
  }

  _createClass(SoundStore, [{
    key: "getInitialState",
    value: function getInitialState() {
      return {
        enabled: false
      };
    }
  }, {
    key: "/toggle-button/click/sound",
    value: function toggleButtonClickSound() {
      if (this.soundManager.state === "suspended") {
        this.soundManager.start();
      } else {
        this.soundManager.stop();
      }
      this.data.enabled = this.soundManager.state === "running";
      this.emitChange();
    }
  }, {
    key: "/midi-keyboard/preset",
    value: function midiKeyboardPreset(_ref) {
      var presetName = _ref.presetName;

      this._presetName = presetName;
    }
  }, {
    key: "/midi-keyboard/noteOn",
    value: function midiKeyboardNoteOn(data) {
      this.router.play({
        dataType: "noteOn",
        playbackTime: 0,
        track: 0,
        noteNumber: data.noteNumber,
        velocity: data.velocity,
        program: this._presetName
      });
    }
  }, {
    key: "/midi-keyboard/noteOff",
    value: function midiKeyboardNoteOff(data) {
      this.router.play({
        dataType: "noteOff",
        playbackTime: 0,
        track: 0,
        noteNumber: data.noteNumber,
        velocity: 0,
        program: this._presetName
      });
    }
  }]);

  return SoundStore;
})(_mohayonaoRemoteFluxx2["default"].Store);

exports["default"] = SoundStore;
module.exports = exports["default"];

},{"@mohayonao/remote-fluxx":27}],88:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _LaunchControlStore = require("./LaunchControlStore");

var _LaunchControlStore2 = _interopRequireDefault(_LaunchControlStore);

var _MIDIKeyboardStore = require("./MIDIKeyboardStore");

var _MIDIKeyboardStore2 = _interopRequireDefault(_MIDIKeyboardStore);

var _SequencerStore = require("./SequencerStore");

var _SequencerStore2 = _interopRequireDefault(_SequencerStore);

var _SoundStore = require("./SoundStore");

var _SoundStore2 = _interopRequireDefault(_SoundStore);

exports["default"] = {
  LaunchControlStore: _LaunchControlStore2["default"],
  MIDIKeyboardStore: _MIDIKeyboardStore2["default"],
  SequencerStore: _SequencerStore2["default"],
  SoundStore: _SoundStore2["default"]
};
module.exports = exports["default"];

},{"./LaunchControlStore":84,"./MIDIKeyboardStore":85,"./SequencerStore":86,"./SoundStore":87}],89:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _utils = require("../utils");

var _utils2 = _interopRequireDefault(_utils);

exports["default"] = _utils2["default"].xtend(_utils2["default"], {});
module.exports = exports["default"];

},{"../utils":90}],90:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _utils = require("../utils");

var _utils2 = _interopRequireDefault(_utils);

var _utilsWebAudioUtils = require("../utils/WebAudioUtils");

var _utilsWebAudioUtils2 = _interopRequireDefault(_utilsWebAudioUtils);

function getPerformanceLevel() {
  var canvas = document.createElement("canvas");

  if (!canvas) {
    return 0;
  }

  var gl = canvas.getContext("webgl");

  if (!gl) {
    return 0;
  }

  var GPU_VERSION = gl.getParameter(gl.VERSION);
  var USER_AGENT = navigator.userAgent;

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

exports["default"] = _utils2["default"].xtend(_utils2["default"], _utilsWebAudioUtils2["default"], {
  getPerformanceLevel: _utils2["default"].once(getPerformanceLevel)
});
module.exports = exports["default"];

},{"../utils":146,"../utils/WebAudioUtils":145}],91:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

require("./shim");

var _main = require("./main");

var _main2 = _interopRequireDefault(_main);

var _standalone = require("./standalone");

var _standalone2 = _interopRequireDefault(_standalone);

exports["default"] = { main: _main2["default"], standalone: _standalone2["default"] };
module.exports = exports["default"];

},{"./main":65,"./shim":72,"./standalone":83}],92:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = {
  SONGS: ["prelude", "menuet", "clair-de-lune", "passepied"],
  DEFAULT_SONG: "clair-de-lune",
  DEFAULT_PARAMS: [0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]
};
module.exports = exports["default"];

},{}],93:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoEventEmitter = require("@mohayonao/event-emitter");

var _mohayonaoEventEmitter2 = _interopRequireDefault(_mohayonaoEventEmitter);

var _utils = require("../utils");

var _utils2 = _interopRequireDefault(_utils);

var INITIALIZE = _utils2["default"].symbol("INITIALIZE");
exports.INITIALIZE = INITIALIZE;
var CREATE = _utils2["default"].symbol("CREATE");
exports.CREATE = CREATE;
var NOTE_ON = _utils2["default"].symbol("NOTE_ON");
exports.NOTE_ON = NOTE_ON;
var NOTE_OFF = _utils2["default"].symbol("NOTE_OFF");
exports.NOTE_OFF = NOTE_OFF;
var DISPOSE = _utils2["default"].symbol("DISPOSE");

exports.DISPOSE = DISPOSE;

var Instrument = (function (_EventEmitter) {
  _inherits(Instrument, _EventEmitter);

  function Instrument(_ref) {
    var audioContext = _ref.audioContext;
    var timeline = _ref.timeline;
    var params = _ref.params;
    var noteNumber = _ref.noteNumber;
    var velocity = _ref.velocity;
    var gain = _ref.gain;
    var duration = _ref.duration;

    _classCallCheck(this, Instrument);

    _get(Object.getPrototypeOf(Instrument.prototype), "constructor", this).call(this);

    this.audioContext = audioContext;
    this.timeline = timeline;
    this.noteNumber = _utils2["default"].defaults(noteNumber, 69);
    this.velocity = _utils2["default"].defaults(velocity, 100);
    this.gain = _utils2["default"].defaults(gain, 1);
    this.duration = _utils2["default"].defaults(duration, Infinity);
    this.volume = _utils2["default"].linexp(this.velocity, 0, 127, 0.25, 1) * this.gain;
    this.outlet = null;
    this.inlet = null;
    this.state = "uninitialized";
    this.params = new Uint8Array(params);
  }

  _createClass(Instrument, [{
    key: "connect",
    value: function connect(destination) {
      if (this.outlet) {
        this.outlet.connect(destination);
      }
    }
  }, {
    key: "disconnect",
    value: function disconnect() {
      if (this.outlet) {
        this.outlet.disconnect();
      }
    }
  }, {
    key: "initialize",
    value: function initialize() {
      var _this = this;

      if (this.state !== "uninitialized") {
        return;
      }

      var sharedParams = this.constructor.sharedParams;

      if (!sharedParams) {
        sharedParams = this.constructor.sharedParams = {};
        this[INITIALIZE].call(sharedParams, this.audioContext);
      }

      Object.keys(sharedParams).forEach(function (key) {
        _this[key] = sharedParams[key];
      });

      this.state = "initialized";
    }
  }, {
    key: INITIALIZE,
    value: function value() {}
  }, {
    key: "create",
    value: function create() {
      if (this.state !== "initialized") {
        return;
      }
      this.state = "created";
      this[CREATE]();
    }
  }, {
    key: CREATE,
    value: function value() {}
  }, {
    key: "setParams",
    value: function setParams(params) {
      for (var i = 0, imax = params.length; i < imax; i++) {
        if (params[i] !== this.params[i]) {
          var prevValue = this.params[i];

          this.params[i] = params[i];

          if (typeof this["/param:" + i] === "function") {
            this["/param:" + i](params[i], prevValue);
          }
        }
      }
    }
  }, {
    key: "noteOn",
    value: function noteOn() {
      var t0 = arguments.length <= 0 || arguments[0] === undefined ? this.audioContext.currentTime : arguments[0];

      if (this.state !== "created") {
        return;
      }
      this.state = "noteOn";
      this[NOTE_ON](t0);
    }
  }, {
    key: NOTE_ON,
    value: function value() {}
  }, {
    key: "noteOff",
    value: function noteOff() {
      var t0 = arguments.length <= 0 || arguments[0] === undefined ? this.audioContext.currentTime : arguments[0];

      if (this.state !== "noteOn") {
        return;
      }
      this.state = "noteOff";
      this[NOTE_OFF](t0);
    }
  }, {
    key: NOTE_OFF,
    value: function value() {}
  }, {
    key: "dispose",
    value: function dispose() {
      if (this.state !== "noteOff") {
        return;
      }
      this.state = "disposed";
      this[DISPOSE]();
      this.emit("disposed");
      this.inlet = this.outlet = null;
    }
  }, {
    key: DISPOSE,
    value: function value() {}
  }], [{
    key: "getEnabledParams",
    value: function getEnabledParams() {
      return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
  }]);

  return Instrument;
})(_mohayonaoEventEmitter2["default"]);

exports["default"] = Instrument;

},{"../utils":146,"@mohayonao/event-emitter":2}],94:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MIDIEffect = (function () {
  function MIDIEffect(timeline) {
    _classCallCheck(this, MIDIEffect);

    this.timeline = timeline;
    this._pipe = [];
  }

  _createClass(MIDIEffect, [{
    key: "push",
    value: function push(data) {
      var _this = this;

      this.process(data, function (data) {
        _this._pipe.forEach(function (next) {
          next.push(data);
        });
      });
    }
  }, {
    key: "pipe",
    value: function pipe(next) {
      var _this2 = this;

      var has = this._pipe.some(function (pipe) {
        return pipe === next || pipe.$callback === next;
      });

      if (has) {
        return next;
      }

      if (typeof next === "function") {
        (function () {
          var callback = next;

          next = new MIDIEffect(_this2.timeline);
          next.process = function (data, next) {
            callback(data, next);
          };
          next.$callback = callback;
        })();
      }

      this._pipe.push(next);

      return next;
    }
  }, {
    key: "unpipe",
    value: function unpipe(next) {
      for (var i = 0; i < this._pipe.length; i++) {
        if (this._pipe[i] === next || this._pipe[i].$callback === next) {
          this._pipe.splice(i, 1);
          break;
        }
      }
      return next;
    }
  }, {
    key: "process",
    value: function process(data, next) {
      next(data);
    }
  }]);

  return MIDIEffect;
})();

exports["default"] = MIDIEffect;
module.exports = exports["default"];

},{}],95:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x5, _x6, _x7) { var _again = true; _function: while (_again) { var object = _x5, property = _x6, receiver = _x7; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x5 = parent; _x6 = property; _x7 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoEventEmitter = require("@mohayonao/event-emitter");

var _mohayonaoEventEmitter2 = _interopRequireDefault(_mohayonaoEventEmitter);

var _MIDIEffect = require("./MIDIEffect");

var _MIDIEffect2 = _interopRequireDefault(_MIDIEffect);

var _effectsMIDIDelay = require("./effects/MIDIDelay");

var _effectsMIDIDelay2 = _interopRequireDefault(_effectsMIDIDelay);

var _effectsMIDIDuplicate = require("./effects/MIDIDuplicate");

var _effectsMIDIDuplicate2 = _interopRequireDefault(_effectsMIDIDuplicate);

var _effectsMIDIExtend = require("./effects/MIDIExtend");

var _effectsMIDIExtend2 = _interopRequireDefault(_effectsMIDIExtend);

var _effectsMIDIFilter = require("./effects/MIDIFilter");

var _effectsMIDIFilter2 = _interopRequireDefault(_effectsMIDIFilter);

var _effectsMIDIGate = require("./effects/MIDIGate");

var _effectsMIDIGate2 = _interopRequireDefault(_effectsMIDIGate);

var _effectsMIDIMap = require("./effects/MIDIMap");

var _effectsMIDIMap2 = _interopRequireDefault(_effectsMIDIMap);

var _effectsMIDISplit = require("./effects/MIDISplit");

var _effectsMIDISplit2 = _interopRequireDefault(_effectsMIDISplit);

var _effectsMIDIStutter = require("./effects/MIDIStutter");

var _effectsMIDIStutter2 = _interopRequireDefault(_effectsMIDIStutter);

var _effectsMIDITouch = require("./effects/MIDITouch");

var _effectsMIDITouch2 = _interopRequireDefault(_effectsMIDITouch);

var _config = require("../config");

var _config2 = _interopRequireDefault(_config);

var Track = (function (_EventEmitter) {
  _inherits(Track, _EventEmitter);

  function Track(timeline) {
    var _this = this;

    _classCallCheck(this, Track);

    _get(Object.getPrototypeOf(Track.prototype), "constructor", this).call(this);

    this.timeline = timeline;
    this.ticksPerBeat = 480;
    this.tempo = 120;
    this.params = new Uint8Array(_config2["default"].DEFAULT_PARAMS);
    this.output = {
      push: function push(data) {
        _this.emit("play", data);
      }
    };

    this._pipe = [];
  }

  _createClass(Track, [{
    key: "setState",
    value: function setState(_ref) {
      var ticksPerBeat = _ref.ticksPerBeat;
      var tempo = _ref.tempo;
      var params = _ref.params;

      this.ticksPerBeat = ticksPerBeat;
      this.tempo = tempo;
      this.params = params;
    }
  }, {
    key: "push",
    value: function push(data) {
      this._pipe.forEach(function (next) {
        next.push(data);
      });
    }
  }, {
    key: "pipe",
    value: function pipe(next) {
      var _this2 = this;

      var has = this._pipe.some(function (pipe) {
        return pipe === next || pipe.$callback === next;
      });

      if (has) {
        return next;
      }

      if (typeof next === "function") {
        (function () {
          var callback = next;

          next = new _MIDIEffect2["default"](_this2.timeline);
          next.process = function (data, next) {
            callback(data, next);
          };
          next.$callback = callback;
        })();
      }

      this._pipe.push(next);

      return next;
    }
  }, {
    key: "unpipe",
    value: function unpipe(next) {
      for (var i = 0; i < this._pipe.length; i++) {
        if (this._pipe[i] === next || this._pipe[i].$callback === next) {
          this._pipe.splice(i, 1);
          break;
        }
      }
      return next;
    }
  }, {
    key: "delay",
    value: function delay() {
      var interval = arguments.length <= 0 || arguments[0] === undefined ? 1 / 8 : arguments[0];

      return new _effectsMIDIDelay2["default"](this.timeline, interval);
    }
  }, {
    key: "duplicate",
    value: function duplicate() {
      var count = arguments.length <= 0 || arguments[0] === undefined ? 2 : arguments[0];

      return new _effectsMIDIDuplicate2["default"](this.timeline, count);
    }
  }, {
    key: "extend",
    value: function extend() {
      var _extend = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return new _effectsMIDIExtend2["default"](this.timeline, _extend);
    }
  }, {
    key: "filter",
    value: function filter(callback) {
      return new _effectsMIDIFilter2["default"](this.timeline, callback);
    }
  }, {
    key: "gate",
    value: function gate(_gate) {
      return new _effectsMIDIGate2["default"](this.timeline, _gate);
    }
  }, {
    key: "map",
    value: function map(callback) {
      return new _effectsMIDIMap2["default"](this.timeline, callback);
    }
  }, {
    key: "split",
    value: function split(callback) {
      return new _effectsMIDISplit2["default"](this.timeline, callback);
    }
  }, {
    key: "stutter",
    value: function stutter() {
      var interval = arguments.length <= 0 || arguments[0] === undefined ? 1 / 2 : arguments[0];

      return new _effectsMIDIStutter2["default"](this.timeline, interval);
    }
  }, {
    key: "touch",
    value: function touch(callback) {
      return new _effectsMIDITouch2["default"](this.timeline, callback);
    }
  }]);

  return Track;
})(_mohayonaoEventEmitter2["default"]);

exports["default"] = Track;
module.exports = exports["default"];

},{"../config":92,"./MIDIEffect":94,"./effects/MIDIDelay":96,"./effects/MIDIDuplicate":97,"./effects/MIDIExtend":98,"./effects/MIDIFilter":99,"./effects/MIDIGate":100,"./effects/MIDIMap":101,"./effects/MIDISplit":102,"./effects/MIDIStutter":103,"./effects/MIDITouch":104,"@mohayonao/event-emitter":2}],96:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _MIDIEffect2 = require("../MIDIEffect");

var _MIDIEffect3 = _interopRequireDefault(_MIDIEffect2);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var MIDIDelay = (function (_MIDIEffect) {
  _inherits(MIDIDelay, _MIDIEffect);

  function MIDIDelay(timeline, interval) {
    _classCallCheck(this, MIDIDelay);

    _get(Object.getPrototypeOf(MIDIDelay.prototype), "constructor", this).call(this, timeline);

    this.timeline = timeline;
    this.feedback = 0;
    this.ticksPerBeat = 480;
    this.tempo = 120;
    this.interval = interval;
  }

  _createClass(MIDIDelay, [{
    key: "_ticksToSeconds",
    value: function _ticksToSeconds(ticks) {
      return ticks / this.ticksPerBeat * (60 / this.tempo);
    }
  }, {
    key: "process",
    value: function process(data, next) {
      var _this = this;

      data.gain = _utils2["default"].defaults(data.gain, 1);

      next(data);

      var delayTime = this._ticksToSeconds(this.ticksPerBeat * this.interval);

      this.timeline.insert(data.playbackTime + delayTime, function (_ref) {
        var playbackTime = _ref.playbackTime;

        var gain = data.gain * _this.feedback;

        if (0.05 <= gain) {
          _this.process(_utils2["default"].xtend(data, { playbackTime: playbackTime, gain: gain }), next);
        }
      });
    }
  }]);

  return MIDIDelay;
})(_MIDIEffect3["default"]);

exports["default"] = MIDIDelay;
module.exports = exports["default"];

},{"../MIDIEffect":94,"./utils":105}],97:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _MIDIEffect2 = require("../MIDIEffect");

var _MIDIEffect3 = _interopRequireDefault(_MIDIEffect2);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var MIDIDuplicate = (function (_MIDIEffect) {
  _inherits(MIDIDuplicate, _MIDIEffect);

  function MIDIDuplicate(timeline, count) {
    _classCallCheck(this, MIDIDuplicate);

    _get(Object.getPrototypeOf(MIDIDuplicate.prototype), "constructor", this).call(this, timeline);

    this.timeline = timeline;
    this.count = count;
  }

  _createClass(MIDIDuplicate, [{
    key: "process",
    value: function process(data, next) {
      for (var i = 0, imax = this.count; i < imax; i++) {
        next(_utils2["default"].xtend(data));
      }
    }
  }]);

  return MIDIDuplicate;
})(_MIDIEffect3["default"]);

exports["default"] = MIDIDuplicate;
module.exports = exports["default"];

},{"../MIDIEffect":94,"./utils":105}],98:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _MIDIEffect2 = require("../MIDIEffect");

var _MIDIEffect3 = _interopRequireDefault(_MIDIEffect2);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var MIDIExtend = (function (_MIDIEffect) {
  _inherits(MIDIExtend, _MIDIEffect);

  function MIDIExtend(timeline, extend) {
    _classCallCheck(this, MIDIExtend);

    _get(Object.getPrototypeOf(MIDIExtend.prototype), "constructor", this).call(this, timeline);

    this.timeline = timeline;
    this.extend = extend;
  }

  _createClass(MIDIExtend, [{
    key: "process",
    value: function process(data, next) {
      next(_utils2["default"].xtend(data, this.extend));
    }
  }]);

  return MIDIExtend;
})(_MIDIEffect3["default"]);

exports["default"] = MIDIExtend;
module.exports = exports["default"];

},{"../MIDIEffect":94,"./utils":105}],99:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _MIDIEffect2 = require("../MIDIEffect");

// import utils from "./utils";

var _MIDIEffect3 = _interopRequireDefault(_MIDIEffect2);

var MIDIFilter = (function (_MIDIEffect) {
  _inherits(MIDIFilter, _MIDIEffect);

  function MIDIFilter(timeline, callback) {
    _classCallCheck(this, MIDIFilter);

    _get(Object.getPrototypeOf(MIDIFilter.prototype), "constructor", this).call(this, timeline);

    this.timeline = timeline;
    this.callback = callback;
  }

  _createClass(MIDIFilter, [{
    key: "process",
    value: function process(data, next) {
      if (this.callback(data)) {
        next(data);
      }
    }
  }]);

  return MIDIFilter;
})(_MIDIEffect3["default"]);

exports["default"] = MIDIFilter;
module.exports = exports["default"];

},{"../MIDIEffect":94}],100:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _MIDIEffect2 = require("../MIDIEffect");

var _MIDIEffect3 = _interopRequireDefault(_MIDIEffect2);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var MIDIGate = (function (_MIDIEffect) {
  _inherits(MIDIGate, _MIDIEffect);

  function MIDIGate(timeline, gate) {
    _classCallCheck(this, MIDIGate);

    _get(Object.getPrototypeOf(MIDIGate.prototype), "constructor", this).call(this, timeline);

    this.timeline = timeline;
    this.gate = gate;
  }

  _createClass(MIDIGate, [{
    key: "process",
    value: function process(data, next) {
      if (typeof data.ticks !== "number") {
        return next(data);
      }

      var ticks = data.ticks * this.gate;
      var duration = data.duration * this.gate;

      next(_utils2["default"].xtend(data, { ticks: ticks, duration: duration }));
    }
  }]);

  return MIDIGate;
})(_MIDIEffect3["default"]);

exports["default"] = MIDIGate;
module.exports = exports["default"];

},{"../MIDIEffect":94,"./utils":105}],101:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _MIDIEffect2 = require("../MIDIEffect");

// import utils from "./utils";

var _MIDIEffect3 = _interopRequireDefault(_MIDIEffect2);

var MIDIMap = (function (_MIDIEffect) {
  _inherits(MIDIMap, _MIDIEffect);

  function MIDIMap(timeline, callback) {
    _classCallCheck(this, MIDIMap);

    _get(Object.getPrototypeOf(MIDIMap.prototype), "constructor", this).call(this, timeline);

    this.timeline = timeline;
    this.callback = callback;
  }

  _createClass(MIDIMap, [{
    key: "process",
    value: function process(data, next) {
      var result = this.callback(data);

      if (!result || typeof result !== "object") {
        return;
      }

      next(result);
    }
  }]);

  return MIDIMap;
})(_MIDIEffect3["default"]);

exports["default"] = MIDIMap;
module.exports = exports["default"];

},{"../MIDIEffect":94}],102:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _MIDIEffect2 = require("../MIDIEffect");

// import utils from "./utils";

var _MIDIEffect3 = _interopRequireDefault(_MIDIEffect2);

var MIDISplit = (function (_MIDIEffect) {
  _inherits(MIDISplit, _MIDIEffect);

  function MIDISplit(timeline, callback) {
    _classCallCheck(this, MIDISplit);

    _get(Object.getPrototypeOf(MIDISplit.prototype), "constructor", this).call(this, timeline);

    this.timeline = timeline;
    this.callback = callback;
    this.channels = new Array(8);

    for (var i = 0; i < this.channels.length; i++) {
      this.channels[i] = new _MIDIEffect3["default"](this.timeline);
    }
  }

  _createClass(MIDISplit, [{
    key: "process",
    value: function process(data) {
      var channel = this.callback(data);

      if (this.channels[channel]) {
        this.channels[channel].push(data);
      }
    }
  }]);

  return MIDISplit;
})(_MIDIEffect3["default"]);

exports["default"] = MIDISplit;
module.exports = exports["default"];

},{"../MIDIEffect":94}],103:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _MIDIEffect2 = require("../MIDIEffect");

var _MIDIEffect3 = _interopRequireDefault(_MIDIEffect2);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var MIDIStutter = (function (_MIDIEffect) {
  _inherits(MIDIStutter, _MIDIEffect);

  function MIDIStutter(timeline, interval) {
    _classCallCheck(this, MIDIStutter);

    _get(Object.getPrototypeOf(MIDIStutter.prototype), "constructor", this).call(this, timeline);

    this.timeline = timeline;
    this.ticksPerBeat = 480;
    this.tempo = 120;
    this.interval = interval;
  }

  _createClass(MIDIStutter, [{
    key: "_ticksToSeconds",
    value: function _ticksToSeconds(ticks) {
      return ticks / this.ticksPerBeat * (60 / this.tempo);
    }
  }, {
    key: "process",
    value: function process(data, next) {
      if (typeof data.ticks !== "number") {
        return next(data);
      }

      var ticks = this.ticksPerBeat * this.interval;
      var duration = this._ticksToSeconds(ticks);
      var numOfStutter = Math.ceil(data.ticks / ticks);
      var splittedData = _utils2["default"].xtend(data, { ticks: ticks, duration: duration });

      function $next(_ref) {
        var playbackTime = _ref.playbackTime;

        next(_utils2["default"].xtend(splittedData, { playbackTime: playbackTime }));
      }

      for (var i = 0; i < numOfStutter; i++) {
        var delayTime = this._ticksToSeconds(ticks * i);

        this.timeline.insert(data.playbackTime + delayTime, $next);
      }
    }
  }]);

  return MIDIStutter;
})(_MIDIEffect3["default"]);

exports["default"] = MIDIStutter;
module.exports = exports["default"];

},{"../MIDIEffect":94,"./utils":105}],104:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _MIDIEffect2 = require("../MIDIEffect");

// import utils from "./utils";

var _MIDIEffect3 = _interopRequireDefault(_MIDIEffect2);

var MIDIMap = (function (_MIDIEffect) {
  _inherits(MIDIMap, _MIDIEffect);

  function MIDIMap(timeline, callback) {
    _classCallCheck(this, MIDIMap);

    _get(Object.getPrototypeOf(MIDIMap.prototype), "constructor", this).call(this, timeline);

    this.timeline = timeline;
    this.callback = callback;
  }

  _createClass(MIDIMap, [{
    key: "process",
    value: function process(data, next) {
      this.callback(data);
      next(data);
    }
  }]);

  return MIDIMap;
})(_MIDIEffect3["default"]);

exports["default"] = MIDIMap;
module.exports = exports["default"];

},{"../MIDIEffect":94}],105:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _utils = require("../utils");

var _utils2 = _interopRequireDefault(_utils);

exports["default"] = _utils2["default"].xtend(_utils2["default"], {});
module.exports = exports["default"];

},{"../utils":140}],106:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _instruments = require("./instruments");

var _instruments2 = _interopRequireDefault(_instruments);

var _tracks = require("./tracks");

var _tracks2 = _interopRequireDefault(_tracks);

exports["default"] = {
  instruments: _instruments2["default"],
  tracks: _tracks2["default"]
};
module.exports = exports["default"];

},{"./instruments":128,"./tracks":138}],107:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _mohayonaoEnvelope = require("@mohayonao/envelope");

// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";

var _mohayonaoEnvelope2 = _interopRequireDefault(_mohayonaoEnvelope);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var RELEASE_TIME = 0.05;
var GAIN_UP = 0.5;

var AnalogBass = (function (_Instrument) {
  _inherits(AnalogBass, _Instrument);

  function AnalogBass() {
    _classCallCheck(this, AnalogBass);

    _get(Object.getPrototypeOf(AnalogBass.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(AnalogBass, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {}
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      var frequency = _utils2["default"].midicps(this.noteNumber);

      this.frequency = frequency;

      this.osc = this.audioContext.createOscillator();
      this.osc.type = "sawtooth";
      this.osc.frequency.value = frequency * 0.5;
      this.osc.onended = function () {
        _this.emit("ended");
      };

      this.filter = this.audioContext.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = 220;
      this.filter.Q.value = 12;

      this.gain = this.audioContext.createGain();
      this.releaseNode = this.audioContext.createGain();

      this.osc.connect(this.filter);
      this.filter.connect(this.gain);
      this.gain.connect(this.releaseNode);

      this.outlet = this.releaseNode;
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.osc.start(t0);

      _mohayonaoEnvelope2["default"].ads(0.005, 10.5, _utils2["default"].dbamp(-48)).applyTo(this.gain.gain, t0);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + RELEASE_TIME;

      this.osc.stop(t2);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.releaseNode.gain.linearRampToValueAtTime(0, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.osc.disconnect();
      this.filter.disconnect();
      this.gain.disconnect();
      this.osc = this.filter = this.gain = this.releaseNode = null;
    }
  }]);

  return AnalogBass;
})(_Instrument3["default"]);

exports["default"] = AnalogBass;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129,"@mohayonao/envelope":1}],108:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

// import Envelope from "@mohayonao/envelope";
// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var RELEASE_TIME = 1.25;
var GAIN_UP = 0.5;

var ArpeggioPad = (function (_Instrument) {
  _inherits(ArpeggioPad, _Instrument);

  function ArpeggioPad() {
    _classCallCheck(this, ArpeggioPad);

    _get(Object.getPrototypeOf(ArpeggioPad.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(ArpeggioPad, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {}
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      var frequency = _utils2["default"].midicps(this.noteNumber);
      var valueCurve = new Float32Array(512);
      var octaves = [1, 2, 4, 1, 2, 4, 1, 2];

      for (var i = 0; i < 512; i++) {
        valueCurve[i] = frequency * _utils2["default"].wrapAt(octaves, i);
      }

      this.valueCurve = valueCurve;

      this.osc = this.audioContext.createOscillator();
      this.osc.type = "triangle";
      this.osc.onended = function () {
        _this.emit("ended");
      };

      this.filter = this.audioContext.createBiquadFilter();
      this.filter.type = "highpass";
      this.filter.frequency.value = frequency * 2;
      this.filter.Q.value = _utils2["default"].linlin(this.params[7], 0, 127, 0.5, 24);

      this.releaseNode = this.audioContext.createGain();

      this.osc.connect(this.filter);
      this.filter.connect(this.releaseNode);

      this.outlet = this.releaseNode;
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.osc.start(t0);

      var speed = _utils2["default"].linlin(this.params[15], 0, 127, 120, 30);

      this.osc.frequency.setValueCurveAtTime(this.valueCurve, t0, speed);

      this.releaseNode.gain.setValueAtTime(0, t0);
      this.releaseNode.gain.linearRampToValueAtTime(this.volume * GAIN_UP, t0 + 0.25);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + RELEASE_TIME;

      this.osc.stop(t2);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.releaseNode.gain.linearRampToValueAtTime(0, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.osc.disconnect();
      this.filter.disconnect();
      this.osc = this.filter = this.releaseNode = null;
    }
  }]);

  return ArpeggioPad;
})(_Instrument3["default"]);

exports["default"] = ArpeggioPad;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129}],109:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

// import Envelope from "@mohayonao/envelope";
// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var DECAY_TIME = 0.05;
var RELEASE_TIME = 0.01;
var GAIN_UP = 2;

var Beep = (function (_Instrument) {
  _inherits(Beep, _Instrument);

  function Beep() {
    _classCallCheck(this, Beep);

    _get(Object.getPrototypeOf(Beep.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(Beep, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {}
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      this.duration = DECAY_TIME;

      var frequency = _utils2["default"].midicps(this.noteNumber % 12 + 60) * 8;

      this.osc = this.audioContext.createOscillator();
      this.osc.frequency.value = frequency;
      this.osc.onended = function () {
        _this.emit("ended");
      };

      this.releaseNode = this.audioContext.createGain();

      this.osc.connect(this.releaseNode);

      this.outlet = this.releaseNode;
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.osc.start(t0);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + RELEASE_TIME;

      this.osc.stop(t2);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.osc.disconnect();
      this.osc = this.releaseNode = null;
    }
  }]);

  return Beep;
})(_Instrument3["default"]);

exports["default"] = Beep;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129}],110:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

// import Envelope from "@mohayonao/envelope";
// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var RELEASE_TIME = 0.125;
var GAIN_UP = 1;

var DecayNoise = (function (_Instrument) {
  _inherits(DecayNoise, _Instrument);

  function DecayNoise() {
    _classCallCheck(this, DecayNoise);

    _get(Object.getPrototypeOf(DecayNoise.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(DecayNoise, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {
      this.wave = _utils2["default"].createWhiteNoise(5);
    }
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      var frequency = _utils2["default"].midicps(this.noteNumber);

      this.bufSrc = this.audioContext.createBufferSource();
      this.bufSrc.buffer = this.wave;
      this.bufSrc.loop = true;
      this.bufSrc.onended = function () {
        _this.emit("ended");
      };

      this.filter = this.audioContext.createBiquadFilter();
      this.filter.type = "highpass";
      this.filter.frequency.value = frequency * 4;
      this.filter.Q.value = 36;

      this.releaseGain = this.audioContext.createGain();

      this.bufSrc.connect(this.filter);
      this.filter.connect(this.releaseGain);

      this.outlet = this.releaseGain;
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      var t1 = t0;
      var t2 = t1 + RELEASE_TIME;

      this.bufSrc.start(t0);
      this.bufSrc.stop(t2);

      this.releaseGain.gain.setValueAtTime(this.volume * GAIN_UP, t0);
      this.releaseGain.gain.exponentialRampToValueAtTime(1e-2, t2);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value() {}
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.bufSrc.disconnect();
      this.filter.disconnect();
      this.bufSrc = this.filter = this.releaseGain = null;
    }
  }]);

  return DecayNoise;
})(_Instrument3["default"]);

exports["default"] = DecayNoise;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129}],111:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _mohayonaoEnvelope = require("@mohayonao/envelope");

// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";

var _mohayonaoEnvelope2 = _interopRequireDefault(_mohayonaoEnvelope);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var ATTACK_TIME = 0.005;
var DECAY_TIME = 0.005;
var SUSTAIN_LEVEL = 0.75;
var SUSTAIN_TIME = 0.050;
var GAIN_UP = 2;

var DelayTone = (function (_Instrument) {
  _inherits(DelayTone, _Instrument);

  function DelayTone() {
    _classCallCheck(this, DelayTone);

    _get(Object.getPrototypeOf(DelayTone.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(DelayTone, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {
      this.wave = _utils2["default"].createColoredWave("#fa240000000");
    }
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      var frequency = _utils2["default"].midicps(this.noteNumber);

      this.duration = ATTACK_TIME + DECAY_TIME + SUSTAIN_TIME;
      this.osc = this.audioContext.createOscillator();
      this.osc.setPeriodicWave(this.wave);
      this.osc.frequency.value = frequency;
      this.osc.detune.value = _utils2["default"].findet(+4);
      this.osc.onended = function () {
        _this.emit("ended");
      };

      this.releaseNode = this.audioContext.createGain();

      this.osc.connect(this.releaseNode);

      this.outlet = this.releaseNode;
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.osc.start(t0);

      _mohayonaoEnvelope2["default"].ads(ATTACK_TIME, DECAY_TIME, SUSTAIN_LEVEL, this.volume * GAIN_UP).applyTo(this.releaseNode.gain, t0);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + _utils2["default"].linlin(this.params[13], 0, 127, 0.1, 4);

      this.osc.stop(t2);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.osc.disconnect();
      this.osc = this.releaseNode = null;
    }
  }], [{
    key: "getEnabledParams",
    value: function getEnabledParams() {
      return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0];
    }
  }]);

  return DelayTone;
})(_Instrument3["default"]);

exports["default"] = DelayTone;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129,"@mohayonao/envelope":1}],112:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _mohayonaoEnvelope = require("@mohayonao/envelope");

var _mohayonaoEnvelope2 = _interopRequireDefault(_mohayonaoEnvelope);

var _mohayonaoOperator = require("@mohayonao/operator");

var _mohayonaoOperator2 = _interopRequireDefault(_mohayonaoOperator);

var _mohayonaoFmSynth = require("@mohayonao/fm-synth");

var _mohayonaoFmSynth2 = _interopRequireDefault(_mohayonaoFmSynth);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var RELEASE_TIME = 0.25;
var GAIN_UP = 0.6;

var Distorted = (function (_Instrument) {
  _inherits(Distorted, _Instrument);

  function Distorted() {
    _classCallCheck(this, Distorted);

    _get(Object.getPrototypeOf(Distorted.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(Distorted, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {}
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      var frequency = _utils2["default"].midicps(this.noteNumber);
      var opA = new _mohayonaoOperator2["default"](this.audioContext);
      var opB = new _mohayonaoOperator2["default"](this.audioContext);
      var opC = new _mohayonaoOperator2["default"](this.audioContext);

      opA.frequency.value = frequency * 0.5;
      opA.setEnvelope(_mohayonaoEnvelope2["default"].ads(0.005, 0.100, _utils2["default"].dbamp(-2)));

      opB.frequency.value = frequency;
      opB.detune.value = _utils2["default"].findet(-2);
      opB.setEnvelope(_mohayonaoEnvelope2["default"].ads(0.250, 0.500, _utils2["default"].dbamp(-12), _utils2["default"].dbamp(-18) * frequency * 50));

      opC.frequency.value = frequency;
      opC.setEnvelope(_mohayonaoEnvelope2["default"].ads(0.005, 2.500, _utils2["default"].dbamp(-12), _utils2["default"].dbamp(-10) * frequency * 50));

      this.fmsynth = new _mohayonaoFmSynth2["default"](3, [opA, opB, opC, null]);
      this.fmsynth.onended = function () {
        _this.emit("ended");
      };

      this.frequency = frequency;
      this.filter = this.audioContext.createBiquadFilter();
      this.filter.type = "lowpass";
      this.updateFilter();

      this.releaseNode = this.audioContext.createGain();

      this.fmsynth.connect(this.filter);
      this.filter.connect(this.releaseNode);

      this.outlet = this.releaseNode;
    }
  }, {
    key: "updateFilter",
    value: function updateFilter() {
      var x = this.params[2];
      var y = this.params[10];

      this.filter.frequency.value = this.frequency * _utils2["default"].linexp(x, 0, 127, 0.5, 12);
      this.filter.Q.value = _utils2["default"].linlin(y, 0, 127, 16, 80);
    }
  }, {
    key: "/param:2",
    value: function param2() {
      this.updateFilter();
    }
  }, {
    key: "/param:10",
    value: function param10() {
      this.updateFilter();
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.fmsynth.start(t0);
      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + RELEASE_TIME;

      this.fmsynth.stop(t2);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {}
  }]);

  return Distorted;
})(_Instrument3["default"]);

exports["default"] = Distorted;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129,"@mohayonao/envelope":1,"@mohayonao/fm-synth":3,"@mohayonao/operator":22}],113:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _mohayonaoEnvelope = require("@mohayonao/envelope");

var _mohayonaoEnvelope2 = _interopRequireDefault(_mohayonaoEnvelope);

var _mohayonaoOperator = require("@mohayonao/operator");

var _mohayonaoOperator2 = _interopRequireDefault(_mohayonaoOperator);

var _mohayonaoFmSynth = require("@mohayonao/fm-synth");

var _mohayonaoFmSynth2 = _interopRequireDefault(_mohayonaoFmSynth);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var RELEASE_TIME = 0.050;
var GAIN_UP = 0.5;

var FMBass = (function (_Instrument) {
  _inherits(FMBass, _Instrument);

  function FMBass() {
    _classCallCheck(this, FMBass);

    _get(Object.getPrototypeOf(FMBass.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(FMBass, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {}
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      var frequency = _utils2["default"].midicps(this.noteNumber);
      var opA = new _mohayonaoOperator2["default"](this.audioContext);
      var opB = new _mohayonaoOperator2["default"](this.audioContext);

      opA.frequency.value = frequency;
      opA.detune.value = _utils2["default"].findet(-2);
      opA.setEnvelope(_mohayonaoEnvelope2["default"].asr(0.004, 0, 17.2, _utils2["default"].dbamp(-0)));

      opB.frequency.value = frequency * 0.5;
      opB.detune.value = _utils2["default"].findet(3);
      opB.setEnvelope(_mohayonaoEnvelope2["default"].asr(0.008, 0, 10.4, _utils2["default"].dbamp(-19) * frequency * this.volume * 20));

      this.fmsynth = new _mohayonaoFmSynth2["default"](7, [opA, opB, 0, 0]);
      this.fmsynth.onended = function () {
        _this.emit("ended");
      };

      this.releaseNode = this.audioContext.createGain();

      this.fmsynth.connect(this.releaseNode);

      this.outlet = this.releaseNode;
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.fmsynth.start(t0);
      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + RELEASE_TIME;

      this.fmsynth.stop(t2);
      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.fmsynth.disconnect();
      this.fmsynth = this.releaseNode = null;
    }
  }]);

  return FMBass;
})(_Instrument3["default"]);

exports["default"] = FMBass;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129,"@mohayonao/envelope":1,"@mohayonao/fm-synth":3,"@mohayonao/operator":22}],114:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _mohayonaoEnvelope = require("@mohayonao/envelope");

var _mohayonaoEnvelope2 = _interopRequireDefault(_mohayonaoEnvelope);

var _mohayonaoOperator = require("@mohayonao/operator");

var _mohayonaoOperator2 = _interopRequireDefault(_mohayonaoOperator);

var _mohayonaoFmSynth = require("@mohayonao/fm-synth");

var _mohayonaoFmSynth2 = _interopRequireDefault(_mohayonaoFmSynth);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var RELEASE_TIME = 0.750;
var GAIN_UP = 2.5;

var FMPiano = (function (_Instrument) {
  _inherits(FMPiano, _Instrument);

  function FMPiano() {
    _classCallCheck(this, FMPiano);

    _get(Object.getPrototypeOf(FMPiano.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(FMPiano, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {}
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      var frequency = _utils2["default"].midicps(this.noteNumber);
      var opA = new _mohayonaoOperator2["default"](this.audioContext);
      var opB = new _mohayonaoOperator2["default"](this.audioContext);
      var opC = new _mohayonaoOperator2["default"](this.audioContext);
      var opD = new _mohayonaoOperator2["default"](this.audioContext);

      opA.frequency.value = frequency;
      opA.detune.value = _utils2["default"].findet(-2);
      opA.setEnvelope(_mohayonaoEnvelope2["default"].r(7.16, _utils2["default"].dbamp(-7.9)));

      opB.frequency.value = frequency * 14;
      opB.detune.value = _utils2["default"].findet(2);
      opB.setEnvelope(_mohayonaoEnvelope2["default"].r(1.60, _utils2["default"].dbamp(-40) * frequency * this.volume * 20));

      opC.frequency.value = frequency;
      opC.detune.value = _utils2["default"].findet(3);
      opC.setEnvelope(_mohayonaoEnvelope2["default"].r(7.16, _utils2["default"].dbamp(-6.7)));

      opD.frequency.value = frequency;
      opD.detune.value = _utils2["default"].findet(1);
      opD.setEnvelope(_mohayonaoEnvelope2["default"].r(7.16, _utils2["default"].dbamp(-24) * frequency * this.volume * 20));

      this.fmsynth = new _mohayonaoFmSynth2["default"](7, [opA, opB, opC, opD]);
      this.fmsynth.onended = function () {
        _this.emit("ended");
      };

      this.releaseNode = this.audioContext.createGain();

      this.fmsynth.connect(this.releaseNode);

      this.outlet = this.releaseNode;
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.fmsynth.start(t0);
      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + RELEASE_TIME;

      this.fmsynth.stop(t2);
      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.fmsynth.disconnect();
      this.fmsynth = this.releaseNode = null;
    }
  }]);

  return FMPiano;
})(_Instrument3["default"]);

exports["default"] = FMPiano;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129,"@mohayonao/envelope":1,"@mohayonao/fm-synth":3,"@mohayonao/operator":22}],115:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

// import Envelope from "@mohayonao/envelope";
// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var RELEASE_TIME = 0.125;
var GAIN_UP = 2;

var ImpulseNoise = (function (_Instrument) {
  _inherits(ImpulseNoise, _Instrument);

  function ImpulseNoise() {
    _classCallCheck(this, ImpulseNoise);

    _get(Object.getPrototypeOf(ImpulseNoise.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(ImpulseNoise, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {
      this.wave = _utils2["default"].createPinkNoise(5);
      this.dust = new Float32Array(8192);

      for (var i = 0; i < this.dust.length; i++) {
        this.dust[i] = Math.random() < 0.0625 ? 1 : 0;
      }
    }
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      this.bufSrc = this.audioContext.createBufferSource();
      this.bufSrc.buffer = this.wave;
      this.bufSrc.loop = true;
      this.bufSrc.onended = function () {
        _this.emit("ended");
      };

      this.gain = this.audioContext.createGain();
      this.releaseGain = this.audioContext.createGain();

      this.bufSrc.connect(this.gain);
      this.gain.connect(this.releaseGain);

      this.outlet = this.releaseGain;
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.bufSrc.start(t0);

      this.gain.gain.setValueCurveAtTime(this.dust, t0, 60);
      this.releaseGain.gain.setValueAtTime(this.volume * GAIN_UP, t0);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + RELEASE_TIME;

      this.bufSrc.stop(t2);

      this.releaseGain.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.releaseGain.gain.exponentialRampToValueAtTime(1e-2, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.bufSrc.disconnect();
      this.gain.disconnect();
      this.bufSrc = this.gain = this.releaseGain = null;
    }
  }]);

  return ImpulseNoise;
})(_Instrument3["default"]);

exports["default"] = ImpulseNoise;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129}],116:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _mohayonaoEnvelope = require("@mohayonao/envelope");

// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";

var _mohayonaoEnvelope2 = _interopRequireDefault(_mohayonaoEnvelope);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var RELEASE_TIME = 0.025;
var GAIN_UP = 1;

var FORMANT_PARAMS = {
  a: [700, 1200, 2900],
  i: [300, 2700, 2700],
  u: [390, 1200, 2500],
  e: [450, 1750, 2750],
  o: [460, 880, 2800]
};

var Template = (function (_Instrument) {
  _inherits(Template, _Instrument);

  function Template() {
    _classCallCheck(this, Template);

    _get(Object.getPrototypeOf(Template.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(Template, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {}
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      var koe = _utils2["default"].wrapAt(["a", "i", "u", "e", "o"], this.noteNumber);
      var frequency = _utils2["default"].midicps(this.noteNumber);
      var formants = FORMANT_PARAMS[koe];

      this.voice1 = this.audioContext.createOscillator();
      this.voice1.type = "sawtooth";
      this.voice1.frequency.value = frequency * 0.5;
      this.voice1.detune.value = _utils2["default"].findet(-1);
      this.voice1.onended = function () {
        _this.emit("ended");
      };

      this.voice2 = this.audioContext.createOscillator();
      this.voice2.type = "sawtooth";
      this.voice2.frequency.value = frequency * 0.5;
      this.voice1.detune.value = _utils2["default"].findet(+1);

      this.bpf1 = this.audioContext.createBiquadFilter();
      this.bpf1.type = "bandpass";
      this.bpf1.frequency.value = formants[0];
      this.bpf1.Q.value = 24;

      this.bpf2 = this.audioContext.createBiquadFilter();
      this.bpf2.type = "bandpass";
      this.bpf2.frequency.value = formants[1];
      this.bpf2.Q.value = 24;

      this.bpf3 = this.audioContext.createBiquadFilter();
      this.bpf3.type = "bandpass";
      this.bpf3.frequency.value = formants[2];
      this.bpf3.Q.value = 24;

      this.band = this.audioContext.createBiquadFilter();
      this.band.type = "bandpass";
      this.band.frequency.value = frequency * 2;
      this.band.Q.value = 0.45;

      this.gain = this.audioContext.createGain();
      this.releaseNode = this.audioContext.createGain();

      this.voice1.connect(this.bpf1);
      this.voice1.connect(this.bpf2);
      this.voice1.connect(this.bpf3);
      this.voice2.connect(this.bpf1);
      this.voice2.connect(this.bpf2);
      this.voice2.connect(this.bpf3);
      this.bpf1.connect(this.band);
      this.bpf2.connect(this.band);
      this.bpf3.connect(this.band);
      this.band.connect(this.gain);
      this.gain.connect(this.releaseNode);

      this.outlet = this.releaseNode;
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.voice1.start(t0);
      this.voice2.start(t0);

      _mohayonaoEnvelope2["default"].ads(0.125, 10.2, _utils2["default"].dbamp(-24)).applyTo(this.gain.gain, t0);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + RELEASE_TIME;

      this.voice1.stop(t2);
      this.voice2.stop(t2);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.voice1.disconnect();
      this.voice2.disconnect();
      this.bpf1.disconnect();
      this.bpf2.disconnect();
      this.bpf3.disconnect();
      this.band.disconnect();
      this.gain.disconnect();
      this.voice1 = this.voice2 = this.bpf1 = this.bpf2 = this.bpf3 = null;
      this.band = this.gain = null;
    }
  }]);

  return Template;
})(_Instrument3["default"]);

exports["default"] = Template;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129,"@mohayonao/envelope":1}],117:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _mohayonaoEnvelope = require("@mohayonao/envelope");

var _mohayonaoEnvelope2 = _interopRequireDefault(_mohayonaoEnvelope);

var _mohayonaoOperator = require("@mohayonao/operator");

var _mohayonaoOperator2 = _interopRequireDefault(_mohayonaoOperator);

var _mohayonaoFmSynth = require("@mohayonao/fm-synth");

var _mohayonaoFmSynth2 = _interopRequireDefault(_mohayonaoFmSynth);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var DECAY_TIME = 2.0;
var RELEASE_TIME = 0.5;
var GAIN_UP = 1;

var PlasticHarp = (function (_Instrument) {
  _inherits(PlasticHarp, _Instrument);

  function PlasticHarp() {
    _classCallCheck(this, PlasticHarp);

    _get(Object.getPrototypeOf(PlasticHarp.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(PlasticHarp, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {}
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      this.duration = DECAY_TIME;

      var frequency = _utils2["default"].midicps(this.noteNumber);
      var opA = new _mohayonaoOperator2["default"](this.audioContext);
      var opB = new _mohayonaoOperator2["default"](this.audioContext);
      var opC = new _mohayonaoOperator2["default"](this.audioContext);
      var opD = new _mohayonaoOperator2["default"](this.audioContext);

      opA.type = "triangle";
      opA.frequency.value = frequency;
      opA.detune.value = _utils2["default"].findet(-8);
      opA.setEnvelope(_mohayonaoEnvelope2["default"].r(2.500));

      opB.type = "sine";
      opB.frequency.value = frequency * 4;
      opB.setEnvelope(_mohayonaoEnvelope2["default"].r(0.500, _utils2["default"].dbamp(-14) * frequency * 50));

      opC.type = "triangle";
      opC.frequency.value = frequency;
      opC.detune.value = _utils2["default"].findet(+8);
      opC.setEnvelope(_mohayonaoEnvelope2["default"].r(2.500));

      opD.type = "sine";
      opD.frequency.value = frequency * 4;
      opD.setEnvelope(_mohayonaoEnvelope2["default"].r(0.500, _utils2["default"].dbamp(-14) * frequency * 50));

      this.fmsynth = new _mohayonaoFmSynth2["default"](7, [opA, opB, opC, opD]);
      this.fmsynth.onended = function () {
        _this.emit("ended");
      };

      this.releaseNode = this.audioContext.createGain();

      this.fmsynth.connect(this.releaseNode);

      this.outlet = this.releaseNode;
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.fmsynth.start(t0);

      this.releaseNode.gain.setValueAtTime(0, t0);
      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0 + 0.005);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + RELEASE_TIME;

      this.fmsynth.stop(t2);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.fmsynth.disconnect();
      this.fmsynth = this.releaseNode = null;
    }
  }]);

  return PlasticHarp;
})(_Instrument3["default"]);

exports["default"] = PlasticHarp;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129,"@mohayonao/envelope":1,"@mohayonao/fm-synth":3,"@mohayonao/operator":22}],118:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _mohayonaoEnvelope = require("@mohayonao/envelope");

var _mohayonaoEnvelope2 = _interopRequireDefault(_mohayonaoEnvelope);

var _mohayonaoOperator = require("@mohayonao/operator");

var _mohayonaoOperator2 = _interopRequireDefault(_mohayonaoOperator);

var _mohayonaoFmSynth = require("@mohayonao/fm-synth");

var _mohayonaoFmSynth2 = _interopRequireDefault(_mohayonaoFmSynth);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var GAIN_UP = 1.25;

var PureVibes = (function (_Instrument) {
  _inherits(PureVibes, _Instrument);

  function PureVibes() {
    _classCallCheck(this, PureVibes);

    _get(Object.getPrototypeOf(PureVibes.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(PureVibes, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {}
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      var frequency = _utils2["default"].midicps(this.noteNumber);
      var opA = new _mohayonaoOperator2["default"](this.audioContext);
      var opB = new _mohayonaoOperator2["default"](this.audioContext);
      var opC = new _mohayonaoOperator2["default"](this.audioContext);

      opA.frequency.value = frequency;
      opA.setEnvelope(_mohayonaoEnvelope2["default"].r(8.31, _utils2["default"].dbamp(-0.6)));

      opB.frequency.value = frequency * 4;
      opB.setEnvelope(_mohayonaoEnvelope2["default"].r(1.07, _utils2["default"].dbamp(-3.8)));

      opC.type = "square";
      opC.frequency.value = frequency * 13;
      opC.setEnvelope(_mohayonaoEnvelope2["default"].r(13.9, _utils2["default"].dbamp(-28) * frequency * 50));

      this.fmsynth = new _mohayonaoFmSynth2["default"](5, [opA, opB, opC, null]);
      this.fmsynth.onended = function () {
        _this.emit("ended");
      };

      this.releaseNode = this.audioContext.createGain();

      this.fmsynth.connect(this.releaseNode);

      this.outlet = this.releaseNode;
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.startTime = t0;
      this.fmsynth.start(t0);
      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + 0.5;

      this.fmsynth.stop(t2);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.fmsynth.disconnect();
      this.fmsynth = this.releaseNode = null;
    }
  }]);

  return PureVibes;
})(_Instrument3["default"]);

exports["default"] = PureVibes;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129,"@mohayonao/envelope":1,"@mohayonao/fm-synth":3,"@mohayonao/operator":22}],119:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

// import Envelope from "@mohayonao/envelope";
// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var RELEASE_TIME = 0.125;
var GAIN_UP = 0.5;

var SAHFilteredNoise = (function (_Instrument) {
  _inherits(SAHFilteredNoise, _Instrument);

  function SAHFilteredNoise() {
    _classCallCheck(this, SAHFilteredNoise);

    _get(Object.getPrototypeOf(SAHFilteredNoise.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(SAHFilteredNoise, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {
      this.wave = _utils2["default"].createWhiteNoise(5);
      this.cutoffValues = new Float32Array(1024);

      for (var i = 0; i < 1024; i++) {
        this.cutoffValues[i] = _utils2["default"].linexp(Math.random(), 0, 1, 1200, 3600);
      }
    }
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      this.bufSrc = this.audioContext.createBufferSource();
      this.bufSrc.buffer = this.wave;
      this.bufSrc.loop = true;
      this.bufSrc.onended = function () {
        _this.emit("ended");
      };

      this.filter = this.audioContext.createBiquadFilter();
      this.filter.type = "bandpass";
      this.filter.Q.value = 8;

      this.releaseGain = this.audioContext.createGain();

      this.bufSrc.connect(this.filter);
      this.filter.connect(this.releaseGain);

      this.outlet = this.releaseGain;
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.bufSrc.start(t0);

      this.filter.frequency.setValueCurveAtTime(this.cutoffValues, t0, 60);
      this.releaseGain.gain.setValueAtTime(this.volume * GAIN_UP, t0);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + RELEASE_TIME;

      this.bufSrc.stop(t2);

      this.releaseGain.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.releaseGain.gain.exponentialRampToValueAtTime(1e-2, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.bufSrc.disconnect();
      this.filter.disconnect();
      this.bufSrc = this.filter = this.releaseGain = null;
    }
  }]);

  return SAHFilteredNoise;
})(_Instrument3["default"]);

exports["default"] = SAHFilteredNoise;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129}],120:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

// import Envelope from "@mohayonao/envelope";
// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var _mohayonaoWaveTablesChorusStrings = require("@mohayonao/wave-tables/ChorusStrings");

var _mohayonaoWaveTablesChorusStrings2 = _interopRequireDefault(_mohayonaoWaveTablesChorusStrings);

var RELEASE_TIME = 1.25;
var GAIN_UP = 0.75;

var ShadowString = (function (_Instrument) {
  _inherits(ShadowString, _Instrument);

  function ShadowString() {
    _classCallCheck(this, ShadowString);

    _get(Object.getPrototypeOf(ShadowString.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(ShadowString, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {
      this.wave = _utils2["default"].createWave(_mohayonaoWaveTablesChorusStrings2["default"]);
    }
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      var frequency = _utils2["default"].midicps(this.noteNumber);

      this.osc1 = this.audioContext.createOscillator();
      this.osc1.setPeriodicWave(this.wave);
      this.osc1.frequency.value = frequency * 0.5;
      this.osc1.detune.value = _utils2["default"].findet(-2);
      this.osc1.onended = function () {
        _this.emit("ended");
      };

      this.osc2 = this.audioContext.createOscillator();
      this.osc2.setPeriodicWave(this.wave);
      this.osc2.frequency.value = frequency * 0.5;
      this.osc2.detune.value = _utils2["default"].findet(+2);

      this.filter = this.audioContext.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = frequency * 2;
      this.filter.Q.value = 12;

      this.releaseNode = this.audioContext.createGain();

      this.osc1.connect(this.filter);
      this.osc2.connect(this.filter);
      this.filter.connect(this.releaseNode);

      this.outlet = this.releaseNode;
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.osc1.start(t0);
      this.osc2.start(t0);

      this.releaseNode.gain.setValueAtTime(0, t0);
      this.releaseNode.gain.linearRampToValueAtTime(this.volume * GAIN_UP, t0 + 0.25);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + RELEASE_TIME;

      this.osc1.stop(t2);
      this.osc2.stop(t2);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.releaseNode.gain.linearRampToValueAtTime(0, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.osc1.disconnect();
      this.osc2.disconnect();
      this.filter.disconnect();
      this.osc1 = this.osc2 = this.filter = this.releaseNode = null;
    }
  }]);

  return ShadowString;
})(_Instrument3["default"]);

exports["default"] = ShadowString;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129,"@mohayonao/wave-tables/ChorusStrings":34}],121:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _mohayonaoEnvelope = require("@mohayonao/envelope");

// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";

var _mohayonaoEnvelope2 = _interopRequireDefault(_mohayonaoEnvelope);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var RELEASE_TIME = 0.125;
var GAIN_UP = 0.75;

var SimpleSine = (function (_Instrument) {
  _inherits(SimpleSine, _Instrument);

  function SimpleSine() {
    _classCallCheck(this, SimpleSine);

    _get(Object.getPrototypeOf(SimpleSine.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(SimpleSine, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {}
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      var sustainDb = _utils2["default"].linlin(this.params[8], 0, 127, -96, 0);
      var frequency = _utils2["default"].midicps(this.noteNumber);

      this.osc1 = this.audioContext.createOscillator();
      this.osc1.type = "sine";
      this.osc1.frequency.value = frequency;
      this.osc1.onended = function () {
        _this.emit("ended");
      };

      this.osc2 = this.audioContext.createOscillator();
      this.osc2.type = "sine";
      this.osc2.frequency.value = frequency;

      this.gain = this.audioContext.createGain();
      this.releaseNode = this.audioContext.createGain();

      this.osc1.connect(this.gain);
      this.osc2.connect(this.gain);
      this.gain.connect(this.releaseNode);
      this.sustainLevel = _utils2["default"].dbamp(sustainDb);

      this.detune();

      this.outlet = this.releaseNode;
    }
  }, {
    key: "detune",
    value: function detune() {
      var fine = _utils2["default"].linlin(this.params[0], 0, 127, 0.5, 8);

      this.osc1.detune.value = _utils2["default"].findet(-fine);
      this.osc2.detune.value = _utils2["default"].findet(+fine);
    }
  }, {
    key: "/param:0",
    value: function param0() {
      this.detune();
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.osc1.start(t0);
      this.osc2.start(t0);

      _mohayonaoEnvelope2["default"].ads(0.005, 2, this.sustainLevel).applyTo(this.gain.gain, t0);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + RELEASE_TIME;

      this.osc1.stop(t2);
      this.osc2.stop(t2);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.osc1.disconnect();
      this.osc2.disconnect();
      this.osc1 = this.osc2 = this.releaseNode = null;
    }
  }], [{
    key: "getEnabledParams",
    value: function getEnabledParams() {
      return [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];
    }
  }]);

  return SimpleSine;
})(_Instrument3["default"]);

exports["default"] = SimpleSine;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129,"@mohayonao/envelope":1}],122:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

// import Envelope from "@mohayonao/envelope";
// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var RELEASE_TIME = 0.025;
var GAIN_UP = 1;

var SineTone = (function (_Instrument) {
  _inherits(SineTone, _Instrument);

  function SineTone() {
    _classCallCheck(this, SineTone);

    _get(Object.getPrototypeOf(SineTone.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(SineTone, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {}
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      var frequency = _utils2["default"].midicps(this.noteNumber);

      this.osc1 = this.audioContext.createOscillator();
      this.osc1.frequency.value = frequency;

      this.osc2 = this.audioContext.createOscillator();
      this.osc2.frequency.value = frequency;

      this.osc1.onended = function () {
        _this.emit("ended");
      };

      this.releaseNode = this.audioContext.createGain();

      this.osc1.connect(this.releaseNode);
      this.osc2.connect(this.releaseNode);

      this.outlet = this.releaseNode;
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.osc1.start(t0);
      this.osc2.start(t0);

      this.osc1.detune.setValueAtTime(_utils2["default"].findet(+10), t0);
      this.osc1.detune.linearRampToValueAtTime(0, t0 + 4);

      this.osc2.detune.setValueAtTime(_utils2["default"].findet(-10), t0);
      this.osc2.detune.linearRampToValueAtTime(0, t0 + 4);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + RELEASE_TIME;

      this.osc1.stop(t2);
      this.osc2.stop(t2);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.osc1.disconnect();
      this.osc2.disconnect();
      this.osc1 = this.osc2 = this.releaseNode = null;
    }
  }]);

  return SineTone;
})(_Instrument3["default"]);

exports["default"] = SineTone;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129}],123:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _mohayonaoEnvelope = require("@mohayonao/envelope");

var _mohayonaoEnvelope2 = _interopRequireDefault(_mohayonaoEnvelope);

var _mohayonaoOperator = require("@mohayonao/operator");

var _mohayonaoOperator2 = _interopRequireDefault(_mohayonaoOperator);

var _mohayonaoFmSynth = require("@mohayonao/fm-synth");

var _mohayonaoFmSynth2 = _interopRequireDefault(_mohayonaoFmSynth);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var RELEASE_TIME = 0.050;
var GAIN_UP = 0.5;

var SquareLead = (function (_Instrument) {
  _inherits(SquareLead, _Instrument);

  function SquareLead() {
    _classCallCheck(this, SquareLead);

    _get(Object.getPrototypeOf(SquareLead.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(SquareLead, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {}
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      var frequency = _utils2["default"].midicps(this.noteNumber);
      var opA = new _mohayonaoOperator2["default"](this.audioContext);
      var opB = new _mohayonaoOperator2["default"](this.audioContext);
      var opC = new _mohayonaoOperator2["default"](this.audioContext);
      var opD = new _mohayonaoOperator2["default"](this.audioContext);

      opA.type = "square";
      opA.frequency.value = frequency;
      opA.detune.value = _utils2["default"].findet(-6);
      opA.setEnvelope(_mohayonaoEnvelope2["default"].ads(0.060, 0.600, 1, _utils2["default"].dbamp(0)));

      opB.type = "square";
      opB.frequency.value = frequency;
      opB.detune.value = _utils2["default"].findet(+6);
      opB.setEnvelope(_mohayonaoEnvelope2["default"].ads(0.112, 0.600, 1, _utils2["default"].dbamp(0)));

      opC.type = "square";
      opC.frequency.value = frequency;
      opC.detune.value = _utils2["default"].findet(-10);
      opC.setEnvelope(_mohayonaoEnvelope2["default"].ads(0.004, 0.600, 1, _utils2["default"].dbamp(0)));

      opD.type = "square";
      opD.frequency.value = frequency;
      opD.detune.value = _utils2["default"].findet(+10);
      opD.setEnvelope(_mohayonaoEnvelope2["default"].ads(0.006, 0.600, 1, _utils2["default"].dbamp(0)));

      this.synth = new _mohayonaoFmSynth2["default"](10, [opA, opB, opC, opD]);
      this.synth.onended = function () {
        _this.emit("ended");
      };

      this.frequency = frequency;
      this.filter = this.audioContext.createBiquadFilter();
      this.filter.type = "lowpass";
      this.updateFilter();

      this.releaseNode = this.audioContext.createGain();

      this.synth.connect(this.filter);
      this.filter.connect(this.releaseNode);

      this.outlet = this.releaseNode;
    }
  }, {
    key: "updateFilter",
    value: function updateFilter() {
      var x = this.params[2];
      var y = this.params[10];

      this.filter.frequency.value = this.frequency * _utils2["default"].linexp(x, 0, 127, 0.5, 12);
      this.filter.Q.value = _utils2["default"].linlin(y, 0, 127, 16, 80);
    }
  }, {
    key: "/param:2",
    value: function param2() {
      this.updateFilter();
    }
  }, {
    key: "/param:10",
    value: function param10() {
      this.updateFilter();
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.synth.start(t0);
      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + RELEASE_TIME;

      this.synth.stop(t2);
      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.synth.disconnect();
      this.synth = this.releaseNode = null;
    }
  }]);

  return SquareLead;
})(_Instrument3["default"]);

exports["default"] = SquareLead;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129,"@mohayonao/envelope":1,"@mohayonao/fm-synth":3,"@mohayonao/operator":22}],124:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _mohayonaoEnvelope = require("@mohayonao/envelope");

var _mohayonaoEnvelope2 = _interopRequireDefault(_mohayonaoEnvelope);

var _mohayonaoOperator = require("@mohayonao/operator");

var _mohayonaoOperator2 = _interopRequireDefault(_mohayonaoOperator);

var _mohayonaoFmSynth = require("@mohayonao/fm-synth");

var _mohayonaoFmSynth2 = _interopRequireDefault(_mohayonaoFmSynth);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var RELEASE_TIME = 2.5;
var GAIN_UP = 1.25;

var SweepPad = (function (_Instrument) {
  _inherits(SweepPad, _Instrument);

  function SweepPad() {
    _classCallCheck(this, SweepPad);

    _get(Object.getPrototypeOf(SweepPad.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(SweepPad, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {
      this.waveA = _utils2["default"].createColoredWave("#f08012");
      this.waveB = _utils2["default"].createColoredWave("#a14055");
      this.waveC = _utils2["default"].createColoredWave("#f08012");
      this.waveD = _utils2["default"].createColoredWave("#a14055");
    }
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      var frequency = _utils2["default"].midicps(this.noteNumber);
      var opA = new _mohayonaoOperator2["default"](this.audioContext);
      var opB = new _mohayonaoOperator2["default"](this.audioContext);
      var opC = new _mohayonaoOperator2["default"](this.audioContext);
      var opD = new _mohayonaoOperator2["default"](this.audioContext);

      opA.setPeriodicWave(this.waveA);
      opA.frequency.value = frequency;
      opA.setEnvelope(_mohayonaoEnvelope2["default"].a(2.4, 0.25));

      opB.setPeriodicWave(this.waveB);
      opB.frequency.value = frequency;
      opB.detune.value = _utils2["default"].findet(3);
      opB.setEnvelope(_mohayonaoEnvelope2["default"].ads(0.01, 1.50, _utils2["default"].dbamp(-14) * frequency * 50));

      opC.setPeriodicWave(this.waveC);
      opC.frequency.value = frequency;
      opC.setEnvelope(_mohayonaoEnvelope2["default"].a(2.4, 0.25));

      opD.setPeriodicWave(this.waveD);
      opD.frequency.value = frequency;
      opD.detune.value = _utils2["default"].findet(-7);
      opD.setEnvelope(_mohayonaoEnvelope2["default"].ads(0.01, 1.50, _utils2["default"].dbamp(-14) * frequency * 50));

      this.fmsynth = new _mohayonaoFmSynth2["default"](7, [opA, opB, opC, opD]);
      this.fmsynth.onended = function () {
        _this.emit("ended");
      };

      this.releaseNode = this.audioContext.createGain();

      this.fmsynth.connect(this.releaseNode);

      this.outlet = this.releaseNode;
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.fmsynth.start(t0);
      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + RELEASE_TIME;

      this.fmsynth.stop(t2);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.fmsynth.disconnect();
      this.fmsynth = this.releaseNode = null;
    }
  }]);

  return SweepPad;
})(_Instrument3["default"]);

exports["default"] = SweepPad;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129,"@mohayonao/envelope":1,"@mohayonao/fm-synth":3,"@mohayonao/operator":22}],125:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _mohayonaoEnvelope = require("@mohayonao/envelope");

var _mohayonaoEnvelope2 = _interopRequireDefault(_mohayonaoEnvelope);

var _mohayonaoOperator = require("@mohayonao/operator");

var _mohayonaoOperator2 = _interopRequireDefault(_mohayonaoOperator);

var _mohayonaoFmSynth = require("@mohayonao/fm-synth");

var _mohayonaoFmSynth2 = _interopRequireDefault(_mohayonaoFmSynth);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var RELEASE_TIME = 13.000;
var GAIN_UP = 1;

var TublarBell = (function (_Instrument) {
  _inherits(TublarBell, _Instrument);

  function TublarBell() {
    _classCallCheck(this, TublarBell);

    _get(Object.getPrototypeOf(TublarBell.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(TublarBell, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {}
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      this.duration = 1;

      var frequency = _utils2["default"].midicps(this.noteNumber - 2);
      var opA = new _mohayonaoOperator2["default"](this.audioContext);
      var opB = new _mohayonaoOperator2["default"](this.audioContext);
      var opC = new _mohayonaoOperator2["default"](this.audioContext);
      var opD = new _mohayonaoOperator2["default"](this.audioContext);

      opA.frequency.value = frequency * 3;
      opA.detune.value = _utils2["default"].findet(500);
      opA.setEnvelope(_mohayonaoEnvelope2["default"].ds(0.004, _utils2["default"].dbamp(0), _utils2["default"].dbamp(0)));

      opB.frequency.value = frequency;
      opB.detune.value = _utils2["default"].findet(250);
      opB.setEnvelope(_mohayonaoEnvelope2["default"].ds(0.031, _utils2["default"].dbamp(-14), _utils2["default"].dbamp(0)));

      opC.detune.value = 0;
      opC.frequency.value = 100;
      opC.setEnvelope(_mohayonaoEnvelope2["default"].ds(0.026, _utils2["default"].dbamp(-28), _utils2["default"].dbamp(0)));

      opD.frequency.value = frequency * 2;
      opD.detune.value = _utils2["default"].findet(63);
      opD.setEnvelope(_mohayonaoEnvelope2["default"].ds(3.230, _utils2["default"].dbamp(-13), _utils2["default"].dbamp(-17) * frequency * this.volume * 20));

      this.fmsynth = new _mohayonaoFmSynth2["default"](8, [opA, opB, opC, opD]);
      this.fmsynth.onended = function () {
        _this.emit("ended");
      };

      this.releaseNode = this.audioContext.createGain();

      this.fmsynth.connect(this.releaseNode);

      this.outlet = this.releaseNode;
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.fmsynth.start(t0);
      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + RELEASE_TIME;

      this.fmsynth.stop(t2);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.fmsynth.disconnect();
      this.fmsynth = this.releaseNode = null;
    }
  }]);

  return TublarBell;
})(_Instrument3["default"]);

exports["default"] = TublarBell;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129,"@mohayonao/envelope":1,"@mohayonao/fm-synth":3,"@mohayonao/operator":22}],126:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _mohayonaoEnvelope = require("@mohayonao/envelope");

var _mohayonaoEnvelope2 = _interopRequireDefault(_mohayonaoEnvelope);

var _mohayonaoOperator = require("@mohayonao/operator");

var _mohayonaoOperator2 = _interopRequireDefault(_mohayonaoOperator);

var _mohayonaoFmSynth = require("@mohayonao/fm-synth");

var _mohayonaoFmSynth2 = _interopRequireDefault(_mohayonaoFmSynth);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var GAIN_UP = 0.5;

var TwinklePad = (function (_Instrument) {
  _inherits(TwinklePad, _Instrument);

  function TwinklePad() {
    _classCallCheck(this, TwinklePad);

    _get(Object.getPrototypeOf(TwinklePad.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(TwinklePad, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {
      this.cutoffValues = new Float32Array(1024);

      for (var i = 0; i < 1024; i++) {
        this.cutoffValues[i] = _utils2["default"].linexp(Math.random(), 0, 1, 1000, 8000);
      }
    }
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      var frequency = _utils2["default"].midicps(this.noteNumber);
      var opA = new _mohayonaoOperator2["default"](this.audioContext);
      var opB = new _mohayonaoOperator2["default"](this.audioContext);
      var opC = new _mohayonaoOperator2["default"](this.audioContext);

      opA.type = "triangle";
      opA.frequency.value = frequency * 2;
      opA.setEnvelope(_mohayonaoEnvelope2["default"].ads(0.15, 2.5, 1));

      opB.frequency.value = frequency * 11;
      opB.setEnvelope(_mohayonaoEnvelope2["default"].ads(1.00, 0.50, _utils2["default"].dbamp(-17) * frequency * 20));

      opC.frequency.value = frequency * 13;
      opC.setEnvelope(_mohayonaoEnvelope2["default"].ads(0.25, 1.25, _utils2["default"].dbamp(-5.4) * frequency * 20));

      this.fmsynth = new _mohayonaoFmSynth2["default"](3, [opA, opB, opC, 0]);
      this.fmsynth.onended = function () {
        _this.emit("ended");
      };

      this.filter = this.audioContext.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.Q.value = 24;

      this.releaseNode = this.audioContext.createGain();

      this.fmsynth.connect(this.filter);
      this.filter.connect(this.releaseNode);

      this.outlet = this.releaseNode;
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.fmsynth.start(t0);

      var speed = _utils2["default"].linlin(this.params[15], 0, 127, 120, 30);

      this.filter.frequency.setValueCurveAtTime(this.cutoffValues, t0, speed);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + 5.0;

      this.fmsynth.stop(t2);

      this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.fmsynth.disconnect();
      this.fmsynth = this.releaseNode = null;
    }
  }]);

  return TwinklePad;
})(_Instrument3["default"]);

exports["default"] = TwinklePad;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129,"@mohayonao/envelope":1,"@mohayonao/fm-synth":3,"@mohayonao/operator":22}],127:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Instrument2 = require("../Instrument");

var _Instrument3 = _interopRequireDefault(_Instrument2);

var _mohayonaoEnvelope = require("@mohayonao/envelope");

// import Operator from "@mohayonao/operator";
// import FMSynth from "@mohayonao/fm-synth";

var _mohayonaoEnvelope2 = _interopRequireDefault(_mohayonaoEnvelope);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var GAIN_UP = 0.5;

var WindMachine = (function (_Instrument) {
  _inherits(WindMachine, _Instrument);

  function WindMachine() {
    _classCallCheck(this, WindMachine);

    _get(Object.getPrototypeOf(WindMachine.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(WindMachine, [{
    key: _Instrument2.INITIALIZE,
    value: function value() {
      this.noise = _utils2["default"].createWhiteNoise();
    }
  }, {
    key: _Instrument2.CREATE,
    value: function value() {
      var _this = this;

      this.bufSrc = this.audioContext.createBufferSource();
      this.bufSrc.buffer = this.noise;
      this.bufSrc.loop = true;
      this.bufSrc.onended = function () {
        _this.emit("ended");
      };

      this.filter1 = this.audioContext.createBiquadFilter();
      this.filter1.type = "lowpass";
      this.filter1.frequency.value = 80;
      this.filter1.Q.value = 8;

      this.filter2 = this.audioContext.createBiquadFilter();
      this.filter1.type = "bandpass";
      this.filter2.frequency.value = _utils2["default"].midicps(this.noteNumber);
      this.filter2.Q.value = 24;

      this.filter3 = this.audioContext.createBiquadFilter();
      this.filter1.type = "highpass";
      this.filter3.frequency.value = _utils2["default"].midicps(this.noteNumber) * 11;
      this.filter3.Q.value = 12.5;

      this.filter4 = this.audioContext.createBiquadFilter();

      this.gain = this.audioContext.createGain();

      this.bufSrc.connect(this.filter1);
      this.bufSrc.connect(this.filter2);
      this.bufSrc.connect(this.filter3);
      this.filter1.connect(this.filter4);
      this.filter2.connect(this.filter4);
      this.filter3.connect(this.filter4);
      this.filter4.connect(this.gain);

      this.outlet = this.gain;
    }
  }, {
    key: _Instrument2.NOTE_ON,
    value: function value(t0) {
      this.bufSrc.start(t0);

      new _mohayonaoEnvelope2["default"]([[0, 80], [2.5, 2400], [5.0, 8000], [7.5, 1200]]).applyTo(this.filter4.frequency, t0);

      this.filter4.Q.setValueAtTime(2, t0);
      this.gain.gain.setValueAtTime(this.volume * GAIN_UP, t0);
    }
  }, {
    key: _Instrument2.NOTE_OFF,
    value: function value(t1) {
      var t2 = t1 + 2.5;

      this.bufSrc.stop(t2);

      this.gain.gain.setValueAtTime(this.volume * GAIN_UP, t1);
      this.gain.gain.exponentialRampToValueAtTime(1e-3, t2);
    }
  }, {
    key: _Instrument2.DISPOSE,
    value: function value() {
      this.bufSrc.disconnect();
      this.filter1.disconnect();
      this.filter2.disconnect();
      this.filter3.disconnect();
      this.filter4.disconnect();
      this.bufSrc = this.filter1 = this.filter2 = this.filter3 = this.filter4 = this.gain = null;
    }
  }]);

  return WindMachine;
})(_Instrument3["default"]);

exports["default"] = WindMachine;
module.exports = exports["default"];

},{"../Instrument":93,"./utils":129,"@mohayonao/envelope":1}],128:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _AnalogBass = require("./AnalogBass");

var _AnalogBass2 = _interopRequireDefault(_AnalogBass);

var _ArpeggioPad = require("./ArpeggioPad");

var _ArpeggioPad2 = _interopRequireDefault(_ArpeggioPad);

var _Beep = require("./Beep");

var _Beep2 = _interopRequireDefault(_Beep);

var _DecayNoise = require("./DecayNoise");

var _DecayNoise2 = _interopRequireDefault(_DecayNoise);

var _DelayTone = require("./DelayTone");

var _DelayTone2 = _interopRequireDefault(_DelayTone);

var _Distorted = require("./Distorted");

var _Distorted2 = _interopRequireDefault(_Distorted);

var _FMBass = require("./FMBass");

var _FMBass2 = _interopRequireDefault(_FMBass);

var _FMPiano = require("./FMPiano");

var _FMPiano2 = _interopRequireDefault(_FMPiano);

var _ImpulseNoise = require("./ImpulseNoise");

var _ImpulseNoise2 = _interopRequireDefault(_ImpulseNoise);

var _Khoomii = require("./Khoomii");

var _Khoomii2 = _interopRequireDefault(_Khoomii);

var _PlasticHarp = require("./PlasticHarp");

var _PlasticHarp2 = _interopRequireDefault(_PlasticHarp);

var _PureVibes = require("./PureVibes");

var _PureVibes2 = _interopRequireDefault(_PureVibes);

var _SAHFilteredNoise = require("./SAHFilteredNoise");

var _SAHFilteredNoise2 = _interopRequireDefault(_SAHFilteredNoise);

var _ShadowString = require("./ShadowString");

var _ShadowString2 = _interopRequireDefault(_ShadowString);

var _SimpleSine = require("./SimpleSine");

var _SimpleSine2 = _interopRequireDefault(_SimpleSine);

var _SineTone = require("./SineTone");

var _SineTone2 = _interopRequireDefault(_SineTone);

var _SquareLead = require("./SquareLead");

var _SquareLead2 = _interopRequireDefault(_SquareLead);

var _SweepPad = require("./SweepPad");

var _SweepPad2 = _interopRequireDefault(_SweepPad);

var _TublarBell = require("./TublarBell");

var _TublarBell2 = _interopRequireDefault(_TublarBell);

var _TwinklePad = require("./TwinklePad");

var _TwinklePad2 = _interopRequireDefault(_TwinklePad);

var _WindMachine = require("./WindMachine");

var _WindMachine2 = _interopRequireDefault(_WindMachine);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var presets = {
  AnalogBass: _AnalogBass2["default"],
  ArpeggioPad: _ArpeggioPad2["default"],
  Beep: _Beep2["default"],
  DecayNoise: _DecayNoise2["default"],
  DelayTone: _DelayTone2["default"],
  Distorted: _Distorted2["default"],
  FMBass: _FMBass2["default"],
  FMPiano: _FMPiano2["default"],
  ImpulseNoise: _ImpulseNoise2["default"],
  Khoomii: _Khoomii2["default"],
  PlasticHarp: _PlasticHarp2["default"],
  PureVibes: _PureVibes2["default"],
  SAHFilteredNoise: _SAHFilteredNoise2["default"],
  ShadowString: _ShadowString2["default"],
  SimpleSine: _SimpleSine2["default"],
  SineTone: _SineTone2["default"],
  SquareLead: _SquareLead2["default"],
  SweepPad: _SweepPad2["default"],
  TublarBell: _TublarBell2["default"],
  TwinklePad: _TwinklePad2["default"],
  WindMachine: _WindMachine2["default"]
};

function getClass(program) {
  if (presets.hasOwnProperty(program)) {
    return presets[program];
  }

  return _utils2["default"].sample([_AnalogBass2["default"], _ArpeggioPad2["default"], _Beep2["default"], _DecayNoise2["default"], _DelayTone2["default"], _Distorted2["default"], _FMBass2["default"], _FMPiano2["default"], _ImpulseNoise2["default"], _PlasticHarp2["default"], _PureVibes2["default"], _SAHFilteredNoise2["default"], _ShadowString2["default"], _SimpleSine2["default"], _SineTone2["default"], _SquareLead2["default"], _SweepPad2["default"], _TublarBell2["default"], _TwinklePad2["default"], _WindMachine2["default"]]);
}

exports["default"] = {
  presets: presets,
  getClass: getClass
};
module.exports = exports["default"];

},{"./AnalogBass":107,"./ArpeggioPad":108,"./Beep":109,"./DecayNoise":110,"./DelayTone":111,"./Distorted":112,"./FMBass":113,"./FMPiano":114,"./ImpulseNoise":115,"./Khoomii":116,"./PlasticHarp":117,"./PureVibes":118,"./SAHFilteredNoise":119,"./ShadowString":120,"./SimpleSine":121,"./SineTone":122,"./SquareLead":123,"./SweepPad":124,"./TublarBell":125,"./TwinklePad":126,"./WindMachine":127,"./utils":129}],129:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _utils = require("../utils");

var _utils2 = _interopRequireDefault(_utils);

exports["default"] = _utils2["default"].xtend(_utils2["default"], {});
module.exports = exports["default"];

},{"../utils":140}],130:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Track2 = require("../Track");

// import utils from "./utils";

var _Track3 = _interopRequireDefault(_Track2);

var Track0 = (function (_Track) {
  _inherits(Track0, _Track);

  function Track0() {
    _classCallCheck(this, Track0);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(Track0.prototype), "constructor", this).apply(this, args);

    this.pipe(this.extend({
      program: "SimpleSine"
    })).pipe(this.output);
  }

  return Track0;
})(_Track3["default"]);

exports["default"] = Track0;
module.exports = exports["default"];

},{"../Track":95}],131:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Track2 = require("../Track");

var _Track3 = _interopRequireDefault(_Track2);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var Track1 = (function (_Track) {
  _inherits(Track1, _Track);

  function Track1() {
    _classCallCheck(this, Track1);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(Track1.prototype), "constructor", this).apply(this, args);

    this.pipe(function (data, next) {
      var program = _utils2["default"].sample(["FMPiano", "PlasticHarp", "PureVibes", "FMPiano", "PlasticHarp", "PureVibes", "FMPiano", "PlasticHarp", "PureVibes", "Beep"]);

      next(_utils2["default"].xtend(data, { program: program }));
    }).pipe(this.output);
  }

  return Track1;
})(_Track3["default"]);

exports["default"] = Track1;
module.exports = exports["default"];

},{"../Track":95,"./utils":139}],132:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Track2 = require("../Track");

var _Track3 = _interopRequireDefault(_Track2);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var Track2 = (function (_Track) {
  _inherits(Track2, _Track);

  function Track2() {
    _classCallCheck(this, Track2);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(Track2.prototype), "constructor", this).apply(this, args);

    this.pipe(function (data, next) {
      var program = _utils2["default"].sample(["Distorted", "SquareLead", "Khoomii"]);

      next(_utils2["default"].xtend(data, { program: program }));
    }).pipe(this.output);
  }

  return Track2;
})(_Track3["default"]);

exports["default"] = Track2;
module.exports = exports["default"];

},{"../Track":95,"./utils":139}],133:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Track2 = require("../Track");

var _Track3 = _interopRequireDefault(_Track2);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var Track3 = (function (_Track) {
  _inherits(Track3, _Track);

  function Track3() {
    var _this = this;

    _classCallCheck(this, Track3);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(Track3.prototype), "constructor", this).apply(this, args);

    var splitter = this.split(function (data) {
      return data.track;
    });

    this.pipe(splitter.channels[1]).pipe(this.extend({
      program: _utils2["default"].sample(["SweepPad"])
    })).pipe(this.output);

    this.pipe(splitter.channels[2]).pipe(this.filter(function (data) {
      return _this.ticksPerBeat <= data.ticks;
    })).pipe(this.stutter(1 / 2)).pipe(this.extend({
      program: "ShadowString"
    })).pipe(this.output);
  }

  return Track3;
})(_Track3["default"]);

exports["default"] = Track3;
module.exports = exports["default"];

},{"../Track":95,"./utils":139}],134:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Track2 = require("../Track");

var _Track3 = _interopRequireDefault(_Track2);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var Track4 = (function (_Track) {
  _inherits(Track4, _Track);

  function Track4() {
    _classCallCheck(this, Track4);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(Track4.prototype), "constructor", this).apply(this, args);

    this.pipe(function (data, next) {
      if (data.track !== 2) {
        return;
      }

      var program = _utils2["default"].sample(["AnalogBass", "FMBass"]);

      next(_utils2["default"].xtend(data, { program: program }));
    }).pipe(this.output);
  }

  return Track4;
})(_Track3["default"]);

exports["default"] = Track4;
module.exports = exports["default"];

},{"../Track":95,"./utils":139}],135:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Track2 = require("../Track");

var _Track3 = _interopRequireDefault(_Track2);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var Track5 = (function (_Track) {
  _inherits(Track5, _Track);

  function Track5() {
    _classCallCheck(this, Track5);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(Track5.prototype), "constructor", this).apply(this, args);

    this.delayNode = this.delay(1 / 8);

    this.pipe(this.delayNode).pipe(this.extend({
      program: "DelayTone"
    })).pipe(this.output);
  }

  _createClass(Track5, [{
    key: "setState",
    value: function setState() {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      _get(Object.getPrototypeOf(Track5.prototype), "setState", this).apply(this, args);

      this.delayNode.feedback = _utils2["default"].linlin(this.params[5], 0, 127, 0, 0.95);
    }
  }]);

  return Track5;
})(_Track3["default"]);

exports["default"] = Track5;
module.exports = exports["default"];

},{"../Track":95,"./utils":139}],136:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Track2 = require("../Track");

var _Track3 = _interopRequireDefault(_Track2);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var Track6 = (function (_Track) {
  _inherits(Track6, _Track);

  function Track6() {
    _classCallCheck(this, Track6);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(Track6.prototype), "constructor", this).apply(this, args);

    this.pipe(function (data, next) {
      if (data.track !== 2) {
        return;
      }

      var program = _utils2["default"].sample(["WindMachine", "DecayNoise", "ImpulseNoise", "SAHFilteredNoise"]);

      next(_utils2["default"].xtend(data, { program: program }));
    }).pipe(this.output);
  }

  return Track6;
})(_Track3["default"]);

exports["default"] = Track6;
module.exports = exports["default"];

},{"../Track":95,"./utils":139}],137:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _Track2 = require("../Track");

var _Track3 = _interopRequireDefault(_Track2);

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var Track7 = (function (_Track) {
  _inherits(Track7, _Track);

  function Track7() {
    _classCallCheck(this, Track7);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get(Object.getPrototypeOf(Track7.prototype), "constructor", this).apply(this, args);

    this.pipe(function (data, next) {
      if (Math.random() < 0.8) {
        return;
      }

      var program = _utils2["default"].sample(["TwinklePad", "ArpeggioPad", "TwinklePad", "ArpeggioPad", "TwinklePad", "ArpeggioPad", "TublarBell"]);

      next(_utils2["default"].xtend(data, { program: program }));
    }).pipe(this.output);
  }

  return Track7;
})(_Track3["default"]);

exports["default"] = Track7;
module.exports = exports["default"];

},{"../Track":95,"./utils":139}],138:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _Track0_Basic = require("./Track0_Basic");

var _Track0_Basic2 = _interopRequireDefault(_Track0_Basic);

var _Track1_Soft = require("./Track1_Soft");

var _Track1_Soft2 = _interopRequireDefault(_Track1_Soft);

var _Track2_Hard = require("./Track2_Hard");

var _Track2_Hard2 = _interopRequireDefault(_Track2_Hard);

var _Track3_Pad = require("./Track3_Pad");

var _Track3_Pad2 = _interopRequireDefault(_Track3_Pad);

var _Track4_Bass = require("./Track4_Bass");

var _Track4_Bass2 = _interopRequireDefault(_Track4_Bass);

var _Track5_Delay = require("./Track5_Delay");

var _Track5_Delay2 = _interopRequireDefault(_Track5_Delay);

var _Track6_Noise = require("./Track6_Noise");

var _Track6_Noise2 = _interopRequireDefault(_Track6_Noise);

var _Track7_Effect = require("./Track7_Effect");

// import IkedaTrack from "./IkedaTrack";

var _Track7_Effect2 = _interopRequireDefault(_Track7_Effect);

exports["default"] = {
  tracks: [_Track0_Basic2["default"], _Track1_Soft2["default"], _Track2_Hard2["default"], _Track3_Pad2["default"], _Track4_Bass2["default"], _Track5_Delay2["default"], _Track6_Noise2["default"], _Track7_Effect2["default"]]
};
module.exports = exports["default"];

},{"./Track0_Basic":130,"./Track1_Soft":131,"./Track2_Hard":132,"./Track3_Pad":133,"./Track4_Bass":134,"./Track5_Delay":135,"./Track6_Noise":136,"./Track7_Effect":137}],139:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _utils = require("../utils");

var _utils2 = _interopRequireDefault(_utils);

exports["default"] = _utils2["default"].xtend(_utils2["default"], {});
module.exports = exports["default"];

},{"../utils":140}],140:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _utils = require("../utils");

var _utils2 = _interopRequireDefault(_utils);

var _utilsWebAudioUtils = require("../utils/WebAudioUtils");

var _utilsWebAudioUtils2 = _interopRequireDefault(_utilsWebAudioUtils);

exports["default"] = _utils2["default"].xtend(_utils2["default"], _utilsWebAudioUtils2["default"]);
module.exports = exports["default"];

},{"../utils":146,"../utils/WebAudioUtils":145}],141:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _RandGen = require("./RandGen");

var _RandGen2 = _interopRequireDefault(_RandGen);

var PerlinNoise = (function () {
  function PerlinNoise(seed) {
    _classCallCheck(this, PerlinNoise);

    var rnd = _RandGen2["default"].createInstance(seed);
    var perm = new Int8Array(257);

    for (var i = 0; i < 256; i++) {
      perm[i] = i & 1 ? 1 : -1;
    }

    for (var i = 0; i < 256; i++) {
      var j = rnd.intGenerator() & 255;

      var _ref = [perm[j], perm[i]];
      perm[i] = _ref[0];
      perm[j] = _ref[1];
    }
    perm[256] = perm[0];

    function noise1d(x) {
      var x0 = x | 0;
      var x1 = x - x0;
      var xi = x0 & 255;
      var fx = (3 - 2 * x1) * x1 * x1;
      var a = x1 * perm[xi];
      var b = (x1 - 1) * perm[xi + 1];

      return a + fx * (b - a);
    }

    function noise(x) {
      var sum = 0;

      sum += (1 + noise1d(x)) * 0.25;
      sum += (1 + noise1d(x * 2)) * 0.125;
      sum += (1 + noise1d(x * 4)) * 0.0625;
      sum += (1 + noise1d(x * 8)) * 0.03125;

      return sum;
    }

    this.noise = noise;
  }

  _createClass(PerlinNoise, null, [{
    key: "createInstance",
    value: function createInstance() {
      var seed = arguments.length <= 0 || arguments[0] === undefined ? Date.now() : arguments[0];

      return new PerlinNoise(seed);
    }
  }]);

  return PerlinNoise;
})();

exports["default"] = PerlinNoise;
module.exports = exports["default"];

},{"./RandGen":142}],142:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var RandGen = (function () {
  function RandGen(i1, i2) {
    _classCallCheck(this, RandGen);

    var z = i1 || 362436069;
    var w = i2 || 521288629;

    function intGenerator() {
      z = 36969 * (z & 65535) + (z >>> 16) & 0xFFFFFFFF;
      w = 18000 * (w & 65535) + (w >>> 16) & 0xFFFFFFFF;

      return ((z & 0xFFFF) << 16 | w & 0xFFFF) & 0xFFFFFFFF;
    }

    function doubleGenerator() {
      var i = intGenerator() / 4294967296;

      return i < 0 ? 1 + i : i;
    }

    this.intGenerator = intGenerator;
    this.doubleGenerator = doubleGenerator;
    this.random = doubleGenerator;
  }

  _createClass(RandGen, null, [{
    key: "createInstance",
    value: function createInstance() {
      var seed = arguments.length <= 0 || arguments[0] === undefined ? Date.now() : arguments[0];

      return new RandGen(seed, (seed << 16) + (seed >> 16));
    }
  }]);

  return RandGen;
})();

exports["default"] = RandGen;
module.exports = exports["default"];

},{}],143:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoEventEmitter = require("@mohayonao/event-emitter");

var _mohayonaoEventEmitter2 = _interopRequireDefault(_mohayonaoEventEmitter);

var _ = require("./");

var _2 = _interopRequireDefault(_);

var Sequencer = (function (_EventEmitter) {
  _inherits(Sequencer, _EventEmitter);

  function Sequencer(timeline) {
    var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, Sequencer);

    _get(Object.getPrototypeOf(Sequencer.prototype), "constructor", this).call(this);

    this.timeline = timeline;
    this.state = "suspended";

    this._events = _2["default"].defaults(opts.events, []);
    this._tempo = _2["default"].defaults(opts.tempo, 120);
    this._ticksPerBeat = _2["default"].defaults(opts.ticksPerBeat, 120);
    this._interval = _2["default"].defaults(opts.interval, 1);
    this._schedId = 0;
    this._index = 0;
    this._ticks = 0;
    this._process = this._process.bind(this);
  }

  _createClass(Sequencer, [{
    key: "start",
    value: function start() {
      if (this.state === "running") {
        return;
      }
      this._schedId = this.timeline.insert(this.timeline.currentTime, this._process);
      this.state = "running";
      this.emit("statechange", this.state);
    }
  }, {
    key: "stop",
    value: function stop() {
      if (this.state === "suspended") {
        return;
      }
      this._index = 0;
      this._ticks = 0;
      this.timeline.remove(this._schedId);
      this.state = "suspended";
      this.emit("statechange", this.state);
    }
  }, {
    key: "reset",
    value: function reset() {
      this._index = 0;
      this._ticks = 0;
    }
  }, {
    key: "_ticksToSeconds",
    value: function _ticksToSeconds(ticks) {
      return ticks / this._ticksPerBeat * (60 / this._tempo);
    }
  }, {
    key: "_process",
    value: function _process(_ref) {
      var _this = this;

      var playbackTime = _ref.playbackTime;

      var ticks = this._tempo / 60 * this._ticksPerBeat * this._interval;
      var t0 = this._ticks;
      var t1 = t0 + ticks;
      var events = [];

      while (this._index < this._events.length) {
        var item = this._events[this._index];

        if (t1 <= item.time) {
          break;
        }

        events.push(item);

        this._index += 1;
      }

      if (events.length) {
        this.emit("play", events.map(function (item) {
          return {
            dataType: "sequence",
            playbackTime: playbackTime + _this._ticksToSeconds(item.time - t0),
            track: item.track,
            noteNumber: item.noteNumber,
            velocity: item.velocity,
            ticks: item.ticks,
            duration: _this._ticksToSeconds(item.ticks)
          };
        }));
      }

      this._ticks = t1;

      if (this._events.length <= this._index) {
        this._index = 0;
        this._ticks = 0;
      }

      this.emit("processed");

      this._schedId = this.timeline.insert(playbackTime + this._interval, this._process);
    }
  }, {
    key: "events",
    get: function get() {
      return this._events;
    },
    set: function set(value) {
      this._events = value;
    }
  }, {
    key: "tempo",
    get: function get() {
      return this._tempo;
    },
    set: function set(value) {
      this._tempo = _2["default"].constrain(value, 10, 1000);
    }
  }, {
    key: "ticksPerBeat",
    get: function get() {
      return this._ticksPerBeat;
    },
    set: function set(value) {
      this._ticksPerBeat = _2["default"].constrain(value, 15, 1920) | 0;
    }
  }]);

  return Sequencer;
})(_mohayonaoEventEmitter2["default"]);

exports["default"] = Sequencer;
module.exports = exports["default"];

},{"./":146,"@mohayonao/event-emitter":2}],144:[function(require,module,exports){
(function (global){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _mohayonaoEventEmitter = require("@mohayonao/event-emitter");

var _mohayonaoEventEmitter2 = _interopRequireDefault(_mohayonaoEventEmitter);

var _ = require("./");

var _2 = _interopRequireDefault(_);

var DefaultContext = Object.defineProperties({}, {
  currentTime: {
    get: function get() {
      return Date.now() / 1000;
    },
    configurable: true,
    enumerable: true
  }
});

var Timeline = (function (_EventEmitter) {
  _inherits(Timeline, _EventEmitter);

  function Timeline() {
    var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Timeline);

    _get(Object.getPrototypeOf(Timeline.prototype), "constructor", this).call(this);

    this.context = _2["default"].defaults(opts.context, DefaultContext);
    this.interval = _2["default"].defaults(opts.interval, 0.025);
    this.aheadTime = _2["default"].defaults(opts.aheadTime, 0.1);
    this.offsetTime = _2["default"].defaults(opts.offsetTime, 0.005);
    this.timerAPI = opts.timerAPI || global;
    this.playbackTime = 0;

    this._timerId = 0;
    this._schedId = 0;
    this._events = [];
  }

  _createClass(Timeline, [{
    key: "start",
    value: function start(callback) {
      var _this = this;

      if (this._timerId === 0) {
        this._timerId = this.timerAPI.setInterval(function () {
          var t0 = _this.context.currentTime;
          var t1 = t0 + _this.aheadTime;

          _this._process(t0, t1);
        }, this.interval * 1000);
      }

      if (callback) {
        this.insert(this.context.currentTime, callback);
      }

      return this;
    }
  }, {
    key: "stop",
    value: function stop(reset) {
      if (this._timerId !== 0) {
        this.timerAPI.clearInterval(this._timerId);
        this._timerId = 0;
      }

      if (reset) {
        this._events.splice(0);
      }

      return this;
    }
  }, {
    key: "insert",
    value: function insert(time, callback, args) {
      this._schedId += 1;

      var event = {
        id: this._schedId,
        time: time,
        callback: callback,
        args: args
      };
      var events = this._events;

      if (events.length === 0 || events[events.length - 1].time <= time) {
        events.push(event);
      } else {
        for (var i = 0, imax = events.length; i < imax; i++) {
          if (time < events[i].time) {
            events.splice(i, 0, event);
            break;
          }
        }
      }

      return event.id;
    }
  }, {
    key: "nextTick",
    value: function nextTick(callback, args) {
      return this.insert(this.playbackTime + this.aheadTime, callback, args);
    }
  }, {
    key: "remove",
    value: function remove(schedId) {
      var events = this._events;

      if (typeof schedId === "number") {
        for (var i = 0, imax = events.length; i < imax; i++) {
          if (schedId === events[i].id) {
            events.splice(i, 1);
            break;
          }
        }
      }

      return schedId;
    }
  }, {
    key: "removeAll",
    value: function removeAll() {
      this._events.splice(0);
    }
  }, {
    key: "_process",
    value: function _process(t0, t1) {
      var events = this._events;

      this.playbackTime = t0;
      this.emit("process");

      while (events.length && events[0].time < t1) {
        var _event = events.shift();

        this.playbackTime = _event.time + this.offsetTime;

        _event.callback({
          playbackTime: this.playbackTime,
          args: _event.args
        });
      }

      this.playbackTime = t0;
      this.emit("processed");
    }
  }, {
    key: "currentTime",
    get: function get() {
      return this.context.currentTime;
    }
  }, {
    key: "events",
    get: function get() {
      return this._events.slice();
    }
  }]);

  return Timeline;
})(_mohayonaoEventEmitter2["default"]);

exports["default"] = Timeline;
module.exports = exports["default"];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./":146,"@mohayonao/event-emitter":2}],145:[function(require,module,exports){
(function (global){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var audioContext = null;

function getAudioContext() {
  if (audioContext === null) {
    audioContext = new global.AudioContext();
  }
  return audioContext;
}

function chore() {
  if (!("ontouchstart" in global)) {
    return;
  }

  /* eslint-disable no-unused-vars */

  var memo = null;

  /* eslint-enable no-unused-vars */

  function choreFunction() {
    var bufSrc = audioContext.createBufferSource();

    bufSrc.start(audioContext.currentTime);
    bufSrc.stop(audioContext.currentTime + 0.001);
    bufSrc.connect(audioContext.destination);
    bufSrc.onended = function () {
      bufSrc.disconnect();
      memo = null;
    };
    memo = bufSrc;

    global.removeEventListener("touchstart", choreFunction);
  }

  global.addEventListener("touchstart", choreFunction);
}

function hex2dec(x) {
  var ch = x.charCodeAt(0);

  if (48 <= ch && ch <= 57) {
    return ch - 48;
  }

  if (65 <= ch && ch <= 70) {
    return ch - 65 + 10;
  }

  if (97 <= ch && ch <= 102) {
    return ch - 97 + 10;
  }

  return 0;
}

function createColoredWave(colors) {
  var coloredArray = colors.split("").map(function (x) {
    return hex2dec(x) / 16;
  });

  var imag = new Float32Array(coloredArray.length);
  var real = new Float32Array(coloredArray.length);

  imag.set(coloredArray);

  return audioContext.createPeriodicWave(real, imag);
}

function createWave(wave) {
  return audioContext.createPeriodicWave(new Float32Array(wave.real), new Float32Array(wave.imag));
}

function createPinkNoise() {
  var duration = arguments.length <= 0 || arguments[0] === undefined ? 4 : arguments[0];
  var rand = arguments.length <= 1 || arguments[1] === undefined ? Math.random : arguments[1];

  var noise = new Float32Array(duration * audioContext.sampleRate);
  var b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;

  for (var i = 0, imax = noise.length; i < imax; i++) {
    var white = rand() * 2 - 1;

    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;

    noise[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    noise[i] *= 0.11;
    b6 = white * 0.115926;
  }

  var buffer = audioContext.createBuffer(1, noise.length, audioContext.sampleRate);

  buffer.getChannelData(0).set(noise);

  return buffer;
}

function createWhiteNoise() {
  var duration = arguments.length <= 0 || arguments[0] === undefined ? 4 : arguments[0];
  var rand = arguments.length <= 1 || arguments[1] === undefined ? Math.random : arguments[1];

  var noise = new Float32Array(duration * audioContext.sampleRate);

  for (var i = 0, imax = noise.length; i < imax; i++) {
    noise[i] = rand() * 2 - 1;
  }

  var buffer = audioContext.createBuffer(1, noise.length, audioContext.sampleRate);

  buffer.getChannelData(0).set(noise);

  return buffer;
}

function loadAudioData(path) {
  return new Promise(function (resolve, reject) {
    global.fetch(path).then(function (res) {
      return res.arrayBuffer();
    }).then(function (audioData) {
      audioContext.decodeAudioData(audioData, resolve, reject);
    });
  });
}

exports["default"] = {
  getAudioContext: getAudioContext,
  chore: chore,
  createColoredWave: createColoredWave,
  createWave: createWave,
  createPinkNoise: createPinkNoise,
  createWhiteNoise: createWhiteNoise,
  loadAudioData: loadAudioData
};
module.exports = exports["default"];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],146:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _xtend = require("xtend");

var _xtend2 = _interopRequireDefault(_xtend);

var _PerlinNoise = require("./PerlinNoise");

var _PerlinNoise2 = _interopRequireDefault(_PerlinNoise);

var _RandGen = require("./RandGen");

var _RandGen2 = _interopRequireDefault(_RandGen);

var _Sequencer = require("./Sequencer");

var _Sequencer2 = _interopRequireDefault(_Sequencer);

var _Timeline = require("./Timeline");

var _Timeline2 = _interopRequireDefault(_Timeline);

function appendIfNotExists(list, value) {
  var index = list.indexOf(value);

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
  var timerId = 0;

  return function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    if (timerId !== 0) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(function () {
      func.apply(undefined, args);
      timerId = 0;
    }, wait);
  };
}

function defaults(value, defaultValue) {
  return typeof value !== "undefined" ? value : defaultValue;
}

function findet(fine) {
  var sign = fine < 0 ? -1 : +1;

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
  var done = false,
      result = undefined;

  return function () {
    if (!done) {
      result = func.apply(undefined, arguments);
      done = true;
    }
    return result;
  };
}

function range(value) {
  var a = [];

  if (typeof value === "string") {
    return rangeFromString(value);
  } else if (typeof value === "number") {
    return rangeFromNumber(value);
  }

  return a;
}

function rangeFromNumber(value) {
  var a = [];
  var first = 0;
  var last = value;
  var step = first < last ? +1 : -1;
  var i = 0;
  var x = first;

  while (x <= last) {
    a[i++] = x;
    x += step;
  }

  return a;
}

var RangeRE = /^\s*(?:([-+]?(?:\d+|\d+\.\d+))\s*,\s*)?([-+]?(?:\d+|\d+\.\d+))(?:\s*\.\.(\.?)\s*([-+]?(?:\d+|\d+\.\d+)))?\s*$/;

function rangeFromString(value) {
  var m = undefined;

  if ((m = RangeRE.exec(value)) === null) {
    return [];
  }

  var a = [];
  var first = undefined,
      last = undefined,
      step = undefined;

  if (typeof m[4] === "undefined") {
    first = 0;
    last = +m[2];
    step = 0 < last ? +1 : -1;
  } else if (typeof m[1] === "undefined") {
    first = +m[2];
    last = +m[4];
    step = first < last ? +1 : -1;
  } else {
    first = +m[1];
    last = +m[4];
    step = +m[2] - first;
  }

  var i = 0;
  var x = first;

  if (m[3] && 0 < step) {
    while (x < last) {
      a[i++] = x;x += step;
    }
  } else if (m[3]) {
    while (x > last) {
      a[i++] = x;x += step;
    }
  } else if (0 < step) {
    while (x <= last) {
      a[i++] = x;x += step;
    }
  } else {
    while (x >= last) {
      a[i++] = x;x += step;
    }
  }

  return a;
}

function removeIfExists(list, value) {
  var index = list.indexOf(value);

  if (index !== -1) {
    list.splice(index, 1);
  }
}

function sample(list) {
  var rand = arguments.length <= 1 || arguments[1] === undefined ? Math.random : arguments[1];

  return list[rand() * list.length | 0];
}

function symbol(str) {
  return typeof Symbol !== "undefined" ? Symbol(str) : str + Date.now();
}

function throttle(func, wait) {
  var prevExecuteTime = 0;

  return function () {
    var currentTime = Date.now();

    if (wait <= currentTime - prevExecuteTime) {
      func.apply(undefined, arguments);
      prevExecuteTime = currentTime;
    }
  };
}

function wrapAt(list, index) {
  index = (index | 0) % list.length;

  if (index < 0) {
    index += list.length;
  }

  return list[index];
}

function wsample(list, weights) {
  var rand = arguments.length <= 2 || arguments[2] === undefined ? Math.random : arguments[2];

  var sum = 0;

  var weightsSum = weights.reduce(function (a, b) {
    return a + b;
  }, 0);

  for (var i = 0, imax = weights.length; i < imax; ++i) {
    sum += weights[i] / weightsSum;
    if (sum >= rand()) {
      return this[i];
    }
  }
  return this[weights.length - 1];
}

exports["default"] = {
  PerlinNoise: _PerlinNoise2["default"],
  RandGen: _RandGen2["default"],
  Sequencer: _Sequencer2["default"],
  Timeline: _Timeline2["default"],

  xtend: _xtend2["default"],

  appendIfNotExists: appendIfNotExists,
  constrain: constrain,
  dbamp: dbamp,
  debounce: debounce,
  defaults: defaults,
  findet: findet,
  linexp: linexp,
  linlin: linlin,
  midicps: midicps,
  once: once,
  range: range,
  removeIfExists: removeIfExists,
  sample: sample,
  symbol: symbol,
  throttle: throttle,
  wrapAt: wrapAt,
  wsample: wsample
};
module.exports = exports["default"];

},{"./PerlinNoise":141,"./RandGen":142,"./Sequencer":143,"./Timeline":144,"xtend":36}]},{},[91])(91)
});