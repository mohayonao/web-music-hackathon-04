import Router from "./Router";
import MainApp from "./components/MainApp";
import Visualizer2 from "./Visualizer2";
import utils from "./utils";

function run() {
  let socket = window.io();
  let router = new Router(socket);
  let button = document.getElementById("button");
  let canvas = document.getElementById("canvas");
  let visualizer = new Visualizer2(canvas);

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
    // let t0 = Date.now();
    // let duration = instance.duration;

    // function animation(context, t1) {
    //   let elapsed = (t1 - t0) * 0.001;
    //   let a = utils.constrain(utils.linlin(elapsed, 0, duration, 1, 0), 0, 1);

    //   if (a === 0) {
    //     visualizer.remove(animation);
    //   } else {
    //     context.fillStyle = `rgba(200, 239, 234, ${a})`;
    //     context.fillRect(0, 0, 1, 1);
    //   }
    // }

    // visualizer.add(animation);

    // instance.on("ended", () => {
    //   visualizer.remove(animation);
    // });
  });
  
  router.on("soundtest", (buf) => {
    // visualizer.add(hoge);
    visualizer.add(buf);
  });

  router.on("soundtest2", (spec) => {
    // visualizer.add(hoge);
    visualizer.add2(spec);
  });

  React.render(
    React.createElement(MainApp, { router }),
    document.getElementById("app")
  );

  visualizer.start();

  return router;
}

export default { run };
