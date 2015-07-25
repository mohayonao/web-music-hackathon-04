import utils from "./utils";

export default class Visualizer2 {
  constructor(canvas, fps) {
    canvas.width = 512;
    canvas.height = 256;

    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.fps = utils.defaults(fps, 20);
    this._timerId = 0;
    this._animations = [];
    this._onprocess = this._onprocess.bind(this);
    this.buf = null;
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

  add(buf) {
    this.buf = buf;
    // utils.appendIfNotExists(this._animations, animation);
  }

  remove() {
    this.buf = null;
    // utils.removeIfExists(this._animations, animation);
  }

  _onprocess() {
    let context = this.context;
    // let t1 = Date.now();

    // context.fillStyle = "#FFFFFF";
    // context.fillRect(0, 0, 1, 1);

    context.clearRect(0,0,512,256);
    context.strokeStyle = "red";
    context.beginPath();
    context.moveTo(0,0);
    context.lineTo(0,256);
    context.moveTo(128,0);
    context.lineTo(128,256);
    context.moveTo(256,0);
    context.lineTo(256,256);
    context.moveTo(384,0);
    context.lineTo(384,256);
    context.moveTo(512,0);
    context.lineTo(512,256);
    context.stroke();
    if (this.buf !== null){
      context.strokeStyle = "black";
      context.beginPath();
      context.moveTo(0, this.buf[0]);
      for (var i=1;i<512;i++) {
          context.lineTo(i,128+(this.buf[i]*128));
      }
      context.stroke();
    }


    // this._animations.forEach((animation) => {
    //   animation(context, t1);
    // });
  }
}
