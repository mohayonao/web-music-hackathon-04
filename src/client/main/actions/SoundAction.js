import fluxx from "@mohayonao/remote-fluxx";
import utils from "../utils";

export default class SoundAction extends fluxx.Action {
  constructor(...args) {
      super(...args);
      let exec = false;
      var self = this;
      window.addEventListener('deviceorientation', function(event) {
          if (!exec) {
              setTimeout(function() {
                  exec = false;
              }, 200);

              // proc
              var x = event.beta;  // In degree in the range [-180,180]
              var y = event.gamma; // In degree in the range [-90,90]

              // Because we don't want to have the device upside down
              // We constrain the x value to the range [-90,90]
              if (x >  90) { x =  90};
              if (x < -90) { x = -90};

              // To make computation easier we shift the range of
              // x and y to [0,180]
              x += 90;
              y += 90;

              // send
              self.doneAction("/orientation", {
                  point: {
                      x: x,
                      y: y
                  }
              });
              exec = true;
          }
      }, false);
  }

    ["/toggle-button/click/sound"]() {
    this.doneAction("/toggle-button/click/sound");
  }

  ["/toggle-button/click/mybtn"]() {
    this.doneAction("/toggle-button/click/mybtn");
  }

  ["/orientationReturn"]({ point }) {
      var orientationEl = document.getElementById('orientation');
      orientationEl.innerHTML = 'x:' + point.x + ', y:' + point.y;
      //window.point = point;
  }

}
