var dgram = require("dgram");
var MIDIDevice = require("@mohayonao/midi-device");
var oscMessage = require("osc-msg");
var config = require("./config");

function hex(value) {
  return "0x" + ("00" + value.toString(16)).slice(-2);
}

function showDeviceList() {
  console.log("please set DEVICE_NAME to config.json");
  midiDevice.requestDeviceNames().then(function(list) {
    list.inputs.forEach(function(deviceName, index) {
      console.log("[%d] %s", index, deviceName);
    });
  });
}

function main(receivePort, deviceName) {
  var midiDevice = new MIDIDevice(deviceName);

  midiDevice.open().then(function() {
    var oscSocket = dgram.createSocket("udp4");

    oscSocket.on("message", function(buffer) {
      var msg = oscMessage.fromBuffer(buffer);

      if (msg.error || msg.address !== "/midi") {
        return;
      }

      var st = msg.args[0].value;
      var d1 = msg.args[1].value;
      var d2 = msg.args[2].value;

      console.log("> %s %s %s", hex(st), hex(d1), hex(d2));

      midiDevice.send([ st, d1, d2 ]);
    });

    oscSocket.bind(receivePort, function() {
      console.log("Listening on port %d", oscSocket.address().port);
    });
  }).then(function() {
    console.log("%s opened", midiDevice.deviceName);
  }).catch(function(e) {
    console.error(e.toString());
  });
}

if (config.DEVICE_NAME) {
  main(config.PORT, config.DEVICE_NAME);
} else {
  showDeviceList();
}
