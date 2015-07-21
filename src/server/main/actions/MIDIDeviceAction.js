import fluxx from "@mohayonao/remote-fluxx";

export default class MIDIDeviceAction extends fluxx.Action {
  ["/midi-device/connect/midi-kayboard"](data) {
    this.doneAction("/midi-device/connect/midi-kayboard", data);
  }

  ["/midi-device/connect/launch-control"](data) {
    this.doneAction("/midi-device/connect/launch-control", data);
  }
}
