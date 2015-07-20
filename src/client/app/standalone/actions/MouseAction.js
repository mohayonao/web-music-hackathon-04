import EventEmitter from "@mohayonao/event-emitter";
import Action from "./Action";

class MouseListener extends EventEmitter {
  static getInstance() {
    if (!MouseListener.instance) {
      MouseListener.instance = new MouseListener();
    }
    return MouseListener.instance;
  }

  constructor() {
    super();

    document.body.addEventListener("mousemove", (e) => {
      this.emit("mousemove", { x: e.clientX, y: e.clientY });
    });

    document.body.addEventListener("mouseup", (e) => {
      this.emit("mouseup", { x: e.clientX, y: e.clientY });
    });
  }
}

export default class MouseAction extends Action {
  constructor(...args) {
    super(...args);

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._x = 0;
    this._y = 0;
    this._target = null;

    let mouseListener = MouseListener.getInstance();

    mouseListener.on("mousemove", this._onMouseMove);
    mouseListener.on("mouseup", this._onMouseUp);
  }

  _onMouseMove(data) {
    let dx = data.x - this._x;
    let dy = data.y - this._y;
    let x = this._x = data.x;
    let y = this._y = data.y;

    if (this._target && typeof this._target._onMouseMove === "function") {
      this._target._onMouseMove({ x, y, dx: dx, dy: dy });
    }
  }

  _onMouseUp(data) {
    let x = this._x = data.x;
    let y = this._y = data.y;

    if (this._target && typeof this._target._onMouseUp === "function") {
      this._target._onMouseUp({ x, y, dx: 0, dy: 0 });
    }
    this._target = null;
  }

  ["/mouse/down"]({ target }) {
    this._target = target;
  }
}
