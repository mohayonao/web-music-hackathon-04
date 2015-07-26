import Router from "./Router";
import MainApp from "./components/MainApp";
import Visualizer from "./Visualizer";
import utils from "./utils";

function run() {
  let socket = window.io();
  let router = new Router(socket);
  let button = document.getElementById("button");
  let canvas = document.getElementById("canvas");
  let visualizer = new Visualizer(canvas);

  switch (utils.getPerformanceLevel()) {
    case 2:
      visualizer.fps = 20;
      break;
    case 1:
      visualizer.fps = 10;
      break;
    default:
      visualizer.fps = 5;
      break;
  }

  if (global.location.hash === "#ctrl" && "ondeviceorientation" in global) {
    router.createAction("/event/deviceorientation", { enabled: true });
  }

  router.syncTime();
  utils.chore();

  router.on("statechange", (state) => {
    if (state === "running") {
      button.innerText = "SOUND ON";
      button.style.fontWeight = "bold";
      button.style.color = "#FFFFFF";
      button.style.backgroundColor = "#009F8C";
    } else {
      button.innerText = "SOUND OFF";
      button.style.fontWeight = "normal";
      button.style.color = "#333333";
      button.style.backgroundColor = "#FFFFFF";
    }
  });

  router.on("noteOn", (instance) => {
    let t0 = Date.now();
    let duration = instance.duration;

    function animation(canvas, t1) {
      let elapsed = (t1 - t0) * 0.001;
      let a = utils.constrain(utils.linlin(elapsed, 0, duration, 1, 0), 0, 0.5);

      if (a === 0) {
        visualizer.remove(animation);
      } else {
        canvas.context.fillStyle = `rgba(200, 239, 234, ${a})`;
        canvas.context.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    visualizer.unshift(animation);

    instance.on("ended", () => {
      visualizer.remove(animation);
    });
  });

  visualizer.push((canvas) => {
    let { width, height, context } = canvas;

    // grid
    context.beginPath();
    context.strokeStyle = "#009F8C";

    [ 0.25, 0.50, 0.75 ].forEach((rate) => {
      context.moveTo(rate * width, 0);
      context.lineTo(rate * width, height);
    });

    context.stroke();

    // spectrum
    let frequencyData = router.soundManager.getFloatFrequencyData();

    context.strokeStyle = "#DF81A2";
    context.beginPath();
    context.moveTo(0, frequencyData[0] / 240 * height + 100);

    for (let i = 1, imax = frequencyData.length; i < imax; i++) {
      context.lineTo(i / imax * width, -frequencyData[i] / 240 * height + 100);
    }

    context.stroke();

    // wave
    let timeDomainData = router.soundManager.getFloatTimeDomainData();

    context.strokeStyle = "#DF81A2";
    context.beginPath();
    context.moveTo(0, utils.linlin(timeDomainData[0], -1, 1, height, 0));

    for (let i = 1, imax = timeDomainData.length; i < imax; i++) {
      let x = i / imax * width;
      let y = utils.linlin(timeDomainData[i], -1, 1, height, 0);

      context.lineTo(x, y);
    }

    context.stroke();
  });

  React.render(
    React.createElement(MainApp, { router }),
    document.getElementById("app")
  );

  visualizer.start();

  return router;
}

export default { run };
