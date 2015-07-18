import xtend from "xtend";
import config from "../config";

export default xtend(config, {
  SERVER_PORT: 3000,
  OSC_SEND_HOST: "127.0.0.1",
  OSC_SEND_PORT: 7401,
  OSC_RECV_PORT: 7400,
  MIDI_KEYBOARD_NAME: "Keystation Mini 32",
  MIDI_CONTROLLER_NAME: "Launch Control",
});
