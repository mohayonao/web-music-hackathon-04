import Action from "./Action";

export default class SoundAction extends Action {
  ["/click/sound"]() {
    this.executeAction("/click/sound");
  }

  ["/click/sequencer"]() {
    this.executeAction("/click/sequencer");
  }
}
