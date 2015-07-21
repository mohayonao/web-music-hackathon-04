import { Delegator } from "@mohayonao/dispatcher";

export default class Store extends Delegator {
  constructor(router) {
    super();

    this.router = router;
    this.data = this.getInitialState();
  }

  get name() {
    return this.constructor.name;
  }

  getInitialState() {
    return {};
  }

  get() {
    return this.data;
  }

  emitChange() {
    this.router.emitChange();
  }
}
