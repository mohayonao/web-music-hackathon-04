import Action from "./Action";

export default class SoundAction extends Action {
  ["/click/sound"]() {
    this.router.executeAction("/click/sound");
  }

  ["/click/sequencer"]() {
    this.router.executeAction("/click/sequencer");
  }
}
