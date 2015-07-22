import fluxx from "@mohayonao/remote-fluxx";
import WorkerTimer from "worker-timer";
import Timeline from "../../utils/Timeline";
import WebAudioUtils from "../../utils/WebAudioUtils";
import actions from "./actions";
import stores from "./stores";

export default class Router extends fluxx.Router {
  constructor() {
    super();

    this.audioContext = WebAudioUtils.getContext();
    this.timeline = new Timeline({
      context: this.audioContext,
      timerAPI: WorkerTimer,
    });

    this.actions = Object.keys(actions).map(className => new actions[className](this));
    this.stores = Object.keys(stores).map(className => new stores[className](this));
  }
}
