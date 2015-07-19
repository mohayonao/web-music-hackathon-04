import Beep from "./Beep";
import DelayTone from "./DelayTone";
import Distorted from "./Distorted";
import FMPiano from "./FMPiano";
import PlasticHarp from "./PlasticHarp";
import PureVibes from "./PureVibes";
import SineTone from "./SineTone";
import SquareLead from "./SquareLead";
import SweepPad from "./SweepPad";
import TublarBell from "./TublarBell";
import TwinklePad from "./TwinklePad";
import WindMachine from "./WindMachine";

import utils from "../utils";

export default {
  Beep,
  DelayTone,
  Distorted,
  FMPiano,
  PlasticHarp,
  PureVibes,
  SineTone,
  SquareLead,
  SweepPad,
  TublarBell,
  TwinklePad,
  WindMachine,
  getClass() {
    return utils.sample([
      Beep,
      DelayTone,
      Distorted,
      FMPiano,
      PlasticHarp,
      PureVibes,
      SineTone,
      SquareLead,
      SweepPad,
      TublarBell,
      TwinklePad,
      WindMachine,
    ]);
  },
};
