import utils from "./utils";

export default class Visualizer2 {
  constructor(canvas, fps) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.fps = utils.defaults(fps, 20);
    this._timerId = 0;
    this._animations = [];
    this._onprocess = this._onprocess.bind(this);
    this.buf = null;
    this.spec = null;
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
    this.buf  = buf;
    // utils.appendIfNotExists(this._animations, animation);
  }
  add2(spec) {
    this.spec = spec;
    // utils.appendIfNotExists(this._animations, animation);
  }

  remove() {
    this.buf  = null;
    this.spec = null;
    // utils.removeIfExists(this._animations, animation);
  }

  _onprocess() {
    let context = this.context;
    let w = this.canvas.width;
    let h = this.canvas.height;
    // let t1 = Date.now();

    // context.fillStyle = "#FFFFFF";
    // context.fillRect(0, 0, 1, 1);

    context.clearRect(0,0,w,h);
    context.strokeStyle = 'rgb(255, 128, 128)';
    context.beginPath();
    context.moveTo(0       ,0);
    context.lineTo(0       ,h);
    context.moveTo(w * 0.25,0);
    context.lineTo(w * 0.25,h);
    context.moveTo(w * 0.50,0);
    context.lineTo(w * 0.50,h);
    context.moveTo(w * 0.75,0);
    context.lineTo(w * 0.75,h);
    context.moveTo(w       ,0);
    context.lineTo(w       ,h);
    context.stroke();
    if (this.spec !== null) {
      // console.log(this.spec);
      context.strokeStyle = "black";
      context.beginPath();
      context.moveTo(0, -this.spec[0] / 240 * h + 100);
      for (var i = 1; i < this.spec.length; i++) {
        context.lineTo(i / this.spec.length * w, -this.spec[i] / 240 * h + 100);
      }
      context.stroke();
    }
    
    if (this.buf !== null) {
      context.strokeStyle = "black";
      context.beginPath();
      context.moveTo(0, this.buf[0]);
      for (var i=1; i<w; i++) {
        context.lineTo(i, h/2 + (this.buf[i] * h/2));
      }
      context.stroke();
    }
    //   animation(context, t1);
    // });
  }
}
