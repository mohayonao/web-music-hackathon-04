import EventEmitter from "@mohayonao/event-emitter";
import actions from "./actions";
import stores from "./stores";

let CHANGE_EVENT = "change";

export default class Router extends EventEmitter {
  constructor() {
    super();

    this.actions = Object.keys(actions).map(className => new actions[className](this));
    this.stores = Object.keys(stores).map(className => new stores[className](this));
    this.createAction("/midi-device/request");
    this._emitLock = false;
  }

  getStateFromStores() {
    let state = {};

    this.stores.forEach((store) => {
      let name = store.name.replace(/Store$/, "");

      name = name.charAt(0).toLowerCase() + name.substr(1);

      state[name] = store.getState();
    });

    return state;
  }

  createAction(address, data = {}) {
    this.actions.forEach((action) => {
      if (typeof action.delegate === "function") {
        action.delegate(address, data);
      }
    });
  }

  executeAction(address, data = {}) {
    this.stores.forEach((store) => {
      if (typeof store.delegate === "function") {
        store.delegate(address, data);
      }
    });
  }

  emitChange() {
    if (this._emitLock) {
      return;
    }
    this._emitLock = true;
    setTimeout(() => {
      this._emitLock = false;
      this.emit(CHANGE_EVENT);
    }, 0);
  }

  addChangeListener(listener) {
    this.on(CHANGE_EVENT, listener);
  }

  removeChangeListener(listener) {
    this.removeListener(CHANGE_EVENT, listener);
  }
}
