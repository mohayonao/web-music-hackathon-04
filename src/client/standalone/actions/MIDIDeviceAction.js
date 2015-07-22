import fluxx from "@mohayonao/remote-fluxx";
import MIDIKeyboard from "@mohayonao/midi-keyboard/webmidi";
import LaunchControl from "@mohayonao/launch-control/webmidi";

let devices = {};

export default class MIDIDeviceAction extends fluxx.Action {
  ["/midi-device/request"]() {
    MIDIKeyboard.requestDeviceNames().then(({ inputs, outputs }) => {
      this.doneAction("/midi-device/request/inputs", { inputs });
      this.doneAction("/midi-device/request/outputs", { outputs });
    });
  }

  ["/midi-device/select"]({ target, deviceName }) {
    this.doneAction(`/midi-device/select/${target}`, { deviceName });
  }

  ["/midi-device/connect"]({ target, deviceName }) {
    let MIDIDevice = {
      "launch-control": LaunchControl,
      "midi-keyboard": MIDIKeyboard,
    }[target];

    if (!MIDIDevice) {
      return;
    }

    let promise = devices[target] ? devices[target].close() : Promise.resolve();

    promise.then(() => {
      devices[target] = null;

      let device = new MIDIDevice(deviceName);

      device.open().then(() => {
        devices[target] = device;

        this.doneAction(`/midi-device/connect/${target}`, {
          deviceName: device.deviceName,
        });

        device.on("message", (data) => {
          this.router.createAction(`/${target}`, data);
        });
      }).catch((e) => {
        global.console.error(e);
      });
    });
  }
}
