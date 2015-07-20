import EventEmitter from "@mohayonao/event-emitter";
import utils from "./";

const DefaultContext = {
  get currentTime() {
    return Date.now() / 1000;
  },
};

export default class Timeline extends EventEmitter {
  constructor(opts = {}) {
    super();

    this.context = utils.defaults(opts.context, DefaultContext);
    this.interval = utils.defaults(opts.interval, 0.025);
    this.aheadTime = utils.defaults(opts.aheadTime, 0.1);
    this.offsetTime = utils.defaults(opts.offsetTime, 0.005);
    this.timerAPI = opts.timerAPI || global;
    this.playbackTime = 0;

    this._timerId = 0;
    this._schedId = 0;
    this._events = [];
  }

  get currentTime() {
    return this.context.currentTime;
  }

  get events() {
    return this._events.slice();
  }

  start(callback) {
    if (this._timerId === 0) {
      this._timerId = this.timerAPI.setInterval(()=> {
        let t0 = this.context.currentTime;
        let t1 = t0 + this.aheadTime;

        this._process(t0, t1);
      }, this.interval * 1000);
    }

    if (callback) {
      this.insert(this.context.currentTime, callback);
    }

    return this;
  }

  stop(reset) {
    if (this._timerId !== 0) {
      this.timerAPI.clearInterval(this._timerId);
      this._timerId = 0;
    }

    if (reset) {
      this._events.splice(0);
    }

    return this;
  }

  insert(time, callback, args) {
    this._schedId += 1;

    let event = {
      id: this._schedId,
      time: time,
      callback: callback,
      args: args,
    };
    let events = this._events;

    if (events.length === 0 || events[events.length - 1].time <= time) {
      events.push(event);
    } else {
      for (let i = 0, imax = events.length; i < imax; i++) {
        if (time < events[i].time) {
          events.splice(i, 0, event);
          break;
        }
      }
    }

    return event.id;
  }

  nextTick(callback, args) {
    return this.insert(this.playbackTime + this.aheadTime, callback, args);
  }

  remove(schedId) {
    let events = this._events;

    if (typeof schedId === "number") {
      for (let i = 0, imax = events.length; i < imax; i++) {
        if (schedId === events[i].id) {
          events.splice(i, 1);
          break;
        }
      }
    }

    return schedId;
  }

  removeAll() {
    this._events.splice(0);
  }

  _process(t0, t1) {
    let events = this._events;

    this.playbackTime = t0;
    this.emit("process");

    while (events.length && events[0].time < t1) {
      let event = events.shift();

      this.playbackTime = event.time + this.offsetTime;

      event.callback({
        playbackTime: this.playbackTime,
        args: event.args,
      });
    }

    this.playbackTime = t0;
    this.emit("processed");
  }
}
