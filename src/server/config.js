import xtend from "xtend";
import config from "../config";

export default xtend(config, {
  SERVER_PORT: 3000,
  OSC_SEND_HOST: "127.0.0.1",
  OSC_SEND_PORT: 7401,
  OSC_RECV_PORT: 7400,
  REMOTE_KEYBOARD_HOST: "127.0.0.1",
  REMOTE_KEYBOARD_PORT: 7401,
  MIDI_KEYBOARD_NAME: "Keystation Mini 32",
  MIDI_CONTROLLER_NAME: "Launch Control",
  SEQUENCER_INTERVAL: 1,
  TICKS_PER_BEAT: 120,
  DELAY_TICKS: 90,
});
