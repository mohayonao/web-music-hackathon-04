import utils from "./utils";

export default class Visualizer {
  constructor(canvas, fps) {
    canvas.width = global.innerWidth;
    canvas.height = global.innerHeight;

    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.canvas.context = this.context;
    this.fps = utils.defaults(fps, 20);

    this._timerId = 0;
    this._animations = [];
    this._onprocess = this._onprocess.bind(this);
  }

  start() {
    if (this._timerId !== 0) {
      return;
    }
    this._timerId = setInterval(this._onprocess, 1000 / this.fps);
  }

  stop() {
    if (this._timerId === 0) {
      return;
    }
    clearInterval(this._timerId);
    this._timerId = 0;
  }

  push(animation) {
    let index = this._animations.indexOf(animation);

    if (index === -1) {
      this._animations.push(animation);
    }
  }

  unshift(animation) {
    let index = this._animations.indexOf(animation);

    if (index === -1) {
      this._animations.unshift(animation);
    }
  }

  remove(animation) {
    utils.removeIfExists(this._animations, animation);
  }

  _onprocess() {
    let canvas = this.canvas;
    let context = this.context;
    let t1 = Date.now();

    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);

    this._animations.forEach((animation) => {
      animation(this.canvas, t1);
    });
  }
}
