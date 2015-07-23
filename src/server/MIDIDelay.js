import xtend from "xtend";
import utils from "./utils";

export default class MIDIDelay {
  constructor(timeline, delayTicks) {
    this.delayTicks = delayTicks;
    this.timeline = timeline;
    this.feedback = 0;
    this.clientIndex = 0;
    this._tempo = 120;
    this._feedback = 0.8;
    this._clients = [];
  }

  setTempo(tempo) {
    this._tempo = tempo;
  }

  setFeedback(feedback) {
    this._feedback = feedback;
  }

  setClients(clients) {
    this._clients = clients;
  }

  push(data) {
    this._process(xtend(data, { velocity: 80, program: 0, clientIndex: this.clientIndex++ }));
  }

  _ticksToSeconds(ticks) {
    return (ticks / 120) * (60 / this._tempo);
  }

  _process(data) {
    let client = utils.wrapAt(this._clients, data.clientIndex++);

    if (!client) {
      return;
    }

    client.$pendings.push(data);

    let delay = this._ticksToSeconds(this.delayTicks);

    this.timeline.insert(data.playbackTime + delay, ({ playbackTime }) => {
      let velocity = (data.velocity * this._feedback)|0;

      if (velocity !== 0) {
        this._process(xtend(data, { playbackTime, velocity }));
      }
    });
  }
}
