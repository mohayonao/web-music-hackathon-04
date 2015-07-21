import fluxx from "@mohayonao/remote-fluxx";

export default class SequencerAction extends fluxx.Action {
  ["/sequencer/start"]() {
    this.doneAction("/sequencer/start");
  }

  ["/sequencer/stop"]() {
    this.doneAction("/sequencer/stop");
  }

  ["/sequencer/change/tempo"]({ tempo, delta }) {
    this.doneAction("/sequencer/change/tempo", { tempo, delta });
  }
}
