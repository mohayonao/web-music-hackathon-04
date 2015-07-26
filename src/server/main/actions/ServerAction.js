import fluxx from "@mohayonao/remote-fluxx";
import utils from "../utils";

export default class ServerAction extends fluxx.Action {
  ["/connected"]({ client }) {
    this.doneAction("/connected", { client });
  }

  ["/disconnected"]({ client }) {
    this.doneAction("/disconnected", { client });
  }

  ["/devicemotion/update/orientation"]({ beta, gamma }) {
    // alpha: In degree in the range [0,360]
    // beta : In degree in the range [-180,180]
    // gamma: In degree in the range [-90,90]

    // Because we don't want to have the device upside down
    // We constrain the x value to the range [-90,90]
    beta = utils.constrain(beta, -90, 90);

    // To make computation easier we shift the range of
    // x and y to [0,180]
    beta += 90;
    gamma += 90;

    let knob1value = utils.linlin(beta, 0, 180, 0, 127)|0;
    let knob2value = utils.linlin(gamma, 0, 180, 0, 127)|0;

    this.doneAction("/launch-control/knob1", {
      track: 2, value: knob1value,
    });
    this.doneAction("/launch-control/knob2", {
      track: 2, value: knob2value,
    });
  }
}
