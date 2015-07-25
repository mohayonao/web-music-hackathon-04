import utils from "./utils";

export default class Visualizer {
  constructor(canvas, fps) {
    canvas.width = 1;
    canvas.height = 1;

    this.canvas = canvas;
    this.context = canvas.getContext("2d");
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

  add(animation) {
    utils.appendIfNotExists(this._animations, animation);
  }

  remove(animation) {
    utils.removeIfExists(this._animations, animation);
  }

  _onprocess() {
    let context = this.context;
    let t1 = Date.now();

    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, 1, 1);

    this._animations.forEach((animation) => {
      animation(context, t1);
    });
  }
}
