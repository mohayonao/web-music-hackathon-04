import subote from "subote";
import WorkerTimer from "worker-timer";
import SoundManager from "./SoundManager";
import SyncDate from "./SyncDate";
import Timeline from "../utils/Timeline";
import WebAudioUtils from "./WebAudioUtils";

export default class Router extends subote.Client {
  constructor(...args) {
    super(...args);

    let audioContext = WebAudioUtils.getContext();
    let timeline = new Timeline({ context: audioContext, timerAPI: WorkerTimer });

    this.timeline = timeline;
    this.sound = new SoundManager({ audioContext, timeline });

    this._enabled = false;
    this._syncTimes = [];
  }

  syncTime() {
    let beginTime = Date.now();

    this.socket.emit("ping");
    this.socket.once("pong", (serverCurrentTime) => {
      let endTime = Date.now();
      let elapsed = endTime - beginTime;
      let currentTime = endTime - (elapsed * 0.5);
      let deltaTime = serverCurrentTime - currentTime;

      this._syncTimes.push(deltaTime);

      if (this._syncTimes.length < 5) {
        return setTimeout(() => this.syncTime(), 100);
      }

      this._syncTimes.shift();

      let averageDeltaTime = this._syncTimes.reduce((a, b) => a + b, 0) / this._syncTimes.length;

      SyncDate.setDeltaTime(Math.round(averageDeltaTime));

      this._syncTimes = [];

      setTimeout(() => this.syncTime(), 1000 * 30);
    });
  }

  click(e) {
    this._enabled = !this._enabled;

    if (this._enabled) {
      this.sound.chore().start();
      this.timeline.start();
      e.target.innerText = "SOUND ON";
    } else {
      this.sound.stop();
      this.timeline.stop(true);
      e.target.innerText = "SOUND OFF";
    }

    this.socket.emit("enabled", this._enabled);
  }

  ["/params"](buffer) {
    this.sound.changeParams(new Uint8Array(buffer));
  }

  ["/play"](data) {
    if (this.sound.state === "running") {
      let now = SyncDate.now() * 0.001;

      data.sort((a, b) => a.playbackTime - b.playbackTime).forEach((data) => {
        let deltaTime = data.playbackTime - now;

        data.playbackTime = this.sound.currentTime + deltaTime;

        this.sound.play(data);
      });
    }
  }
}
