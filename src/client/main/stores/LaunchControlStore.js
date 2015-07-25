import fluxx from "@mohayonao/remote-fluxx";
import config from "../config";

export default class LaunchControlStore extends fluxx.Store {
  getInitialState() {
    return {
      params: new Uint8Array(config.DEFAULT_PARAMS),
    };
  }

  ["/launch-control/params/update"]({ params }) {
    this.data.params = params;
    console.log(params);
    this.emitChange();
  }
}
