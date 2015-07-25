import AnalogBass from "./AnalogBass";
import Beep from "./Beep";
import DecayNoise from "./DecayNoise";
import DelayTone from "./DelayTone";
import Distorted from "./Distorted";
import FMBass from "./FMBass";
import FMPiano from "./FMPiano";
import ImpulseNoise from "./ImpulseNoise";
import Khoomii from "./Khoomii";
import PlasticHarp from "./PlasticHarp";
import PureVibes from "./PureVibes";
import SAHFilteredNoise from "./SAHFilteredNoise";
import ShadowString from "./ShadowString";
import SimpleSine from "./SimpleSine";
import SineTone from "./SineTone";
import SquareLead from "./SquareLead";
import SweepPad from "./SweepPad";
import TublarBell from "./TublarBell";
import TwinklePad from "./TwinklePad";
import WindMachine from "./WindMachine";
import utils from "./utils";

let presets = {
  AnalogBass,
  Beep,
  DecayNoise,
  DelayTone,
  Distorted,
  FMBass,
  FMPiano,
  ImpulseNoise,
  Khoomii,
  PlasticHarp,
  PureVibes,
  SAHFilteredNoise,
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
    DecayNoise,
    DelayTone,
    Distorted,
    FMBass,
    FMPiano,
    ImpulseNoise,
    PlasticHarp,
    PureVibes,
    SAHFilteredNoise,
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
