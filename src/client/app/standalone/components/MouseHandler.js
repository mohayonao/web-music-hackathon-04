let LOCKED = true;

export default class MouseHandler {
  static getInstance() {
    if (!MouseHandler.instance) {
      LOCKED = false;
      MouseHandler.instance = new MouseHandler();
      LOCKED = false;
    }
    return MouseHandler.instance;
  }

  static set(target) {
    MouseHandler.getInstance().set(target);
  }

  constructor() {
    if (LOCKED) {
      throw new TypeError("Illegal constructor");
    }

    this._x = 0;
    this._y = 0;
    this._target = null;

    document.body.addEventListener("mousemove", (e) => {
      this.$onMouseMove({ x: e.clientX, y: e.clientY });
    });

    document.body.addEventListener("mouseup", (e) => {
      this.$onMouseUp({ x: e.clientX, y: e.clientY });
    });
  }

  set(target) {
    this._target = target;
  }

  $onMouseMove(data) {
    let dx = data.x - this._x;
    let dy = data.y - this._y;
    let x = this._x = data.x;
    let y = this._y = data.y;

    if (this._target && typeof this._target.$onMouseMove === "function") {
      this._target.$onMouseMove({ x, y, dx: dx, dy: dy });
    }
  }

  $onMouseUp(data) {
    let x = this._x = data.x;
    let y = this._y = data.y;

    if (this._target && typeof this._target.$onMouseUp === "function") {
      this._target.$onMouseUp({ x, y, dx: 0, dy: 0 });
    }
    this._target = null;
  }
}
