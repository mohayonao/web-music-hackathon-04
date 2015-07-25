import fluxx from "@mohayonao/remote-fluxx";

export default class ServerAction extends fluxx.Action {
  ["/connected"]({ client }) {
    this.doneAction("/connected", { client });
  }

  ["/disconnected"]({ client }) {
    this.doneAction("/disconnected", { client });
  }

  ["/orientationSend"](point) {
    console.log('server, orientationSend: point=' + point.x + ',' + point.y);
    //this.doneAction("/orientation", {
    //    point:point 
    //});
    this.doneAction('/launch-control/knob1', {
        track: 2,
        value: point.x / 2,
    });
    this.doneAction('/launch-control/knob2', {
        track: 2,
        value: point.y / 2,
    });
    
  }
}
