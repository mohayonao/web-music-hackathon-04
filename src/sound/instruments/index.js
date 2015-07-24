import AnalogBass from "./AnalogBass";
import Beep from "./Beep";
import DelayTone from "./DelayTone";
import Distorted from "./Distorted";
import FMPiano from "./FMPiano";
import FMBass from "./FMBass";
import PlasticHarp from "./PlasticHarp";
import PureVibes from "./PureVibes";
import ShadowString from "./ShadowString";
import SimpleSine from "./SimpleSine";
import SineTone from "./SineTone";
import SquareLead from "./SquareLead";
import SweepPad from "./SweepPad";
import TublarBell from "./TublarBell";
import TwinklePad from "./TwinklePad";
import WindMachine from "./WindMachine";
import utils from "../utils";

let presets = {
  AnalogBass,
  Beep,
  DelayTone,
  Distorted,
  FMPiano,
  FMBass,
  PlasticHarp,
  PureVibes,
  ShadowString,
  SimpleSine,
  SineTone,
  SquareLead,
  SweepPad,
  TublarBell,
  TwinklePad,
  WindMachine,
};

function getClass(program) {
  if (presets.hasOwnProperty(program)) {
    return presets[program];
  }

  return utils.sample([
    AnalogBass,
    Beep,
    DelayTone,
    Distorted,
    FMPiano,
    FMBass,
    PlasticHarp,
    PureVibes,
    ShadowString,
    SimpleSine,
    SineTone,
    SquareLead,
    SweepPad,
    TublarBell,
    TwinklePad,
    WindMachine,
  ]);
}

export default {
  presets,
  getClass,
};
