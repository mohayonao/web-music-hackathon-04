import fluxx from "@mohayonao/remote-fluxx";

export default class SoundAction extends fluxx.Action {
  ["/toggle-button/click/sound"]() {
    this.doneAction("/toggle-button/click/sound");
  }

  ["/sound/play"](data) {
    this.doneAction("/sound/play", data);
  }
}
