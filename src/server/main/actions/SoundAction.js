import fs from "fs";
import path from "path";
import fluxx from "@mohayonao/remote-fluxx";

export default class SoundAction extends fluxx.Action {
  ["/sound/load/score"]({ name }) {
    let filepath = path.join(__dirname, "../../../../public/assets", `${name}.json`);

    fs.readFile(filepath, "utf-8", (err, text) => {
      if (err) {
        return;
      }
      let data = JSON.parse(text);

      this.doneAction("/sound/load/score", data);
    });
  }
}
