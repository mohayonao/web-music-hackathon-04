import { Delegator } from "@mohayonao/dispatcher";

export default class Action extends Delegator {
  constructor(router) {
    super();

    this.router = router;
  }

  executeAction(address, data) {
    this.router.executeAction(address, data);
  }
}
