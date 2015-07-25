import Instrument, { INITIALIZE, CREATE, NOTE_ON, NOTE_OFF, DISPOSE } from "../Instrument";
import Envelope from "@mohayonao/envelope";
import Operator from "@mohayonao/operator";
import FMSynth from "@mohayonao/fm-synth";
import utils from "./utils";

const RELEASE_TIME = 0.050;
const GAIN_UP = 0.5;

export default class SquareLead extends Instrument {
  [INITIALIZE]() {}

  [CREATE]() {
    let frequency = utils.midicps(this.noteNumber);
    let opA = new Operator(this.audioContext);
    let opB = new Operator(this.audioContext);
    let opC = new Operator(this.audioContext);
    let opD = new Operator(this.audioContext);
    this.frequency = frequency;

    opA.type = "square";
    opA.frequency.value = frequency;
    opA.detune.value = utils.findet(-6);
    opA.setEnvelope(Envelope.ads(0.060, 0.600, 1, utils.dbamp(0)));

    opB.type = "square";
    opB.frequency.value = frequency;
    opB.detune.value = utils.findet(+6);
    opB.setEnvelope(Envelope.ads(0.112, 0.600, 1, utils.dbamp(0)));

    opC.type = "square";
    opC.frequency.value = frequency;
    opC.detune.value = utils.findet(-10);
    opC.setEnvelope(Envelope.ads(0.004, 0.600, 1, utils.dbamp(0)));

    opD.type = "square";
    opD.frequency.value = frequency;
    opD.detune.value = utils.findet(+10);
    opD.setEnvelope(Envelope.ads(0.006, 0.600, 1, utils.dbamp(0)));

    this.synth = new FMSynth(10, [ opA, opB, opC, opD ]);
    this.synth.onended = () => {
      this.emit("ended");
    };

    this.filter = this.audioContext.createBiquadFilter();

    this.releaseNode = this.audioContext.createGain();

    this.synth.connect(this.filter);
    this.filter.connect(this.releaseNode);

    this.outlet = this.releaseNode;

      this.updateFilter();
  }

  updateFilter() {
      //var x = this.params[2] / 127 + 1;
      //var y = this.params[10] / 127 + 1;

      var x = this.params[2];
      var y = this.params[10];

      this.filter.frequency.value = this.frequency * utils.linexp(x, 0, 180, 0.5, 12);
      //this.filter.frequency.value = this.frequency * (x / 90 + 1);
      this.filter.Q.value = utils.linexp(y, 0, 180, 2, 40);
      //this.filter.Q.value = (y / 180) * 30; // 0 - 30
      //this.filter.frequency.value = this.frequency * 2;
      //this.filter.Q.value = ; // 0 - 30

    //console.log('SquareLead: frequency=' + this.filter.frequency.value
    //            + ', Q=' + this.filter.Q.value);
  }

  ["/param:2"]() {
      console.log('SquareLead: param[2]=' + this.params[2]);
      this.updateFilter();
  }

  ["/param:10"]() {
      console.log('SquareLead: param[10]=' + this.params[10]);
      this.updateFilter();
  }

  [NOTE_ON](t0) {
    this.synth.start(t0);
    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t0);
  }

  [NOTE_OFF](t1) {
    let t2 = t1 + RELEASE_TIME;

    this.synth.stop(t2);
    this.releaseNode.gain.setValueAtTime(this.volume * GAIN_UP, t1);
    this.releaseNode.gain.exponentialRampToValueAtTime(1e-3, t2);
  }

  [DISPOSE]() {
    this.synth.disconnect();
    this.synth = this.releaseNode = null;
  }
}
