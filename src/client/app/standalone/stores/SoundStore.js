import Store from "./Store";

export default class SoundStore extends Store {
  getInitialState() {
    return {
      soundState: false,
      sequencerState: false,
    };
  }

  ["/sound/statechange"]({ soundState, sequencerState }) {
    this.data.soundState = soundState;
    this.data.sequencerState = sequencerState;
    this.emitChange();
  }
}
