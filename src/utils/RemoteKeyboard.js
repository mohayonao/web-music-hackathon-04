import { Delegator } from "@mohayonao/dispatcher";
import OscMessage from "osc-msg";
import dgram from "dgram";

export default class RemoteKeyboard extends Delegator {
  constructor(port, host = "127.0.0.1") {
    super();

    this.socket = dgram.createSocket("udp4");
    this.port = port;
    this.host = host;
  }

  ["/midi-keyboard/noteOn"]({ noteNumber, velocity }) {
    this.send(0x90, noteNumber, velocity);
  }

  ["/midi-keyboard/noteOff"]({ noteNumber }) {
    this.send(0x80, noteNumber, 0x00);
  }

  ["/midi-keyboard/modulation"]({ value }) {
    this.send(0xb0, 0x01, value);
  }

  ["/midi-keyboard/pitchbend"]({ value }) {
    let unsignedValue = value + 8192;
    let d1 = unsignedValue % 128;
    let d2 = Math.floor(unsignedValue / 128);

    this.send(0xe0, d1, d2);
  }

  send(st, d1, d2) {
    let buffer = OscMessage.toBuffer({
      address: "/midi",
      args: [
        { type: "integer", value: st & 0xff },
        { type: "integer", value: d1 & 0x7f },
        { type: "integer", value: d2 & 0x7f },
      ],
    });

    this.socket.send(buffer, 0, buffer.length, this.port, this.host);
  }
}
