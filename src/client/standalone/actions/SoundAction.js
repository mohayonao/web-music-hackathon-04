import fluxx from "@mohayonao/remote-fluxx";

export default class SoundAction extends fluxx.Action {
  ["/sound/load/score"]({ name }) {
    fetch(`/assets/${name}.json`).then((res) => {
      return res.json();
    }).then((data) => {
      this.doneAction("/sound/load/score", { data });
    });
  }

  ["/toggle-button/click/sound"]() {
    this.doneAction("/toggle-button/click/sound");
  }

  ["/toggle-button/click/sequencer"]() {
    this.doneAction("/toggle-button/click/sequencer");
  }
}
